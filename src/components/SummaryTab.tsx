
import { FileText, Loader2 } from 'lucide-react';

interface SummaryTabProps {
    summary: string;
    isLoading: boolean;
    onGenerate: () => void;
    hasUnknownContext: boolean;
}

export default function SummaryTab({ summary, isLoading, onGenerate, hasUnknownContext }: SummaryTabProps) {
    return (
        <div className="flex flex-col h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Document Summary</h2>
                {hasUnknownContext && (
                    <button
                        onClick={onGenerate}
                        disabled={isLoading}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        <span>{summary ? 'Regenerate' : 'Generate'} Summary</span>
                    </button>
                )}
            </div>

            <div className="flex-1 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                        <p>Analyzing documents...</p>
                    </div>
                ) : summary ? (
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                        {summary}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <p>Upload documents and click Generate to see a summary.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
