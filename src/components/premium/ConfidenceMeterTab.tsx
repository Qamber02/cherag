// Confidence Meter Tab
// Real-time knowledge confidence tracking with spaced repetition scheduling

import { useState, useEffect } from 'react';
import {
    Gauge,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    Clock,
    RefreshCw,
    Loader2,
    ChevronRight,
    Zap,
    Target
} from 'lucide-react';
import {
    getDueForReview,
    getUserMastery,
    type LearningSession
} from '../../lib/premium';

interface ConfidenceMeterTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

interface TopicConfidence {
    id: string;
    name: string;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    lastReviewed: Date | null;
    dueForReview: boolean;
    reviewsCount: number;
}

export default function ConfidenceMeterTab({
    userId,
    context: _context,
    hasContext,
}: ConfidenceMeterTabProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [overallConfidence, setOverallConfidence] = useState(0);
    const [topics, setTopics] = useState<TopicConfidence[]>([]);
    const [dueReviews, setDueReviews] = useState<LearningSession[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<TopicConfidence | null>(null);

    useEffect(() => {
        loadConfidenceData();
    }, [userId]);

    const loadConfidenceData = async () => {
        setIsLoading(true);
        try {
            // Get mastery levels
            const mastery = await getUserMastery(userId);

            // Get due reviews
            const due = await getDueForReview(userId);
            setDueReviews(due);

            // Convert to topic confidence
            const topicsList: TopicConfidence[] = Object.entries(mastery).map(([id, score]) => ({
                id,
                name: id.replace(/_/g, ' '),
                confidence: score,
                trend: score > 50 ? 'up' : score < 30 ? 'down' : 'stable',
                lastReviewed: null,
                dueForReview: due.some(d => d.conceptId === id),
                reviewsCount: 0,
            }));

            setTopics(topicsList);

            // Calculate overall
            const total = topicsList.reduce((sum, t) => sum + t.confidence, 0);
            setOverallConfidence(topicsList.length > 0 ? Math.round(total / topicsList.length) : 0);
        } catch (err) {
            console.error('Failed to load confidence data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
        if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 80) return 'text-emerald-500';
        if (confidence >= 60) return 'text-green-500';
        if (confidence >= 40) return 'text-amber-500';
        if (confidence >= 20) return 'text-orange-500';
        return 'text-red-500';
    };

    const getConfidenceGradient = (confidence: number): string => {
        if (confidence >= 80) return 'from-emerald-500 to-green-500';
        if (confidence >= 60) return 'from-green-500 to-lime-500';
        if (confidence >= 40) return 'from-amber-500 to-yellow-500';
        if (confidence >= 20) return 'from-orange-500 to-amber-500';
        return 'from-red-500 to-orange-500';
    };

    // Empty state
    if (!hasContext && topics.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                    <Gauge className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-foreground">Confidence Meter</h2>
                <p className="text-muted-foreground max-w-md">
                    Track your knowledge confidence across topics. Complete quizzes and flashcards
                    to build your confidence profile.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header with Overall Gauge */}
            <div className="p-4 md:p-6 border-b border-border shrink-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <Gauge className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Confidence Meter</h1>
                            <p className="text-sm text-muted-foreground">
                                {topics.length} topics tracked • {dueReviews.length} due for review
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={loadConfidenceData}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Overall Confidence Gauge */}
                <div className="flex items-center gap-8">
                    <div className="relative w-32 h-32">
                        {/* Background circle */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-secondary"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="url(#confidence-gradient)"
                                strokeWidth="8"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${overallConfidence * 3.52} 352`}
                                className="transition-all duration-1000"
                            />
                            <defs>
                                <linearGradient id="confidence-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-3xl font-bold ${getConfidenceColor(overallConfidence)}`}>
                                {overallConfidence}%
                            </span>
                            <span className="text-xs text-muted-foreground">Overall</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Strong Topics</span>
                            <span className="text-sm font-medium text-emerald-500">
                                {topics.filter(t => t.confidence >= 70).length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Developing</span>
                            <span className="text-sm font-medium text-amber-500">
                                {topics.filter(t => t.confidence >= 40 && t.confidence < 70).length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Need Attention</span>
                            <span className="text-sm font-medium text-red-500">
                                {topics.filter(t => t.confidence < 40).length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Due for Review Banner */}
            {dueReviews.length > 0 && (
                <div className="mx-4 md:mx-6 mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        <div className="flex-1">
                            <span className="font-medium text-foreground">
                                {dueReviews.length} topic{dueReviews.length > 1 ? 's' : ''} due for review
                            </span>
                            <p className="text-sm text-muted-foreground">
                                Review now to maintain your confidence levels
                            </p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                            <Zap className="w-4 h-4" />
                            Start Review
                        </button>
                    </div>
                </div>
            )}

            {/* Topic List */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : topics.length === 0 ? (
                    <div className="text-center py-12">
                        <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">No Topics Yet</h3>
                        <p className="text-muted-foreground">
                            Complete some quizzes or flashcard sessions to start tracking your confidence.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {topics
                            .sort((a, b) => {
                                // Due for review first, then by confidence (lowest first)
                                if (a.dueForReview !== b.dueForReview) {
                                    return a.dueForReview ? -1 : 1;
                                }
                                return a.confidence - b.confidence;
                            })
                            .map((topic) => (
                                <div
                                    key={topic.id}
                                    onClick={() => setSelectedTopic(topic)}
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${topic.dueForReview
                                        ? 'border-amber-500/30 bg-amber-500/5'
                                        : 'border-border bg-card hover:border-primary/50'
                                        }`}
                                >
                                    {/* Confidence Bar */}
                                    <div className="relative w-14 h-14 shrink-0">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="28"
                                                cy="28"
                                                r="24"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                                className="text-secondary"
                                            />
                                            <circle
                                                cx="28"
                                                cy="28"
                                                r="24"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeDasharray={`${topic.confidence * 1.51} 151`}
                                                className={getConfidenceColor(topic.confidence)}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className={`text-sm font-bold ${getConfidenceColor(topic.confidence)}`}>
                                                {Math.round(topic.confidence)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Topic Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground capitalize truncate">
                                                {topic.name}
                                            </span>
                                            {topic.dueForReview && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                    Due
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                {getTrendIcon(topic.trend)}
                                                {topic.trend}
                                            </span>
                                            {topic.lastReviewed && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(topic.lastReviewed).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-24 hidden md:block">
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r ${getConfidenceGradient(topic.confidence)} transition-all duration-500`}
                                                style={{ width: `${topic.confidence}%` }}
                                            />
                                        </div>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Detail Panel */}
            {selectedTopic && (
                <div className="border-t border-border p-4 md:p-6 bg-card shrink-0">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-foreground capitalize">{selectedTopic.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                Confidence: {Math.round(selectedTopic.confidence)}%
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedTopic(null)}
                            className="text-muted-foreground hover:text-foreground text-xl"
                        >
                            ×
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-foreground">{selectedTopic.reviewsCount}</div>
                            <div className="text-xs text-muted-foreground">Total Reviews</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                                {getTrendIcon(selectedTopic.trend)}
                                <span className="text-lg font-bold text-foreground capitalize">{selectedTopic.trend}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Trend</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-foreground">
                                {selectedTopic.dueForReview ? 'Now' : '3d'}
                            </div>
                            <div className="text-xs text-muted-foreground">Next Review</div>
                        </div>
                    </div>

                    <button className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                        Practice This Topic
                    </button>
                </div>
            )}
        </div>
    );
}
