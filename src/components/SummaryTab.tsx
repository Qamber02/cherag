import { useState } from 'react';
import { FileText, Loader2, Edit3, Check, X, Sliders } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SummaryTabProps {
    summary: string;
    isLoading: boolean;
    onGenerate: (options?: SummaryOptions) => void;
    onUpdateSummary: (newSummary: string) => void;
    hasUnknownContext: boolean;
}

export interface SummaryOptions {
    length: 'short' | 'medium' | 'detailed';
    style: 'bullet' | 'paragraph' | 'mixed';
    focus?: string;
}

export default function SummaryTab({ summary, isLoading, onGenerate, onUpdateSummary, hasUnknownContext }: SummaryTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedSummary, setEditedSummary] = useState(summary);
    const [showOptions, setShowOptions] = useState(false);
    const [options, setOptions] = useState<SummaryOptions>({
        length: 'medium',
        style: 'mixed',
        focus: ''
    });

    const handleStartEdit = () => {
        setEditedSummary(summary);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        onUpdateSummary(editedSummary);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedSummary(summary);
        setIsEditing(false);
    };

    const handleGenerate = () => {
        onGenerate(options);
        setShowOptions(false);
    };

    return (
        <div className="flex flex-col h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Document Summary</h2>
                <div className="flex items-center gap-2">
                    {summary && !isEditing && (
                        <button
                            onClick={handleStartEdit}
                            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                        >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                    )}
                    {hasUnknownContext && (
                        <div className="relative">
                            <button
                                onClick={() => setShowOptions(!showOptions)}
                                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                            >
                                <Sliders className="w-4 h-4" />
                            </button>

                            {/* Options Dropdown */}
                            {showOptions && (
                                <div className="absolute right-0 top-12 w-72 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 p-4 z-50">
                                    <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Customize Summary</h4>

                                    {/* Length Option */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Length</label>
                                        <div className="flex gap-2">
                                            {(['short', 'medium', 'detailed'] as const).map((len) => (
                                                <button
                                                    key={len}
                                                    onClick={() => setOptions({ ...options, length: len })}
                                                    className={`flex-1 px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${options.length === len
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-600'
                                                        }`}
                                                >
                                                    {len}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Style Option */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Format</label>
                                        <div className="flex gap-2">
                                            {(['bullet', 'paragraph', 'mixed'] as const).map((style) => (
                                                <button
                                                    key={style}
                                                    onClick={() => setOptions({ ...options, style })}
                                                    className={`flex-1 px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${options.style === style
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-600'
                                                        }`}
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Focus Area */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Focus Area (optional)</label>
                                        <input
                                            type="text"
                                            value={options.focus}
                                            onChange={(e) => setOptions({ ...options, focus: e.target.value })}
                                            placeholder="e.g., key concepts, definitions..."
                                            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 border-none outline-none text-sm"
                                        />
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                        <span>Generate Summary</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {hasUnknownContext && (
                        <button
                            onClick={() => onGenerate()}
                            disabled={isLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            <span>{summary ? 'Regenerate' : 'Generate'} Summary</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                        <p>Analyzing documents...</p>
                    </div>
                ) : isEditing ? (
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Editing summary...</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                >
                                    <Check className="w-4 h-4" />
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 text-sm"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={editedSummary}
                            onChange={(e) => setEditedSummary(e.target.value)}
                            className="flex-1 w-full p-4 rounded-lg bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 outline-none resize-none font-mono text-sm leading-relaxed"
                            placeholder="Edit your summary here..."
                        />
                    </div>
                ) : summary ? (
                    <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-800 dark:prose-strong:text-white prose-li:text-gray-700 dark:prose-li:text-gray-300">
                        <ReactMarkdown>{summary}</ReactMarkdown>
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
