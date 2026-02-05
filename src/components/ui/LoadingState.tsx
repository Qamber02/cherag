import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface LoadingStateProps {
    message?: string;
    icon?: LucideIcon;
    variant?: 'inline' | 'fullscreen' | 'card';
}

export function LoadingState({
    message = 'Loading...',
    icon: Icon = Loader2,
    variant = 'card'
}: LoadingStateProps) {
    if (variant === 'inline') {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="w-4 h-4 animate-spin" />
                <span className="text-sm">{message}</span>
            </div>
        );
    }

    if (variant === 'fullscreen') {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                        <Icon className="w-12 h-12 animate-spin text-primary relative z-10" />
                    </div>
                    <p className="text-lg font-medium text-foreground animate-pulse">{message}</p>
                </div>
            </div>
        );
    }

    // Default: card variant
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="relative mb-4">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Icon className="w-10 h-10 animate-spin text-primary relative z-10" />
            </div>
            <p className="text-base font-medium text-muted-foreground animate-pulse">{message}</p>
        </div>
    );
}

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'secondary';
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20 animate-float">
                <Icon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>

            {(action || secondaryAction) && (
                <div className="flex flex-col sm:flex-row gap-3">
                    {action && (
                        <button
                            onClick={action.onClick}
                            className={`px-6 py-3 font-medium rounded-xl transition-all active:scale-95 ${action.variant === 'secondary'
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl'
                                }`}
                        >
                            {action.label}
                        </button>
                    )}
                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                        >
                            {secondaryAction.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
