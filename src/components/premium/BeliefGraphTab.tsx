import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrainCircuit, Clock3, GitBranch, Loader2, RefreshCw } from 'lucide-react';
import {
    fetchBeliefGraph,
    fetchBeliefHistory,
    type BeliefCorrectness,
    type BeliefEdge,
    type BeliefHistoryEntry,
    type BeliefNode,
} from '../../lib/beliefGraphService';

interface BeliefGraphTabProps {
    userId: string;
    courseId?: string;
}

interface LayoutNode extends BeliefNode {
    x: number;
    y: number;
}

const COLORS: Record<BeliefCorrectness, string> = {
    correct: '#22c55e',
    partially_correct: '#eab308',
    misconception: '#ef4444',
    unknown: '#64748b',
};

const LABELS: Record<BeliefCorrectness, string> = {
    correct: 'Correct',
    partially_correct: 'Partially correct',
    misconception: 'Misconception',
    unknown: 'Unknown',
};

function formatDate(value: string | null) {
    if (!value) return 'Not updated yet';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function buildLayout(nodes: BeliefNode[], edges: BeliefEdge[], width: number, height: number): LayoutNode[] {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.32;
    const layoutNodes: LayoutNode[] = nodes.map((node, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1) - Math.PI / 2;
        return {
            ...node,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
        };
    });

    const nodeById = new Map(layoutNodes.map((node) => [node.concept_id, node]));

    for (let tick = 0; tick < 160; tick++) {
        for (let i = 0; i < layoutNodes.length; i++) {
            for (let j = i + 1; j < layoutNodes.length; j++) {
                const a = layoutNodes[i];
                const b = layoutNodes[j];
                const dx = b.x - a.x || 0.1;
                const dy = b.y - a.y || 0.1;
                const distanceSq = Math.max(dx * dx + dy * dy, 100);
                const force = 900 / distanceSq;
                a.x -= dx * force;
                a.y -= dy * force;
                b.x += dx * force;
                b.y += dy * force;
            }
        }

        edges.forEach((edge) => {
            const a = nodeById.get(edge.from_concept);
            const b = nodeById.get(edge.to_concept);
            if (!a || !b) return;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const target = 185;
            const force = (distance - target) * 0.012;
            const moveX = (dx / distance) * force;
            const moveY = (dy / distance) * force;
            a.x += moveX;
            a.y += moveY;
            b.x -= moveX;
            b.y -= moveY;
        });

        layoutNodes.forEach((node) => {
            node.x += (centerX - node.x) * 0.018;
            node.y += (centerY - node.y) * 0.018;
            node.x = Math.max(72, Math.min(width - 72, node.x));
            node.y = Math.max(72, Math.min(height - 72, node.y));
        });
    }

    return layoutNodes;
}

