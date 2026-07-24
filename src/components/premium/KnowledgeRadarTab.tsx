// Knowledge Radar Tab
// Interactive visualization of concept dependencies and knowledge gaps

import { useState, useMemo, useCallback } from 'react';
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
    onGenerateLesson: (concept: string, context: string, previousQuestions?: string[]) => Promise<MicroLessonResult | null>;
    onRecordAnswer: (correct: boolean, timeMs: number, conceptId?: string) => void;
    onCompleteLesson: (conceptId: string) => void;
}

// Proper lesson state machine
type LessonState = 'idle' | 'loading' | 'question' | 'answered' | 'feedback' | 'explanation' | 'completed';

interface LessonSession {
    attemptCount: number;
    correctCount: number;
    totalTime: number;
    questionHistory: string[];
    currentQuestionId: string | null;
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
    onCompleteLesson,
}: KnowledgeRadarTabProps) {
    const [selectedConcept, setSelectedConcept] = useState<ConceptNode | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'gaps'>('list');

    // Proper state machine implementation
    const [lessonState, setLessonState] = useState<LessonState>('idle');
    const [lessonData, setLessonData] = useState<MicroLessonResult | null>(null);
    const [quizSelected, setQuizSelected] = useState<number | null>(null);
    const [lessonStartTime, setLessonStartTime] = useState<number>(0);
    const [isCorrect, setIsCorrect] = useState<boolean>(false);

    // Comprehensive session tracking
    const [lessonSession, setLessonSession] = useState<LessonSession>({
        attemptCount: 0,
        correctCount: 0,
        totalTime: 0,
        questionHistory: [],
        currentQuestionId: null,
    });

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

    // Reset all lesson state when starting fresh
    const resetLessonState = useCallback(() => {
        setLessonState('idle');
        setLessonData(null);
        setQuizSelected(null);
        setIsCorrect(false);
        setLessonSession({
            attemptCount: 0,
            correctCount: 0,
            totalTime: 0,
            questionHistory: [],
            currentQuestionId: null,
        });
    }, []);

    // Proper lesson start with state machine
    const handleStartLesson = useCallback(async () => {
        if (!selectedConcept) return;

        setLessonState('loading');
        setLessonStartTime(Date.now());
        setQuizSelected(null);
        setIsCorrect(false);

        try {
            // Pass question history to avoid repeats
            const data = await onGenerateLesson(
                selectedConcept.name,
                context,
                lessonSession.questionHistory
            );

            if (data) {
                setLessonData(data);
                // Track question to prevent repeats
                setLessonSession(prev => ({
                    ...prev,
                    questionHistory: [...prev.questionHistory, data.quiz.question],
                    currentQuestionId: data.quiz.question, // Use question as ID
                    attemptCount: prev.attemptCount + 1,
                }));
                // Move to explanation first, then question
                setLessonState('explanation');
            } else {
                setLessonState('idle');
            }
        } catch (error) {
            console.error('Failed to generate lesson:', error);
            setLessonState('idle');
        }
    }, [selectedConcept, context, lessonSession.questionHistory, onGenerateLesson]);

    // Move from explanation to question
    const handleStartQuiz = useCallback(() => {
        if (lessonState === 'explanation') {
            setLessonState('question');
        }
    }, [lessonState]);

    const getCorrectIndex = (quiz?: { options: string[]; correct_index?: number; correct_answer_text?: string }): number => {
        if (!quiz) return 0;
        if (typeof quiz.correct_index === 'number' && quiz.correct_index >= 0 && quiz.correct_index < quiz.options.length) {
            return quiz.correct_index;
        }
        if (quiz.correct_answer_text && quiz.options?.length) {
            const target = quiz.correct_answer_text.trim().toLowerCase();
            const idx = quiz.options.findIndex(opt => {
                const clean = opt.trim().toLowerCase();
                const stripped = clean.length > 3 && [')', '.', ':'].includes(clean[1]) ? clean.slice(2).trim() : clean;
                return clean === target || stripped === target || clean.includes(target) || target.includes(clean);
            });
            if (idx !== -1) return idx;
        }
        return 0;
    };

    // Handle answer submission with proper state transitions
    const handleQuizSubmit = useCallback(() => {
        if (quizSelected === null || !lessonData || !selectedConcept) return;

        const targetCorrectIndex = getCorrectIndex(lessonData.quiz);
        const correct = quizSelected === targetCorrectIndex;
        const timeSpent = Date.now() - lessonStartTime;

        setIsCorrect(correct);

        // Record answer immediately
        onRecordAnswer(correct, timeSpent, selectedConcept.id);

        // Update session stats
        setLessonSession(prev => ({
            ...prev,
            correctCount: prev.correctCount + (correct ? 1 : 0),
            totalTime: prev.totalTime + timeSpent,
        }));

        // Transition to feedback state
        setLessonState('feedback');
    }, [quizSelected, lessonData, selectedConcept, lessonStartTime, onRecordAnswer]);

    // Handle "Next" button - load new question
    const handleNext = useCallback(async (retryCount = 0) => {
        if (!selectedConcept) return;

        // Prevent infinite loops
        if (retryCount > 3) {
            console.warn('Max retries reached for generating new question');
            setLessonState('completed');
            return;
        }

        // Check if we should complete the lesson (e.g., after 5 questions)
        const shouldComplete = lessonSession.attemptCount >= 5;

        if (shouldComplete) {
            setLessonState('completed');
            onCompleteLesson(selectedConcept.id);
            return;
        }

        // Reset question-specific state, keep session data
        if (retryCount === 0) {
            setQuizSelected(null);
            setIsCorrect(false);
            setLessonData(null);
            setLessonState('loading');
            setLessonStartTime(Date.now());
        }

        try {
            // Generate NEW question with updated history
            const data = await onGenerateLesson(
                selectedConcept.name,
                context,
                lessonSession.questionHistory
            );

            if (data) {
                // Ensure it's actually a new question
                if (!lessonSession.questionHistory.includes(data.quiz.question)) {
                    setLessonData(data);
                    setLessonSession(prev => ({
                        ...prev,
                        questionHistory: [...prev.questionHistory, data.quiz.question],
                        currentQuestionId: data.quiz.question,
                        attemptCount: prev.attemptCount + 1,
                    }));
                    setLessonState('explanation');
                } else {
                    // If somehow we got a repeat, try again
                    console.warn('Received duplicate question, retrying...');
                    handleNext(retryCount + 1);
                }
            } else {
                setLessonState('idle');
            }
        } catch (error) {
            console.error('Failed to load next question:', error);
            setLessonState('idle');
        }
    }, [selectedConcept, context, lessonSession, onGenerateLesson, onCompleteLesson]);

    // Handle retry (wrong answer)
    const handleRetry = useCallback(() => {
        setQuizSelected(null);
        setIsCorrect(false);
        setLessonState('question');
        setLessonStartTime(Date.now()); // Reset timer
    }, []);

    // Close modal and reset everything
    const handleCloseModal = useCallback(() => {
        setSelectedConcept(null);
        resetLessonState();
    }, [resetLessonState]);

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
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    {(['list', 'gaps'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 text-sm rounded-lg transition-colors capitalize ${viewMode === mode
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80 text-foreground'
                                }`}
                        >
                            {mode === 'gaps' ? 'Knowledge Gaps' : 'Concepts'}
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
                ) : (
                    // Concepts List View (Optimal Learning Order)
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">
                            Optimal Learning Order
                        </h3>
                        {learningOrder.map((concept, index) => {
                            const prereqs = findPrerequisites(knowledgeGraph, concept.id);
                            const locked = isLocked(concept);

                            return (
                                <div
                                    key={concept.id}
                                    onClick={() => !locked && setSelectedConcept(concept)}
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedConcept?.id === concept.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border bg-card hover:border-primary/50'
                                        } ${locked ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${locked ? 'bg-muted' : 'bg-secondary'}`}>
                                        {locked ? <Lock className="w-4 h-4" /> : index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-foreground">{concept.name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getComplexityBadge(concept.complexity)}`}>
                                                {concept.complexity}
                                            </span>
                                            {prereqs.length > 0 && locked && (
                                                <span className="text-xs text-muted-foreground">
                                                    Requires: {prereqs.map(p => p.name).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {concept.description}
                                        </p>
                                        {/* Progress bar */}
                                        <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getMasteryBg(concept.mastery)} transition-all duration-500`}
                                                style={{ width: `${concept.mastery}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="text-right">
                                            <div className={`text-lg font-bold ${getMasteryColor(concept.mastery)}`}>
                                                {Math.round(concept.mastery)}%
                                            </div>
                                            <div className="text-xs text-muted-foreground">mastery</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selected Concept Detail Modal / Active Learning Wizard with proper state machine */}
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
                            className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[95dvh] md:max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header - Compact */}
                            <div className="p-4 md:p-5 border-b border-border flex items-start justify-between bg-secondary/30 shrink-0">
                                <div className="min-w-0 flex-1 pr-2">
                                    <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 truncate">{selectedConcept.name}</h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getComplexityBadge(selectedConcept.complexity)}`}>
                                            {selectedConcept.complexity}
                                        </span>
                                        <div className={`text-xs md:text-sm font-bold ${getMasteryColor(selectedConcept.mastery)}`}>
                                            {Math.round(selectedConcept.mastery)}%
                                        </div>
                                        {/* Show progress indicator during lesson */}
                                        {lessonState !== 'idle' && lessonSession.attemptCount > 0 && (
                                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                                                Q{lessonSession.attemptCount} • {lessonSession.correctCount}✓
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    aria-label="Close modal"
                                    className="p-1.5 md:p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors shrink-0"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Modal Content - State Machine Rendering with proper scroll */}
                            <div className="overflow-y-auto flex-1 overscroll-contain">
                                <div className="p-4 md:p-6">
                                    {/* Loading State */}
                                    {lessonState === 'loading' && (
                                        <div className="flex flex-col items-center justify-center py-16 md:py-20">
                                            <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-primary mb-3" />
                                            <p className="text-sm md:text-base text-muted-foreground animate-pulse">
                                                {lessonSession.attemptCount === 0
                                                    ? 'Generating your personalized lesson...'
                                                    : 'Loading next question...'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Explanation State - Auto-shown before question */}
                                    {lessonState === 'explanation' && lessonData && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="bg-primary/5 p-3 md:p-4 rounded-xl border border-primary/20">
                                                <h4 className="font-bold text-primary text-sm md:text-base mb-2 flex items-center gap-2">
                                                    <Lightbulb className="w-4 h-4" /> Key Idea
                                                </h4>
                                                <p className="text-foreground text-base md:text-lg font-medium">{lessonData.explanation.core_concept}</p>
                                            </div>

                                            <div className="prose prose-sm dark:prose-invert max-w-none space-y-3">
                                                <p className="text-sm md:text-base italic text-muted-foreground">"{lessonData.explanation.hook}"</p>
                                                <div className="pl-3 md:pl-4 border-l-4 border-secondary">
                                                    <h5 className="font-semibold text-sm md:text-base text-foreground mb-1">Think of it like this:</h5>
                                                    <p className="text-sm md:text-base">{lessonData.explanation.analogy}</p>
                                                </div>
                                                <p className="text-sm md:text-base font-medium text-foreground bg-secondary/30 p-2 md:p-3 rounded-lg">
                                                    💡 {lessonData.explanation.key_takeaway}
                                                </p>
                                            </div>

                                            {/* Clear CTA to move to quiz */}
                                            <button
                                                onClick={handleStartQuiz}
                                                className="w-full py-2.5 md:py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm md:text-base"
                                            >
                                                Ready? Take the Quiz <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Question State - Only show quiz, not explanation */}
                                    {lessonState === 'question' && lessonData && (
                                        <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-right-8 duration-300">
                                            <h4 className="text-base md:text-lg font-bold text-foreground">Check Your Understanding</h4>
                                            <p className="text-base md:text-lg text-foreground leading-relaxed">{lessonData.quiz.question}</p>

                                            <div className="space-y-2">
                                                {lessonData.quiz.options.map((option, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setQuizSelected(idx)}
                                                        className={`w-full p-3 md:p-4 rounded-xl border text-left transition-all text-sm md:text-base ${quizSelected === idx
                                                            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                                            : 'border-border hover:bg-secondary/50'
                                                            }`}
                                                    >
                                                        <span className="font-bold mr-2 text-muted-foreground">{String.fromCharCode(65 + idx)}.</span>
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Proper submit button */}
                                            <button
                                                onClick={handleQuizSubmit}
                                                disabled={quizSelected === null}
                                                className="w-full py-2.5 md:py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                                            >
                                                Submit Answer
                                            </button>
                                        </div>
                                    )}

                                    {/* Feedback State - Show result with Next/Retry buttons */}
                                    {lessonState === 'feedback' && lessonData && (
                                        <div className="text-center py-6 md:py-8 animate-in zoom-in-95 duration-300">
                                            {isCorrect ? (
                                                <>
                                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                                                        <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <h3 className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 mb-2">Correct!</h3>
                                                    <p className="text-sm md:text-base text-muted-foreground mb-5 md:mb-6 px-2">
                                                        {lessonData.quiz.explanation}
                                                    </p>
                                                    {/* Always show Next button after correct answer */}
                                                    <div className="flex gap-2 md:gap-3 w-full">
                                                        <button
                                                            onClick={handleCloseModal}
                                                            className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-colors text-sm md:text-base"
                                                        >
                                                            Finish
                                                        </button>
                                                        <button
                                                            onClick={() => handleNext()}
                                                            className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                                                        >
                                                            Next <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                                                        <X className="w-8 h-8 md:w-10 md:h-10 text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <h3 className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Not quite...</h3>
                                                    <p className="text-sm md:text-base text-foreground font-medium mb-1">Correct Answer:</p>
                                                    <p className="text-sm md:text-base text-muted-foreground mb-5 md:mb-6 px-2">
                                                        <span className="font-semibold text-foreground">{String.fromCharCode(65 + getCorrectIndex(lessonData.quiz))}. {lessonData.quiz.options[getCorrectIndex(lessonData.quiz)]}</span>
                                                        <br />
                                                        <span className="text-xs md:text-sm italic mt-2 block">{lessonData.quiz.explanation}</span>
                                                    </p>
                                                    {/* Give options to retry current or move to next */}
                                                    <div className="flex gap-2 md:gap-3 w-full">
                                                        <button
                                                            onClick={handleRetry}
                                                            className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/80 transition-colors text-sm md:text-base"
                                                        >
                                                            Try Again
                                                        </button>
                                                        <button
                                                            onClick={() => handleNext()}
                                                            className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm md:text-base"
                                                        >
                                                            Next <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Completed State - Show session summary */}
                                    {lessonState === 'completed' && (
                                        <div className="text-center py-6 md:py-8">
                                            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                                                <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-white" />
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">Lesson Complete!</h3>
                                            <div className="bg-secondary/30 rounded-xl p-4 md:p-6 my-4 md:my-6 space-y-2 md:space-y-3">
                                                <div className="flex justify-between items-center text-sm md:text-base">
                                                    <span className="text-muted-foreground">Questions Answered:</span>
                                                    <span className="font-bold text-foreground">{lessonSession.attemptCount}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm md:text-base">
                                                    <span className="text-muted-foreground">Correct:</span>
                                                    <span className="font-bold text-green-600 dark:text-green-400">
                                                        {lessonSession.correctCount} ({Math.round((lessonSession.correctCount / lessonSession.attemptCount) * 100)}%)
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm md:text-base">
                                                    <span className="text-muted-foreground">Total Time:</span>
                                                    <span className="font-bold text-foreground">
                                                        {Math.round(lessonSession.totalTime / 1000)}s
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleCloseModal}
                                                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:brightness-110 transition-all text-sm md:text-base"
                                            >
                                                Back to Concepts
                                            </button>
                                        </div>
                                    )}

                                    {/* Idle State - Default Overview */}
                                    {lessonState === 'idle' && (
                                        <>
                                            {/* Action Button */}
                                            <div className="mb-4 md:mb-5">
                                                {isLocked(selectedConcept) ? (
                                                    <div className="w-full py-2.5 md:py-3 bg-secondary/50 border border-secondary text-muted-foreground rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-sm md:text-base">
                                                        <Lock className="w-4 h-4 md:w-5 md:h-5" />
                                                        <span>Locked - Master Prerequisites First</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={handleStartLesson}
                                                        className="w-full py-2.5 md:py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                                                    >
                                                        <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                                                        Start Interactive Lesson
                                                    </button>
                                                )}
                                            </div>

                                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4 md:mb-5">
                                                {selectedConcept.description}
                                            </p>

                                            <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                                                <div className="bg-secondary/20 p-3 md:p-4 rounded-xl">
                                                    <h4 className="text-xs md:text-sm font-bold text-foreground mb-2 md:mb-3 flex items-center gap-2">
                                                        <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                                                        Prerequisites
                                                    </h4>
                                                    <div className="space-y-1.5 md:space-y-2">
                                                        {findPrerequisites(knowledgeGraph, selectedConcept.id).length > 0 ? (
                                                            findPrerequisites(knowledgeGraph, selectedConcept.id).map((p) => (
                                                                <div key={p.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border text-xs md:text-sm">
                                                                    <span className="font-medium text-foreground truncate pr-2">{p.name}</span>
                                                                    <span className={`${getMasteryColor(p.mastery)} font-bold whitespace-nowrap`}>{Math.round(p.mastery)}%</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-xs md:text-sm text-muted-foreground italic px-2">None required</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="bg-secondary/20 p-3 md:p-4 rounded-xl">
                                                    <h4 className="text-xs md:text-sm font-bold text-foreground mb-2 md:mb-3 flex items-center gap-2">
                                                        <Lightbulb className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
                                                        Unlocks Next
                                                    </h4>
                                                    <div className="space-y-1.5 md:space-y-2">
                                                        {findDependents(knowledgeGraph, selectedConcept.id).length > 0 ? (
                                                            findDependents(knowledgeGraph, selectedConcept.id).map((d) => (
                                                                <div key={d.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border text-xs md:text-sm">
                                                                    <span className="font-medium text-foreground truncate pr-2">{d.name}</span>
                                                                    <span className={`${getMasteryColor(d.mastery)} font-bold whitespace-nowrap`}>{Math.round(d.mastery)}%</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-xs md:text-sm text-muted-foreground italic px-2">End of path</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}