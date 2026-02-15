import React, { useState, useCallback, useEffect } from 'react';
import { Network, Sparkles, Loader2, X, ExternalLink, BookOpen, Video, FileText, RefreshCw, ChevronRight } from 'lucide-react';
import { saveRoadmap, getLastRoadmap } from '../lib/activityService';
// Server Actions for secure server-side AI generation
// import { generateRoadmap as generateRoadmapAction, getNodeExplanation as getNodeExplanationAction, type RoadmapNode } from '@/app/actions/ai';
import { generateRoadmap as generateRoadmapAction, getNodeExplanation as getNodeExplanationAction, type RoadmapNode } from '../lib/aiService';

interface MindMapTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

// Parse markdown-like text to formatted JSX
function formatExplanation(text: string): React.ReactNode[] {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={`list-${elements.length}`} className="space-y-1.5 my-3 pl-4">
                    {listItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-amber-500 mt-1">•</span>
                            <span>{parseInlineFormatting(item)}</span>
                        </li>
                    ))}
                </ul>
            );
            listItems = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
            flushList();
            continue;
        }

        // Headers
        if (line.startsWith('###')) {
            flushList();
            elements.push(
                <h4 key={i} className="font-bold text-gray-900 text-base mt-4 mb-2">
                    {parseInlineFormatting(line.replace(/^#+\s*/, ''))}
                </h4>
            );
        } else if (line.startsWith('##') || line.startsWith('**') && line.endsWith('**') && line.length < 60) {
            flushList();
            elements.push(
                <h4 key={i} className="font-semibold text-gray-900 mt-4 mb-2 text-sm uppercase tracking-wide">
                    {parseInlineFormatting(line.replace(/^#+\s*/, '').replace(/\*\*/g, ''))}
                </h4>
            );
        }
        // Bullet points
        else if (line.match(/^[-•*]\s/)) {
            listItems.push(line.replace(/^[-•*]\s*/, ''));
        }
        // Numbered lists
        else if (line.match(/^\d+[\.\)]\s/)) {
            flushList();
            elements.push(
                <p key={i} className="text-gray-700 pl-4 border-l-2 border-blue-400 my-1.5">
                    {parseInlineFormatting(line)}
                </p>
            );
        }
        // Regular paragraphs
        else {
            flushList();
            elements.push(
                <p key={i} className="text-gray-700 leading-relaxed my-2">
                    {parseInlineFormatting(line)}
                </p>
            );
        }
    }

    flushList();
    return elements;
}

// Parse inline formatting like **bold**
function parseInlineFormatting(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        parts.push(
            <strong key={match.index} className="font-semibold text-gray-900">
                {match[1]}
            </strong>
        );
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

export default function MindMapTab({ userId, context, hasContext }: MindMapTabProps) {
    const [roadmap, setRoadmap] = useState<RoadmapNode | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
    const [nodeExplanation, setNodeExplanation] = useState('');
    const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Load saved roadmap on mount
    useEffect(() => {
        async function loadSaved() {
            if (userId) {
                const saved = await getLastRoadmap(userId);
                if (saved) {
                    setRoadmap(saved);
                }
            }
            setIsInitialLoad(false);
        }
        loadSaved();
    }, [userId]);

    const handleGenerateRoadmap = async () => {
        if (!context) {
            alert('Please upload a document first!');
            return;
        }
        setIsLoading(true);
        setError('');
        setSelectedNode(null);

        try {
            const result = await generateRoadmap(context);
            setRoadmap(result);
            // Save to database
            await saveRoadmap(userId, result);
        } catch (err: any) {
            console.error('Roadmap generation error:', err);
            setError(err.message || 'Failed to generate roadmap');
        } finally {
            setIsLoading(false);
        }
    };

    const generateRoadmap = async (content: string): Promise<RoadmapNode> => {
        return await generateRoadmapAction(content);
    };

    const handleNodeClick = useCallback(async (node: RoadmapNode, e: React.MouseEvent) => {
        e.stopPropagation();

        setSelectedNode(node);
        setNodeExplanation('');
        setIsLoadingExplanation(true);

        try {
            const explanation = await getNodeExplanation(node.title, node.description || '');
            setNodeExplanation(explanation);
        } catch (err) {
            console.error('Explanation error:', err);
            setNodeExplanation('Unable to load explanation. Please try again.');
        } finally {
            setIsLoadingExplanation(false);
        }
    }, []);

    const getNodeExplanation = async (title: string, description: string): Promise<string> => {
        return await getNodeExplanationAction(title, description);
    };

    // Initial loading state
    if (isInitialLoad) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
        );
    }

    // Empty State
    if (!roadmap && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center glass-panel">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-warm-glow border border-white/20">
                    <Network className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Learning Roadmap</h2>
                <p className="text-muted-foreground mb-8 max-w-sm">
                    Generate an interactive learning roadmap. Click any topic for AI explanations.
                </p>
                <button
                    onClick={handleGenerateRoadmap}
                    disabled={!hasContext || isLoading}
                    className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:shadow-warm-glow hover:scale-105 transition-all disabled:opacity-50"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <span>Generate Roadmap</span>
                    </div>
                </button>
                {!hasContext && <p className="mt-4 text-sm text-red-400">Upload a document first!</p>}
            </div>
        );
    }

    // Loading State
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-gray-600 font-medium">Building your roadmap...</p>
            </div>
        );
    }

    // Roadmap View with Side Panel
    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden relative">
            {/* Main Roadmap Area */}
            <div className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">Learning Roadmap</h2>
                    <button
                        onClick={handleGenerateRoadmap}
                        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-amber-100 text-amber-700 text-xs md:text-sm font-medium rounded-lg hover:bg-amber-200"
                    >
                        <RefreshCw className="w-3.5 md:w-4 h-3.5 md:h-4" />
                        Regenerate
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl mb-4 text-sm flex-shrink-0">
                        {error}
                    </div>
                )}

                {/* Scrollable Roadmap Container */}
                <div className="flex-1 glass-panel rounded-2xl overflow-auto border border-white/10 relative">
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px] pointer-events-none"></div>
                    <div className="p-8 min-w-max relative z-10">
                        {roadmap && (
                            <div className="flex flex-col items-center">
                                {/* Main Topic */}
                                <button
                                    onClick={(e) => handleNodeClick(roadmap, e)}
                                    className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 cursor-pointer
                                        bg-gradient-to-r from-primary to-orange-600 border border-white/20
                                        ${selectedNode?.id === roadmap.id ? 'ring-4 ring-primary/30 shadow-warm-glow' : ''}`}
                                >
                                    <span className="flex items-center gap-2">
                                        {roadmap.title}
                                        <ChevronRight className="w-4 h-4" />
                                    </span>
                                </button>

                                {/* Vertical connector from main */}
                                {roadmap.children && roadmap.children.length > 0 && (
                                    <>
                                        {/* Connector from main to horizontal line */}
                                        <div className="w-0.5 h-8 bg-slate-400"></div>

                                        {/* Horizontal connector bar */}
                                        <div className="relative w-full">
                                            {/* Topics Row with connecting line */}
                                            <div className="flex gap-8 relative">
                                                {/* Horizontal line spanning across topics */}
                                                <div
                                                    className="absolute top-0 h-0.5 bg-slate-400"
                                                    style={{
                                                        left: 'calc(100px)',
                                                        right: 'calc(100px)',
                                                        width: 'auto'
                                                    }}
                                                />
                                                {roadmap.children.map((topic) => (
                                                    <div key={topic.id} className="flex flex-col items-center relative" style={{ minWidth: '200px' }}>
                                                        {/* Vertical connector from horizontal line to topic */}
                                                        <div className="w-0.5 h-8 bg-slate-400"></div>

                                                        {/* Topic Node */}
                                                        <button
                                                            onClick={(e) => handleNodeClick(topic, e)}
                                                            className={`px-4 py-2.5 rounded-lg font-medium text-white shadow-md transition-all hover:scale-105 cursor-pointer
                                                                bg-blue-500 hover:bg-blue-600
                                                                ${selectedNode?.id === topic.id ? 'ring-4 ring-blue-300' : ''}`}
                                                        >
                                                            <span className="flex items-center gap-2 whitespace-nowrap">
                                                                {topic.title}
                                                                <ChevronRight className="w-4 h-4" />
                                                            </span>
                                                        </button>

                                                        {/* Subtopics */}
                                                        {topic.children && topic.children.length > 0 && (
                                                            <>
                                                                <div className="w-0.5 h-6 bg-slate-400"></div>
                                                                <div className="flex gap-3 flex-wrap justify-center max-w-xs">
                                                                    {topic.children.map((sub) => (
                                                                        <button
                                                                            key={sub.id}
                                                                            onClick={(e) => handleNodeClick(sub, e)}
                                                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white shadow transition-all hover:scale-105 cursor-pointer
                                                                                bg-purple-500 hover:bg-purple-600
                                                                                ${selectedNode?.id === sub.id ? 'ring-4 ring-purple-300' : ''}`}
                                                                        >
                                                                            <span className="flex items-center gap-1 whitespace-nowrap">
                                                                                {sub.title}
                                                                                <ChevronRight className="w-3 h-3" />
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-gradient-to-r from-amber-400 to-orange-500"></div>
                        <span>Main Topic</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                        <span>Topic</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-purple-500"></div>
                        <span>Subtopic</span>
                    </div>
                </div>
            </div>

            {/* Side Panel - Overlay on mobile, side panel on desktop */}
            {selectedNode && (
                <>
                    {/* Mobile overlay backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setSelectedNode(null)}
                    />
                    <div className="fixed inset-x-0 bottom-0 max-h-[80vh] md:relative md:inset-auto md:max-h-none md:w-96 glass border-t md:border-t-0 md:border-l border-white/20 flex flex-col shadow-2xl z-50 rounded-t-2xl md:rounded-none backdrop-blur-xl">
                        {/* Panel Header */}
                        <div className="p-4 border-b border-white/10 flex items-start justify-between bg-primary/10">
                            <div className="flex-1 pr-3">
                                <h3 className="font-bold text-foreground text-lg">{selectedNode.title}</h3>
                                {selectedNode.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{selectedNode.description}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="p-1.5 hover:bg-white/70 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Panel Content */}
                        <div className="flex-1 overflow-auto p-4">
                            {isLoadingExplanation ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                                    <p className="text-sm text-gray-500">Generating explanation...</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Formatted Explanation */}
                                    <div className="text-sm">
                                        {formatExplanation(nodeExplanation)}
                                    </div>

                                    {/* Resources Section */}
                                    <div className="pt-4 mt-4 border-t border-gray-100">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-amber-500" />
                                            Learn More
                                        </h4>
                                        <div className="space-y-2">
                                            <a
                                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                                                    selectedNode.title + ' in ' + (roadmap?.title || '') + ' explained tutorial'
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-sm"
                                            >
                                                <Video className="w-4 h-4" />
                                                <span className="flex-1 font-medium">YouTube Tutorials</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                            <a
                                                href={`https://www.google.com/search?q=${encodeURIComponent(
                                                    selectedNode.title + ' in ' + (roadmap?.title || '') + ' guide'
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm"
                                            >
                                                <FileText className="w-4 h-4" />
                                                <span className="flex-1 font-medium">Articles & Guides</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
