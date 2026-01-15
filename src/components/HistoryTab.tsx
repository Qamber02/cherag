import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { History, FileText, Layers, FileQuestion, Play, MessageSquare, Clock } from 'lucide-react';

interface ActivityItem {
    id: string;
    activity_type: string;
    title: string;
    content_preview: string;
    created_at: string;
}

interface HistoryTabProps {
    userId: string;
}

const activityIcons: Record<string, any> = {
    summary: FileText,
    flashcard: Layers,
    quiz: FileQuestion,
    video: Play,
    chat: MessageSquare,
};

const activityColors: Record<string, string> = {
    summary: 'from-blue-400 to-cyan-500',
    flashcard: 'from-amber-400 to-orange-500',
    quiz: 'from-purple-400 to-pink-500',
    video: 'from-red-400 to-rose-500',
    chat: 'from-green-400 to-emerald-500',
};

export default function HistoryTab({ userId }: HistoryTabProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        fetchActivities();
    }, [userId, filter]);

    const fetchActivities = async () => {
        // Only show full loading on initial load, not on filter change
        if (isInitialLoad) {
            setIsLoading(true);
        }

        let query = supabase
            .from('activity_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (filter !== 'all') {
            query = query.eq('activity_type', filter);
        }

        const { data } = await query;
        setActivities(data || []);
        setIsLoading(false);
        setIsInitialLoad(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const filters = ['all', 'summary', 'flashcard', 'quiz', 'video', 'chat'];

    // Empty State
    if (!isLoading && activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mb-6">
                    <History className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Activity History</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                    Your study activity will appear here. Start by generating flashcards, quizzes, or summaries!
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Activity History</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activities.length} activities</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === f
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-y-auto space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    activities.map((activity) => {
                        const Icon = activityIcons[activity.activity_type] || FileText;
                        const gradient = activityColors[activity.activity_type] || 'from-gray-400 to-gray-500';

                        return (
                            <div
                                key={activity.id}
                                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {activity.title || activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                            </span>
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(activity.created_at)}
                                            </span>
                                        </div>
                                        {activity.content_preview && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                                {activity.content_preview}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
