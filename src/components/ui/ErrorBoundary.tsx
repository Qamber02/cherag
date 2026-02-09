import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    className?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={`flex flex-col items-center justify-center p-6 text-center bg-red-50/10 rounded-xl border border-red-500/20 ${this.props.className || ''}`}>
                    <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                    <h3 className="text-lg font-bold text-red-500 mb-1">Something went wrong</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-[250px] mx-auto">
                        {this.state.error?.message || 'A playback error occurred'}
                    </p>
                    <button
                        type="button"
                        onClick={() => this.setState({ hasError: false, error: undefined })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
