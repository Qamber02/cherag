import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    forceSimulation,
    forceManyBody,
    forceCollide,
    forceLink,
    forceCenter,
    forceX,
    forceY,
    SimulationNodeDatum,
    SimulationLinkDatum,
    Simulation
} from 'd3-force';
import {
    BrainCircuit,
    Clock3,
    GitBranch,
    Loader2,
    RefreshCw,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Move,
    HelpCircle
} from 'lucide-react';
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

export interface SimNode extends SimulationNodeDatum, BeliefNode {
    radius: number;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
    id: string;
    source: string | SimNode;
    target: string | SimNode;
    relationship: string;
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

function truncateLabel(label: string, maxLen = 22): string {
    const clean = label.replace(/^(document_quiz|recursion)\./i, '').replace(/_/g, ' ');
    if (clean.length <= maxLen) return clean;
    return `${clean.slice(0, maxLen - 3)}...`;
}

export default function BeliefGraphTab({ userId, courseId = 'all' }: BeliefGraphTabProps) {
    const [rawNodes, setRawNodes] = useState<BeliefNode[]>([]);
    const [rawEdges, setRawEdges] = useState<BeliefEdge[]>([]);
    const [nodes, setNodes] = useState<SimNode[]>([]);
    const [links, setLinks] = useState<SimLink[]>([]);
    
    const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
    const [history, setHistory] = useState<BeliefHistoryEntry[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [size, setSize] = useState({ width: 900, height: 600 });
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<Simulation<SimNode, SimLink> | null>(null);
    const draggedNodeRef = useRef<SimNode | null>(null);

    // 1. Fetch data from Supabase
    const loadGraph = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const graph = await fetchBeliefGraph(userId, courseId);
            setRawNodes(graph.nodes);
            setRawEdges(graph.edges);
        } catch (err: any) {
            setError(err.message || 'Failed to load belief graph');
        } finally {
            setIsLoading(false);
        }
    }, [courseId, userId]);

    useEffect(() => {
        loadGraph();
    }, [loadGraph]);

    // 2. Measure Container Size
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(([entry]) => {
            const width = Math.max(400, entry.contentRect.width);
            const height = Math.max(450, entry.contentRect.height);
            setSize({ width, height });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // 3. Initialize D3 Force Simulation
    useEffect(() => {
        if (rawNodes.length === 0) {
            setNodes([]);
            setLinks([]);
            return;
        }

        const centerX = size.width / 2;
        const centerY = size.height / 2;

        // Map nodes with D3 initial positions
        const simNodesData: SimNode[] = rawNodes.map((n, idx) => {
            const angle = (idx / rawNodes.length) * 2 * Math.PI;
            const r = 120 + (idx % 3) * 40;
            return {
                ...n,
                radius: 22 + Math.round((n.confidence || 0) * 14),
                x: centerX + Math.cos(angle) * r,
                y: centerY + Math.sin(angle) * r,
            };
        });

        // Filter valid links where both source and target exist
        const nodeSet = new Set(simNodesData.map((n) => n.concept_id));
        const simLinksData: SimLink[] = rawEdges
            .filter((e) => nodeSet.has(e.from_concept) && nodeSet.has(e.to_concept))
            .map((e) => ({
                id: `${e.from_concept}-${e.to_concept}`,
                source: e.from_concept,
                target: e.to_concept,
                relationship: e.relationship,
            }));

        // Stop existing simulation
        if (simulationRef.current) {
            simulationRef.current.stop();
        }

        // Build D3 Force Simulation
        const sim = forceSimulation<SimNode, SimLink>(simNodesData)
            .force('charge', forceManyBody<SimNode>().strength(-450))
            .force(
                'link',
                forceLink<SimNode, SimLink>(simLinksData)
                    .id((d) => d.concept_id)
                    .distance(150)
                    .strength(0.4)
            )
            .force('collide', forceCollide<SimNode>((d) => d.radius + 35).iterations(3))
            .force('center', forceCenter(centerX, centerY))
            .force('x', forceX(centerX).strength(0.04))
            .force('y', forceY(centerY).strength(0.04))
            .alpha(1)
            .alphaDecay(0.025);

        sim.on('tick', () => {
            // Update React state on simulation ticks
            setNodes([...simNodesData]);
            setLinks([...simLinksData]);
        });

        simulationRef.current = sim;

        return () => {
            sim.stop();
        };
    }, [rawNodes, rawEdges, size.width, size.height]);

    // 4. Fetch Belief History for Selected Node
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

    // 5. Pan & Zoom Controls
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        setTransform((prev) => {
            const newK = Math.max(0.4, Math.min(3.5, prev.k * zoomFactor));
            return { ...prev, k: newK };
        });
    };

    const handleMouseDownCanvas = (e: React.MouseEvent) => {
        if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'svg') return;
        setIsPanning(true);
        setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMoveCanvas = (e: React.MouseEvent) => {
        if (isPanning) {
            setTransform((prev) => ({
                ...prev,
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            }));
        } else if (draggedNodeRef.current && simulationRef.current) {
            // Convert screen coords to SVG viewBox coords
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mouseX = (e.clientX - rect.left - transform.x) / transform.k;
            const mouseY = (e.clientY - rect.top - transform.y) / transform.k;
            draggedNodeRef.current.fx = mouseX;
            draggedNodeRef.current.fy = mouseY;
            simulationRef.current.alphaTarget(0.3).restart();
        }
    };

    const handleMouseUpCanvas = () => {
        setIsPanning(false);
        if (draggedNodeRef.current && simulationRef.current) {
            draggedNodeRef.current.fx = null;
            draggedNodeRef.current.fy = null;
            simulationRef.current.alphaTarget(0);
            draggedNodeRef.current = null;
        }
    };

    const handleNodeMouseDown = (node: SimNode, e: React.MouseEvent) => {
        e.stopPropagation();
        draggedNodeRef.current = node;
        setSelectedNode(node);
    };

    const zoomIn = () => setTransform((t) => ({ ...t, k: Math.min(3.5, t.k * 1.25) }));
    const zoomOut = () => setTransform((t) => ({ ...t, k: Math.max(0.4, t.k / 1.25) }));
    const resetZoom = () => setTransform({ x: 0, y: 0, k: 1 });

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading cognitive belief graph...
            </div>
        );
    }

    return (
        <div className="h-full min-h-[680px] bg-background text-foreground select-none">
            <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
                {/* Main Graph Viewport */}
                <section className="min-h-[520px] flex flex-col border-b xl:border-b-0 xl:border-r border-border/70 relative">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-border/70 bg-card/30 z-10">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                <BrainCircuit className="w-4 h-4" />
                                {courseId === 'all' ? 'Cognitive Belief Graph' : courseId.replaceAll('_', ' ')}
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold mt-1">Belief Graph</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={zoomIn}
                                className="p-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={zoomOut}
                                className="p-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <button
                                onClick={resetZoom}
                                className="p-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                                title="Reset Zoom / Center"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={loadGraph}
                                className="p-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                                title="Refresh Simulation"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {error ? (
                        <div className="m-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                            {error}
                        </div>
                    ) : null}

                    {/* Interactive Canvas Area */}
                    <div
                        ref={containerRef}
                        className={`relative flex-1 min-h-[500px] overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDownCanvas}
                        onMouseMove={handleMouseMoveCanvas}
                        onMouseUp={handleMouseUpCanvas}
                        onMouseLeave={handleMouseUpCanvas}
                    >
                        <svg
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${size.width} ${size.height}`}
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

                            {/* Transformed Group for Pan & Zoom */}
                            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                                {/* Render Links */}
                                {links.map((link) => {
                                    const source = typeof link.source === 'object' ? link.source : nodes.find((n) => n.concept_id === link.source);
                                    const target = typeof link.target === 'object' ? link.target : nodes.find((n) => n.concept_id === link.target);
                                    if (!source || !target || source.x == null || target.x == null) return null;

                                    const midX = (source.x + target.x) / 2;
                                    const midY = (source.y + target.y) / 2;

                                    return (
                                        <g key={link.id}>
                                            <line
                                                x1={source.x}
                                                y1={source.y}
                                                x2={target.x}
                                                y2={target.y}
                                                stroke="currentColor"
                                                className="text-border/80"
                                                strokeWidth={1.8}
                                                strokeDasharray="4 2"
                                            />
                                            <text
                                                x={midX}
                                                y={midY - 6}
                                                textAnchor="middle"
                                                className="fill-muted-foreground text-[10px] font-medium pointer-events-none select-none"
                                            >
                                                {link.relationship.replace(/_/g, ' ')}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Render Nodes */}
                                {nodes.map((node) => {
                                    const isSelected = selectedNode?.concept_id === node.concept_id;
                                    const isHovered = hoveredNode?.concept_id === node.concept_id;
                                    const color = COLORS[node.correctness] || COLORS.unknown;
                                    const radius = node.radius || 24;
                                    const label = truncateLabel(node.concept_label || node.concept_id);

                                    return (
                                        <g
                                            key={node.concept_id}
                                            transform={`translate(${node.x}, ${node.y})`}
                                            className="cursor-pointer"
                                            onMouseDown={(e) => handleNodeMouseDown(node, e)}
                                            onMouseEnter={() => setHoveredNode(node)}
                                            onMouseLeave={() => setHoveredNode(null)}
                                            onClick={() => setSelectedNode(node)}
                                        >
                                            <title>{node.concept_label} ({LABELS[node.correctness]})</title>

                                            {/* Outer Glow Ring on Hover / Select */}
                                            {(isSelected || isHovered) && (
                                                <circle
                                                    r={radius + 10}
                                                    fill={color}
                                                    opacity={0.3}
                                                    filter="url(#nodeGlow)"
                                                />
                                            )}

                                            {/* Main Node Circle */}
                                            <circle
                                                r={radius}
                                                fill={color}
                                                stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                                                strokeWidth={isSelected ? 3 : 1.5}
                                                strokeDasharray={node.last_updated ? undefined : '4 3'}
                                                opacity={node.last_updated ? 1 : 0.65}
                                            />

                                            {/* Truncated Text Badge Underneath */}
                                            <g transform={`translate(0, ${radius + 16})`}>
                                                <rect
                                                    x={-((label.length * 6.5) / 2) - 6}
                                                    y={-10}
                                                    width={label.length * 6.5 + 12}
                                                    height={18}
                                                    rx={9}
                                                    fill="rgba(15, 23, 42, 0.85)"
                                                    stroke={isSelected ? color : 'rgba(255,255,255,0.15)'}
                                                    strokeWidth={1}
                                                />
                                                <text
                                                    textAnchor="middle"
                                                    y={3}
                                                    className="fill-foreground text-[11px] font-semibold tracking-tight"
                                                >
                                                    {label}
                                                </text>
                                            </g>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>

                        {/* Legend Overlay */}
                        <div className="absolute left-4 bottom-4 flex flex-wrap gap-2.5 rounded-xl border border-border bg-background/90 p-3 backdrop-blur z-10 shadow-lg">
                            {(Object.keys(COLORS) as BeliefCorrectness[]).map((key) => (
                                <span key={key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[key] }} />
                                    {LABELS[key]}
                                </span>
                            ))}
                        </div>

                        {/* Drag / Pan Hint */}
                        <div className="absolute right-4 bottom-4 flex items-center gap-1.5 text-xs text-muted-foreground/80 bg-background/80 px-2.5 py-1.5 rounded-lg border border-border/60 pointer-events-none">
                            <Move className="w-3.5 h-3.5" />
                            <span>Drag node or canvas to pan</span>
                        </div>
                    </div>
                </section>

                {/* Right Sidebar Details */}
                <aside className="min-h-[520px] bg-card/40 border-l border-border/60">
                    {selectedNode ? (
                        <div className="h-full flex flex-col">
                            <div className="p-5 border-b border-border/70">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold leading-tight">{selectedNode.concept_label}</h2>
                                        <p className="mt-1 text-xs text-muted-foreground font-mono">{selectedNode.concept_id}</p>
                                    </div>
                                    <span
                                        className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                                        style={{ backgroundColor: COLORS[selectedNode.correctness] }}
                                    >
                                        {LABELS[selectedNode.correctness]}
                                    </span>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-semibold">Current Belief State</p>
                                        <div className="p-3 rounded-xl border border-border/80 bg-background/60">
                                            <p className="text-sm leading-relaxed text-foreground font-medium">
                                                {selectedNode.belief_statement || 'No answer has updated this concept yet.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-xl border border-border bg-background/60 p-3">
                                            <p className="text-xs text-muted-foreground font-medium">Confidence</p>
                                            <p className="text-lg font-bold mt-0.5">{Math.round((selectedNode.confidence || 0) * 100)}%</p>
                                        </div>
                                        <div className="rounded-xl border border-border bg-background/60 p-3">
                                            <p className="text-xs text-muted-foreground font-medium">Last Updated</p>
                                            <p className="text-sm font-semibold mt-1">{formatDate(selectedNode.last_updated)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock3 className="w-4 h-4 text-primary" />
                                    <h3 className="font-semibold text-sm">Belief Progression History</h3>
                                </div>

                                {isHistoryLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading timeline...
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                        Timeline appears after your first answer updates this concept.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {history.map((entry) => (
                                            <details key={entry.id} className="group rounded-xl border border-border bg-background/60 p-3.5">
                                                <summary className="cursor-pointer list-none">
                                                    <div className="flex items-start gap-2.5">
                                                        <span
                                                            className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: COLORS[entry.correctness] }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                                    {formatDate(entry.created_at)}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground font-mono">
                                                                    {Math.round((entry.confidence || 0) * 100)}%
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs leading-relaxed text-foreground font-medium">{entry.belief_statement}</p>
                                                        </div>
                                                    </div>
                                                </summary>
                                                {entry.triggering_answer ? (
                                                    <div className="mt-3 ml-4 rounded-lg border border-border/80 bg-card/60 p-2.5">
                                                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-1">
                                                            <GitBranch className="w-3 h-3 text-primary" />
                                                            Triggering Answer
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
                            <HelpCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-semibold text-foreground">Interactive Node Inspector</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                                Click or drag any node in the graph to view its belief state, confidence metrics, and complete timeline history.
                            </p>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
