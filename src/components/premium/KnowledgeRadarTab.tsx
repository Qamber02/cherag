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
    Zap,
    X,
    Lock,
    Play,
    CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type {
    KnowledgeGraph,
    ConceptNode,
    MicroLessonResult
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
    onGenerateLesson: (concept: string, context: string) => Promise<MicroLessonResult | null>;
    onRecordAnswer: (correct: boolean, timeMs: number, conceptId?: string) => void;
}

export default function KnowledgeRadarTab({
    userId: _userId,
    context,
    hasContext,
    onAnalyze,
    knowledgeGraph,
    isLoading,
    onGenerateLesson,
    onRecordAnswer,
}: KnowledgeRadarTabProps) {
    const [selectedConcept, setSelectedConcept] = useState<ConceptNode | null>(null);
    const [viewMode, setViewMode] = useState<'graph' | 'list' | 'gaps'>('graph');

    // Active Learning State
    const [lessonStep, setLessonStep] = useState<'overview' | 'loading' | 'learn' | 'quiz' | 'result'>('overview');
    const [lessonData, setLessonData] = useState<MicroLessonResult | null>(null);
    const [quizSelected, setQuizSelected] = useState<number | null>(null);
    const [lessonStartTime, setLessonStartTime] = useState<number>(0);

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

    const isLocked = (concept: ConceptNode) => {
        if (!knowledgeGraph) return false;
        const prereqs = findPrerequisites(knowledgeGraph, concept.id);
        // Locked if any prerequisite has < 60% mastery
        return prereqs.some(p => p.mastery < 60);
    };

    const handleStartLesson = async () => {
        if (!selectedConcept) return;
        setLessonStep('loading');
        setLessonStartTime(Date.now());

        const data = await onGenerateLesson(selectedConcept.name, context);
        if (data) {
            setLessonData(data);
            setLessonStep('learn');
        } else {
            setLessonStep('overview'); // Fallback
        }
    };

    const handleQuizSubmit = () => {
        if (quizSelected === null || !lessonData || !selectedConcept) return;

        const isCorrect = quizSelected === lessonData.quiz.correct_index;
        const timeSpent = Date.now() - lessonStartTime;

        onRecordAnswer(isCorrect, timeSpent, selectedConcept.id);
        setLessonStep('result');
    };

    const handleCloseModal = () => {
        setSelectedConcept(null);
        setLessonStep('overview');
        setLessonData(null);
        setQuizSelected(null);
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            const locked = isLocked(concept);

                            return (
                                <div
                                    key={concept.id}
                                    onClick={() => setSelectedConcept(concept)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${selectedConcept?.id === concept.id
                                        ? 'border-primary bg-primary/5 shadow-lg'
                                        : 'border-border bg-card hover:border-primary/50'
                                        } ${locked ? 'opacity-75 grayscale-[0.5]' : ''}`}
                                >
                                    {locked && (
                                        <div className="absolute top-2 right-2 text-muted-foreground/50">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                    )}

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

            {/* Selected Concept Detail Modal / Active Learning Wizard */}
            <AnimatePresence>
                {selectedConcept && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCloseModal}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[85vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-border flex items-start justify-between bg-secondary/30">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground mb-1">{selectedConcept.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getComplexityBadge(selectedConcept.complexity)}`}>
                                            {selectedConcept.complexity}
                                        </span>
                                        <div className={`text-sm font-bold ${getMasteryColor(selectedConcept.mastery)}`}>
                                            {Math.round(selectedConcept.mastery)}% Mastery
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Modal Content - Wizard Steps */}
                            <div className="p-6 overflow-y-auto flex-1">
                                {lessonStep === 'loading' ? (
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                                        <p className="text-muted-foreground animate-pulse">Generating your personalized lesson...</p>
                                    </div>
                                ) : lessonStep === 'learn' && lessonData ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                            <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                                                <Lightbulb className="w-4 h-4" /> Key Idea
                                            </h4>
                                            <p className="text-foreground text-lg font-medium">{lessonData.explanation.core_concept}</p>
                                        </div>

                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <p className="lead italic text-muted-foreground">"{lessonData.explanation.hook}"</p>
                                            <div className="my-4 pl-4 border-l-4 border-secondary">
                                                <h5 className="font-semibold text-foreground mb-1">Think of it like this:</h5>
                                                <p>{lessonData.explanation.analogy}</p>
                                            </div>
                                            <p className="font-medium text-foreground bg-secondary/30 p-2 rounded-lg inline-block">
                                                💡 Takeaway: {lessonData.explanation.key_takeaway}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => setLessonStep('quiz')}
                                            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                        >
                                            Take Quick Quiz <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : lessonStep === 'quiz' && lessonData ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                                        <h4 className="text-lg font-bold text-foreground">Check Understanding</h4>
                                        <p className="text-lg text-foreground">{lessonData.quiz.question}</p>

                                        <div className="space-y-2">
                                            {lessonData.quiz.options.map((option, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setQuizSelected(idx)}
                                                    className={`w-full p-4 rounded-xl border text-left transition-all ${quizSelected === idx
                                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                                        : 'border-border hover:bg-secondary/50'
                                                        }`}
                                                >
                                                    <span className="font-bold mr-2 text-muted-foreground">{String.fromCharCode(65 + idx)}.</span>
                                                    {option}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleQuizSubmit}
                                            disabled={quizSelected === null}
                                            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Submit Answer
                                        </button>
                                    </div>
                                ) : lessonStep === 'result' && lessonData ? (
                                    <div className="text-center py-8 animate-in zoom-in-95 duration-300">
                                        {quizSelected === lessonData.quiz.correct_index ? (
                                            <>
                                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">Correct!</h3>
                                                <p className="text-muted-foreground mb-6">
                                                    {lessonData.quiz.explanation}
                                                </p>
                                                <button
                                                    onClick={handleCloseModal}
                                                    className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                                                >
                                                    Continue Learning
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <X className="w-10 h-10 text-red-600 dark:text-red-400" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Not quite...</h3>
                                                <p className="text-foreground font-medium mb-1">Correct Answer:</p>
                                                <p className="text-muted-foreground mb-6">
                                                    {lessonData.quiz.options[lessonData.quiz.correct_index]}
                                                    <br />
                                                    <span className="text-sm italic mt-2 block">{lessonData.quiz.explanation}</span>
                                                </p>
                                                <button
                                                    onClick={() => setLessonStep('learn')}
                                                    className="px-8 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-colors"
                                                >
                                                    Review Lesson
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    // Default Overview View
                                    <>
                                        <p className="text-muted-foreground leading-relaxed mb-6">
                                            {selectedConcept.description}
                                        </p>

                                        {/* Action Button */}
                                        <div className="mb-6">
                                            {isLocked(selectedConcept) ? (
                                                <div className="w-full py-3 bg-secondary/50 border border-secondary text-muted-foreground rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                                                    <Lock className="w-5 h-5" />
                                                    <span>Locked - Master Prerequisites First</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleStartLesson}
                                                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Play className="w-5 h-5 fill-current" />
                                                    Start Interactive Lesson
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="bg-secondary/20 p-4 rounded-xl">
                                                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                                    <ArrowRight className="w-4 h-4 text-blue-500" />
                                                    Prerequisites
                                                </h4>
                                                <div className="space-y-2">
                                                    {findPrerequisites(knowledgeGraph, selectedConcept.id).length > 0 ? (
                                                        findPrerequisites(knowledgeGraph, selectedConcept.id).map((p) => (
                                                            <div key={p.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border text-sm">
                                                                <span className="font-medium text-foreground">{p.name}</span>
                                                                <span className={`${getMasteryColor(p.mastery)} font-bold`}>{Math.round(p.mastery)}%</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground italic px-2">None required (Foundational)</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-secondary/20 p-4 rounded-xl">
                                                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                                    Unlocks Next
                                                </h4>
                                                <div className="space-y-2">
                                                    {findDependents(knowledgeGraph, selectedConcept.id).length > 0 ? (
                                                        findDependents(knowledgeGraph, selectedConcept.id).map((d) => (
                                                            <div key={d.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border text-sm">
                                                                <span className="font-medium text-foreground">{d.name}</span>
                                                                <span className={`${getMasteryColor(d.mastery)} font-bold`}>{Math.round(d.mastery)}%</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground italic px-2">End of current path</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
