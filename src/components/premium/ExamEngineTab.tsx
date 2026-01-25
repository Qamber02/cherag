// Exam Engine Tab
// Exam probability calculation and simulation controls

import { useState } from 'react';
import {
    Target,
    Zap,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Play,
    FileText,
    Loader2,
    TrendingUp,
} from 'lucide-react';
import {
    analyzeSyllabus,
    calculateExamReadiness,
    getUserMastery,
    generateExamQuestions,
} from '../../lib/premium';

import type {
    SyllabusAnalysisResult,
    ReadinessResult,
    ExamQuestion,
} from '../../lib/premium';

import ExamSimulator from './ExamSimulator';

interface ExamEngineTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

export default function ExamEngineTab({
    userId,
    context,
    hasContext,
}: ExamEngineTabProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false); // separate loading for simulation
    const [syllabus, setSyllabus] = useState<SyllabusAnalysisResult | null>(null);
    const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
    const [mode, setMode] = useState<'probability' | 'simulation' | 'stress-test'>('probability');
    const [examDays, setExamDays] = useState(7);
    const [examHours, setExamHours] = useState(2);

    // Exam Simulation State
    const [isTakingExam, setIsTakingExam] = useState(false);
    const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);

    const analyzeExamContent = async () => {
        if (!context.trim()) return;

        setIsLoading(true);
        try {
            // Analyze syllabus/content
            const syllabusResult = await analyzeSyllabus(context);
            setSyllabus(syllabusResult);

            // Get user mastery and calculate readiness
            const mastery = await getUserMastery(userId);
            const readinessResult = await calculateExamReadiness(syllabusResult, mastery);
            setReadiness(readinessResult);
        } catch (err: any) {
            console.error('Exam analysis failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const startSimulation = async () => {
        if (!syllabus) return;

        setIsGenerating(true);
        try {
            const topicNames = syllabus.topics.map(t => t.name);
            // Default to 20 questions for a standard simulation
            const questions = await generateExamQuestions(topicNames, 20, 'mixed');
            setExamQuestions(questions);
            setIsTakingExam(true);
        } catch (error) {
            console.error('Failed to generate exam:', error);
            // Ideally show toast error here
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExamComplete = (score: number, answers: any) => {
        console.log('Exam completed with score:', score);
        setIsTakingExam(false);
        // Here we could save the result to DB/history
    };

    const getReadinessColor = (probability: number): string => {
        if (probability >= 80) return 'text-emerald-500';
        if (probability >= 60) return 'text-green-500';
        if (probability >= 40) return 'text-amber-500';
        return 'text-red-500';
    };

    const getStatusBadge = (status: 'ready' | 'needs_work' | 'at_risk') => {
        const styles = {
            ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            needs_work: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            at_risk: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return styles[status];
    };

    // Render Exam Simulator View
    if (isTakingExam && examQuestions.length > 0) {
        return (
            <ExamSimulator
                questions={examQuestions}
                durationMinutes={examHours * 60}
                onComplete={handleExamComplete}
                onCancel={() => setIsTakingExam(false)}
            />
        );
    }

    // Empty state
    if (!hasContext) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mb-6 shadow-lg">
                    <Target className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-foreground">Exam Engine</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                    Upload your syllabus or study materials to predict your exam success
                    and generate realistic practice exams.
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Supports PDF, DOCX, and text files</span>
                </div>
            </div>
        );
    }

    // No analysis yet
    if (!syllabus && !readiness) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mb-6 shadow-lg">
                    <Target className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-foreground">Analyze Your Exam</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                    We'll analyze your study materials to predict exam success probability
                    and create a personalized study plan.
                </p>

                <div className="w-full max-w-md space-y-4 mb-6">
                    <div className="flex items-center gap-4">
                        <label className="text-sm text-muted-foreground w-32">Days until exam:</label>
                        <input
                            type="number"
                            value={examDays}
                            onChange={(e) => setExamDays(parseInt(e.target.value) || 7)}
                            className="flex-1 px-4 py-2 bg-secondary rounded-lg border border-border text-foreground"
                            min={1}
                            max={365}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-sm text-muted-foreground w-32">Exam duration:</label>
                        <input
                            type="number"
                            value={examHours}
                            onChange={(e) => setExamHours(parseInt(e.target.value) || 2)}
                            className="flex-1 px-4 py-2 bg-secondary rounded-lg border border-border text-foreground"
                            min={1}
                            max={8}
                        />
                        <span className="text-sm text-muted-foreground">hours</span>
                    </div>
                </div>

                <button
                    onClick={analyzeExamContent}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Zap className="w-5 h-5" />
                            Analyze Exam Content
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">
                                {syllabus?.exam_title || 'Exam Engine'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {syllabus?.total_topics} topics • {examDays} days remaining
                            </p>
                        </div>
                    </div>

                    {readiness && (
                        <div className="text-right">
                            <div className={`text-4xl font-bold ${getReadinessColor(readiness.overall_probability)}`}>
                                {readiness.overall_probability}%
                            </div>
                            <div className="text-sm text-muted-foreground">Success Probability</div>
                        </div>
                    )}
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-2">
                    {[
                        { id: 'probability', label: 'Probability', icon: TrendingUp },
                        { id: 'simulation', label: 'Simulation', icon: Play },
                        { id: 'stress-test', label: 'Stress Test', icon: Zap },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setMode(id as any)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${mode === id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary hover:bg-secondary/80 text-foreground'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
                {mode === 'probability' && readiness && (
                    <div className="space-y-6">
                        {/* Confidence Interval */}
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="font-medium text-foreground mb-3">Success Probability Range</h3>
                            <div className="flex items-center gap-4">
                                <div className="text-2xl font-bold text-muted-foreground">
                                    {readiness.confidence_interval[0]}%
                                </div>
                                <div className="flex-1 h-4 bg-secondary rounded-full relative overflow-hidden">
                                    <div
                                        className="absolute h-full bg-gradient-to-r from-amber-500 via-green-500 to-emerald-500"
                                        style={{
                                            left: `${readiness.confidence_interval[0]}%`,
                                            width: `${readiness.confidence_interval[1] - readiness.confidence_interval[0]}%`,
                                        }}
                                    />
                                    <div
                                        className="absolute h-full w-1 bg-foreground"
                                        style={{ left: `${readiness.overall_probability}%` }}
                                    />
                                </div>
                                <div className="text-2xl font-bold text-muted-foreground">
                                    {readiness.confidence_interval[1]}%
                                </div>
                            </div>
                        </div>

                        {/* Topic Readiness */}
                        <div>
                            <h3 className="font-medium text-foreground mb-3">Topic Readiness</h3>
                            <div className="space-y-3">
                                {readiness.topic_readiness.map((topic, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-foreground">{topic.topic}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(topic.status)}`}>
                                                    {topic.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({Math.round(topic.weight * 100)}% weight)
                                                </span>
                                            </div>
                                            {topic.weak_concepts.length > 0 && (
                                                <p className="text-sm text-muted-foreground">
                                                    Weak areas: {topic.weak_concepts.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="w-24">
                                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${topic.status === 'ready' ? 'bg-emerald-500' :
                                                        topic.status === 'needs_work' ? 'bg-amber-500' : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${topic.readiness}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-right mt-1 text-muted-foreground">
                                                {Math.round(topic.readiness)}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Critical Gaps */}
                        {readiness.critical_gaps.length > 0 && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    <h3 className="font-medium text-foreground">Critical Gaps</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {readiness.critical_gaps.map((gap, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm"
                                        >
                                            {gap}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Time Recommendation */}
                        <div className="bg-card border border-border rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-5 h-5 text-primary" />
                                <h3 className="font-medium text-foreground">Time Recommendation</h3>
                            </div>
                            <p className="text-muted-foreground">{readiness.time_recommendation}</p>
                        </div>
                    </div>
                )}

                {mode === 'simulation' && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg">
                            <Play className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-foreground">Exam Simulation</h2>
                        <p className="text-muted-foreground max-w-md mb-6">
                            Take a timed practice exam under realistic conditions.
                            AI will generate questions based on your study materials.
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-6 w-full max-w-md">
                            <div className="bg-card border border-border rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{syllabus?.total_topics || 0}</div>
                                <div className="text-xs text-muted-foreground">Topics</div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">{examHours * 60}</div>
                                <div className="text-xs text-muted-foreground">Minutes</div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-foreground">20</div>
                                <div className="text-xs text-muted-foreground">Questions</div>
                            </div>
                        </div>

                        <button
                            onClick={startSimulation}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Play className="w-6 h-6" />
                                    Start Simulation
                                </>
                            )}
                        </button>
                    </div>
                )}

                {mode === 'stress-test' && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-6 shadow-lg">
                            <Zap className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-foreground">Concept Stress Test</h2>
                        <p className="text-muted-foreground max-w-md mb-6">
                            Challenge your weakest concepts with progressively harder questions
                            until you achieve mastery.
                        </p>

                        {readiness?.critical_gaps && readiness.critical_gaps.length > 0 ? (
                            <div className="w-full max-w-md space-y-3 mb-6">
                                <h3 className="text-sm font-medium text-muted-foreground">Select a concept to stress test:</h3>
                                {readiness.critical_gaps.map((gap, index) => (
                                    <button
                                        key={index}
                                        className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary transition-colors"
                                    >
                                        <span className="font-medium text-foreground">{gap}</span>
                                        <Zap className="w-5 h-5 text-orange-500" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <p className="text-foreground">No critical gaps to stress test!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
