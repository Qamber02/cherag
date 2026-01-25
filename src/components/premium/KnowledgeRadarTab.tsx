// Knowledge Radar Tab
// Interactive visualization of concept dependencies and knowledge gaps

import { useState, useMemo } from 'react';
import {
    Radar,
    Target,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Loader2,
    RefreshCw,
    Lightbulb,
    ArrowRight,
    Zap
} from 'lucide-react';

import type {
    KnowledgeGraph,
    ConceptNode,
} from '../../lib/premium';

import {
    identifyGaps,
    calculateCoverage,
    getOptimalLearningOrder,
    findPrerequisites,
    findDependents,
} from '../../lib/premium';

interface KnowledgeRadarTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
    onAnalyze: (content: string) => Promise<any>;
    knowledgeGraph: KnowledgeGraph | null;
    isLoading: boolean;
}

export default function KnowledgeRadarTab({
    userId: _userId,
    context,
    hasContext,
    onAnalyze,
    knowledgeGraph,
    isLoading,
}: KnowledgeRadarTabProps) {
    const [selectedConcept, setSelectedConcept] = useState<ConceptNode | null>(null);
    const [viewMode, setViewMode] = useState<'graph' | 'list' | 'gaps'>('graph');

    // Calculate derived data
    const coverage = useMemo(() => {
        if (!knowledgeGraph) return null;
        return calculateCoverage(knowledgeGraph);
    }, [knowledgeGraph]);

    const gaps = useMemo(() => {
        if (!knowledgeGraph) return [];
        return identifyGaps(knowledgeGraph);
    }, [knowledgeGraph]);

    const learningOrder = useMemo(() => {
        if (!knowledgeGraph) return [];
        return getOptimalLearningOrder(knowledgeGraph);
    }, [knowledgeGraph]);

    const handleAnalyze = async () => {
        if (!context.trim()) return;
        await onAnalyze(context);
    };

    // Get mastery color
    const getMasteryColor = (mastery: number): string => {
        if (mastery >= 80) return 'text-emerald-500 dark:text-emerald-400';
        if (mastery >= 60) return 'text-green-500 dark:text-green-400';
        if (mastery >= 40) return 'text-amber-500 dark:text-amber-400';
        if (mastery >= 20) return 'text-orange-500 dark:text-orange-400';
        return 'text-red-500 dark:text-red-400';
    };

    const getMasteryBg = (mastery: number): string => {
        if (mastery >= 80) return 'bg-emerald-500';
        if (mastery >= 60) return 'bg-green-500';
        if (mastery >= 40) return 'bg-amber-500';
        if (mastery >= 20) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getComplexityBadge = (complexity: string) => {
        const styles = {
            foundational: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            intermediate: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        };
        return styles[complexity as keyof typeof styles] || styles.intermediate;
    };

    // Empty state
    if (!hasContext) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
                    <Radar className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-foreground">Knowledge Radar</h2>
                <p className="text-muted-foreground max-w-md">
                    Upload documents to analyze concept dependencies and discover knowledge gaps
                    before they become problems.
                </p>
            </div>
        );
    }

    // No graph yet
    if (!knowledgeGraph) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg animate-pulse">
                    <Target className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-foreground">Analyze Your Content</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                    Discover the hidden structure of your study materials. We'll map concept
                    dependencies and identify gaps in your knowledge.
                </p>
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Zap className="w-5 h-5" />
                            Analyze Content
                        </>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-border shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Radar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Knowledge Radar</h1>
                            <p className="text-sm text-muted-foreground">
                                {knowledgeGraph.nodes.length} concepts • {gaps.length} gaps detected
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Coverage Stats */}
                {coverage && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-card rounded-xl p-4 border border-border">
                            <div className="text-2xl font-bold text-foreground">{coverage.overall}%</div>
                            <div className="text-xs text-muted-foreground">Overall Mastery</div>
                        </div>
                        <div className="bg-card rounded-xl p-4 border border-border">
                            <div className="text-2xl font-bold text-emerald-500">{coverage.fullyMastered}</div>
                            <div className="text-xs text-muted-foreground">Mastered</div>
                        </div>
                        <div className="bg-card rounded-xl p-4 border border-border">
                            <div className="text-2xl font-bold text-amber-500">{coverage.inProgress}</div>
                            <div className="text-xs text-muted-foreground">In Progress</div>
                        </div>
                        <div className="bg-card rounded-xl p-4 border border-border">
                            <div className="text-2xl font-bold text-red-500">{coverage.notStarted}</div>
                            <div className="text-xs text-muted-foreground">Not Started</div>
                        </div>
                    </div>
                )}

                {/* View Mode Tabs */}
                <div className="flex gap-2 mt-4">
                    {(['graph', 'list', 'gaps'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors capitalize ${viewMode === mode
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80 text-foreground'
                                }`}
                        >
                            {mode === 'gaps' ? 'Knowledge Gaps' : mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
                {viewMode === 'gaps' ? (
                    // Knowledge Gaps View
                    <div className="space-y-4">
                        {gaps.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground">No Knowledge Gaps!</h3>
                                <p className="text-muted-foreground">
                                    All your prerequisites are met. Keep up the great work!
                                </p>
                            </div>
                        ) : (
                            gaps.map((gap, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-xl border ${gap.priority === 'critical'
                                        ? 'border-red-500/30 bg-red-500/5'
                                        : gap.priority === 'important'
                                            ? 'border-amber-500/30 bg-amber-500/5'
                                            : 'border-border bg-card'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle
                                            className={`w-5 h-5 mt-0.5 ${gap.priority === 'critical'
                                                ? 'text-red-500'
                                                : gap.priority === 'important'
                                                    ? 'text-amber-500'
                                                    : 'text-muted-foreground'
                                                }`}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-foreground">{gap.concept}</span>
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full capitalize ${gap.priority === 'critical'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : gap.priority === 'important'
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                        }`}
                                                >
                                                    {gap.priority}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Missing prerequisites: {gap.blockingConcepts.join(', ')}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-primary">
                                                <Lightbulb className="w-4 h-4" />
                                                {gap.recommendation}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : viewMode === 'list' ? (
                    // Optimal Learning Order
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">
                            Optimal Learning Order
                        </h3>
                        {learningOrder.map((concept, index) => (
                            <div
                                key={concept.id}
                                onClick={() => setSelectedConcept(concept)}
                                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedConcept?.id === concept.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border bg-card hover:border-primary/50'
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">{concept.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getComplexityBadge(concept.complexity)}`}>
                                            {concept.complexity}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        {concept.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className={`text-lg font-bold ${getMasteryColor(concept.mastery)}`}>
                                            {Math.round(concept.mastery)}%
                                        </div>
                                        <div className="text-xs text-muted-foreground">mastery</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Graph View (Simplified for now)
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {knowledgeGraph.nodes.map((concept) => {
                            const prereqs = findPrerequisites(knowledgeGraph, concept.id);
                            const dependents = findDependents(knowledgeGraph, concept.id);

                            return (
                                <div
                                    key={concept.id}
                                    onClick={() => setSelectedConcept(concept)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedConcept?.id === concept.id
                                        ? 'border-primary bg-primary/5 shadow-lg'
                                        : 'border-border bg-card hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-foreground">{concept.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getComplexityBadge(concept.complexity)}`}>
                                                {concept.complexity}
                                            </span>
                                        </div>
                                        <div className={`text-lg font-bold ${getMasteryColor(concept.mastery)}`}>
                                            {Math.round(concept.mastery)}%
                                        </div>
                                    </div>

                                    {/* Mastery Bar */}
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                                        <div
                                            className={`h-full ${getMasteryBg(concept.mastery)} transition-all duration-500`}
                                            style={{ width: `${concept.mastery}%` }}
                                        />
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                        {concept.description}
                                    </p>

                                    {/* Dependencies */}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        {prereqs.length > 0 && (
                                            <span>{prereqs.length} prerequisite{prereqs.length > 1 ? 's' : ''}</span>
                                        )}
                                        {dependents.length > 0 && (
                                            <span>{dependents.length} dependent{dependents.length > 1 ? 's' : ''}</span>
                                        )}
                                        {concept.stressTested && (
                                            <span className="flex items-center gap-1 text-emerald-500">
                                                <CheckCircle2 className="w-3 h-3" /> Tested
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selected Concept Detail Panel */}
            {selectedConcept && (
                <div className="border-t border-border p-4 md:p-6 bg-card shrink-0">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">{selectedConcept.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedConcept.description}</p>
                        </div>
                        <button
                            onClick={() => setSelectedConcept(null)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            ×
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Prerequisites</h4>
                            <div className="space-y-1">
                                {findPrerequisites(knowledgeGraph, selectedConcept.id).map((p) => (
                                    <div key={p.id} className="flex items-center gap-2 text-sm">
                                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                        <span className={getMasteryColor(p.mastery)}>{p.name}</span>
                                        <span className="text-muted-foreground">({Math.round(p.mastery)}%)</span>
                                    </div>
                                ))}
                                {findPrerequisites(knowledgeGraph, selectedConcept.id).length === 0 && (
                                    <span className="text-sm text-muted-foreground">No prerequisites</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Unlocks</h4>
                            <div className="space-y-1">
                                {findDependents(knowledgeGraph, selectedConcept.id).map((d) => (
                                    <div key={d.id} className="flex items-center gap-2 text-sm">
                                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                        <span className={getMasteryColor(d.mastery)}>{d.name}</span>
                                        <span className="text-muted-foreground">({Math.round(d.mastery)}%)</span>
                                    </div>
                                ))}
                                {findDependents(knowledgeGraph, selectedConcept.id).length === 0 && (
                                    <span className="text-sm text-muted-foreground">No dependents</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