export default function BeliefGraphTab({ userId, courseId = 'recursion' }: BeliefGraphTabProps) {
    const [nodes, setNodes] = useState<BeliefNode[]>([]);
    const [edges, setEdges] = useState<BeliefEdge[]>([]);
    const [selectedNode, setSelectedNode] = useState<BeliefNode | null>(null);
    const [history, setHistory] = useState<BeliefHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [size, setSize] = useState({ width: 820, height: 560 });
    const containerRef = useRef<HTMLDivElement>(null);

    const loadGraph = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const graph = await fetchBeliefGraph(userId, courseId);
            setNodes(graph.nodes);
            setEdges(graph.edges);
            setSelectedNode((current) => {
                // On initial load (no prior selection), leave unselected
                if (!current) return null;
                // On refresh, try to preserve the user's existing selection
                const preserved = graph.nodes.find((node) => node.concept_id === current.concept_id);
                if (preserved) return preserved;
                // If the previously selected node is gone, fall back to the most
                // recently updated concept that actually has data (skip unknown/no-history nodes)
                const candidates = graph.nodes
                    .filter((n) => n.correctness !== 'unknown' && n.last_updated)
                    .sort((a, b) => new Date(b.last_updated!).getTime() - new Date(a.last_updated!).getTime());
                return candidates[0] || null;
            });
        } catch (err: any) {
            setError(err.message || 'Failed to load belief graph');
        } finally {
            setIsLoading(false);
        }
    }, [courseId, userId]);

    useEffect(() => {
        loadGraph();
    }, [loadGraph]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(([entry]) => {
            const width = Math.max(360, entry.contentRect.width);
            const height = Math.max(420, entry.contentRect.height);
            setSize({ width, height });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!selectedNode) return;
        let active = true;
        setIsHistoryLoading(true);
        fetchBeliefHistory(userId, selectedNode.concept_id)
            .then((entries) => {
                if (active) setHistory(entries);
            })
            .catch(() => {
                if (active) setHistory([]);
            })
            .finally(() => {
                if (active) setIsHistoryLoading(false);
            });
        return () => {
            active = false;
        };
    }, [selectedNode, userId]);

    const layoutNodes = useMemo(
        () => buildLayout(nodes, edges, size.width, size.height),
        [edges, nodes, size.height, size.width]
    );
    const nodeById = useMemo(() => new Map(layoutNodes.map((node) => [node.concept_id, node])), [layoutNodes]);

    const selectedLayoutNode = selectedNode ? nodeById.get(selectedNode.concept_id) : null;

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading belief graph...
            </div>
        );
    }

    return (
        <div className="h-full min-h-[680px] bg-background text-foreground">
            <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="min-h-[520px] flex flex-col border-b xl:border-b-0 xl:border-r border-border/70">
                    <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-border/70">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                <BrainCircuit className="w-4 h-4" />
                                Recursion Module
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold mt-1">Belief Graph</h1>
                        </div>
                        <button
                            onClick={loadGraph}
                            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                            title="Refresh graph"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {error ? (
                        <div className="m-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                            {error}
                        </div>
                    ) : null}

                    <div ref={containerRef} className="relative flex-1 min-h-[500px] overflow-hidden">
                        <svg
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${size.width} ${size.height}`}
                            role="img"
                            aria-label="Belief graph for recursion concepts"
                            className="block h-full w-full"
                        >
                            <defs>
                                <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
                                    <feGaussianBlur stdDeviation="8" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>

                            {edges.map((edge) => {
                                const from = nodeById.get(edge.from_concept);
                                const to = nodeById.get(edge.to_concept);
                                if (!from || !to) return null;
                                return (
                                    <g key={`${edge.from_concept}-${edge.to_concept}`}>
                                        <line
                                            x1={from.x}
                                            y1={from.y}
                                            x2={to.x}
                                            y2={to.y}
                                            stroke="currentColor"
                                            className="text-border"
                                            strokeWidth={1.5}
                                        />
                                        <text
                                            x={(from.x + to.x) / 2}
                                            y={(from.y + to.y) / 2 - 6}
                                            textAnchor="middle"
                                            className="fill-muted-foreground text-[11px]"
                                        >
                                            {edge.relationship.replaceAll('_', ' ')}
                                        </text>
                                    </g>
                                );
                            })}

                            {layoutNodes.map((node) => {
                                const isSelected = selectedNode?.concept_id === node.concept_id;
                                const color = COLORS[node.correctness];
                                const radius = 22 + Math.round((node.confidence || 0) * 16);
                                const label = node.concept_label.replace(' as ', ' ');
                                return (
                                    <g
                                        key={node.concept_id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedNode(node)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') setSelectedNode(node);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <circle
                                            cx={node.x}
                                            cy={node.y}
                                            r={radius + (isSelected ? 8 : 0)}
                                            fill={color}
                                            opacity={isSelected ? 0.24 : 0.12}
                                            filter={isSelected ? 'url(#nodeGlow)' : undefined}
                                        />
                                        <circle
                                            cx={node.x}
                                            cy={node.y}
                                            r={radius}
                                            fill={color}
                                            stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.42)'}
                                            strokeWidth={isSelected ? 2.5 : 1.5}
                                        />
                                        <text
                                            x={node.x}
                                            y={node.y + radius + 18}
                                            textAnchor="middle"
                                            className="fill-foreground text-[12px] font-semibold"
                                        >
                                            {label.length > 24 ? `${label.slice(0, 24)}...` : label}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="absolute left-4 bottom-4 flex flex-wrap gap-2 rounded-xl border border-border bg-background/85 p-3 backdrop-blur">
                            {(Object.keys(COLORS) as BeliefCorrectness[]).map((key) => (
                                <span key={key} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[key] }} />
                                    {LABELS[key]}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                <aside className="min-h-[520px] bg-card/40">
                    {selectedLayoutNode ? (
                        <div className="h-full flex flex-col">
                            <div className="p-5 border-b border-border/70">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold leading-tight">{selectedLayoutNode.concept_label}</h2>
                                        <p className="mt-1 text-xs text-muted-foreground">{selectedLayoutNode.concept_id}</p>
                                    </div>
                                    <span
                                        className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                                        style={{ backgroundColor: COLORS[selectedLayoutNode.correctness] }}
                                    >
                                        {LABELS[selectedLayoutNode.correctness]}
                                    </span>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Current belief</p>
                                        <p className="text-sm leading-relaxed text-foreground">
                                            {selectedLayoutNode.belief_statement || 'No answer has updated this concept yet.'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border border-border bg-background/60 p-3">
                                            <p className="text-xs text-muted-foreground">Confidence</p>
                                            <p className="text-lg font-bold">{Math.round((selectedLayoutNode.confidence || 0) * 100)}%</p>
                                        </div>
                                        <div className="rounded-lg border border-border bg-background/60 p-3">
                                            <p className="text-xs text-muted-foreground">Last updated</p>
                                            <p className="text-sm font-semibold">{formatDate(selectedLayoutNode.last_updated)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock3 className="w-4 h-4 text-primary" />
                                    <h3 className="font-semibold">Belief Over Time</h3>
                                </div>

                                {isHistoryLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading timeline...
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                        Timeline appears after the first answer updates this concept.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {history.map((entry) => (
                                            <details key={entry.id} className="group rounded-xl border border-border bg-background/60 p-4">
                                                <summary className="cursor-pointer list-none">
                                                    <div className="flex items-start gap-3">
                                                        <span
                                                            className="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: COLORS[entry.correctness] }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-xs font-medium text-muted-foreground">
                                                                    {formatDate(entry.created_at)}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {Math.round((entry.confidence || 0) * 100)}%
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-sm leading-relaxed">{entry.belief_statement}</p>
                                                        </div>
                                                    </div>
                                                </summary>
                                                {entry.triggering_answer ? (
                                                    <div className="mt-3 ml-5 rounded-lg border border-border bg-card p-3">
                                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                                                            <GitBranch className="w-3 h-3" />
                                                            Triggering answer
                                                        </div>
                                                        <p className="text-xs leading-relaxed text-muted-foreground">{entry.triggering_answer}</p>
                                                    </div>
                                                ) : null}
                                            </details>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <BrainCircuit className="w-10 h-10 text-muted-foreground/40 mb-4" />
                            <p className="text-sm font-medium text-muted-foreground">
                                Click a node in the graph to view its belief details and history.
                            </p>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
