import { useState, useRef, useEffect } from 'react';
import { FileText, Loader2, Edit3, Check, Sliders, Copy, Download, ChevronDown, FileDown, ArrowUp, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { downloadAsMarkdown, downloadAsPDF, downloadAsDOCX } from '../lib/downloadUtils';

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
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);
    const [options, setOptions] = useState<SummaryOptions>({
        length: 'medium',
        style: 'mixed',
        focus: ''
    });
    const [showBackToTop, setShowBackToTop] = useState(false);
    const summaryContentRef = useRef<HTMLDivElement>(null);

    // Close download menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setShowDownloadMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle scroll to show/hide back to top button
    useEffect(() => {
        const scrollEl = summaryContentRef.current;
        if (!scrollEl) return;

        const handleScroll = () => {
            setShowBackToTop(scrollEl.scrollTop > 200);
        };

        scrollEl.addEventListener('scroll', handleScroll);
        return () => scrollEl.removeEventListener('scroll', handleScroll);
    }, [summary]);

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
        <div className="flex flex-col h-full p-2 md:p-6 overflow-y-auto">
            {/* Header - stacks on mobile */}
            <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-center md:justify-between md:mb-6 shrink-0 relative">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white px-1">Document Summary</h2>
                <div className="flex flex-wrap items-center gap-2 px-1">
                    {summary && !isEditing && (
                        <>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(summary);
                                    // Could add toast notification here
                                }}
                                className="p-2.5 md:p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors active:scale-95 touch-manipulation"
                                title="Copy to clipboard"
                            >
                                <Copy className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                            {/* Download Dropdown */}
                            <div className="relative" ref={downloadMenuRef}>
                                <button
                                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                    className="flex items-center gap-1 p-2.5 md:p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors active:scale-95 touch-manipulation"
                                    title="Download summary"
                                >
                                    <Download className="w-5 h-5 md:w-4 md:h-4" />
                                    <ChevronDown className="w-4 h-4 md:w-3 md:h-3" />
                                </button>

                                {showDownloadMenu && (
                                    <div className="absolute right-0 top-full mt-1 w-48 glass rounded-xl shadow-xl border border-white/20 py-2 z-50 animate-fade-in backdrop-blur-xl">
                                        <button
                                            onClick={() => {
                                                downloadAsMarkdown(summary, 'summary');
                                                setShowDownloadMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 md:py-2 text-left text-sm text-foreground hover:bg-white/10 transition-colors"
                                        >
                                            <FileDown className="w-4 h-4 text-gray-400" />
                                            <span>Markdown (.md)</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                downloadAsDOCX(summary, 'summary');
                                                setShowDownloadMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 md:py-2 text-left text-sm text-foreground hover:bg-white/10 transition-colors"
                                        >
                                            <FileDown className="w-4 h-4 text-blue-500" />
                                            <span>Word (.docx)</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                downloadAsPDF(summary, 'summary');
                                                setShowDownloadMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 md:py-2 text-left text-sm text-foreground hover:bg-white/10 transition-colors"
                                        >
                                            <FileDown className="w-4 h-4 text-red-500" />
                                            <span>PDF (.pdf)</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleStartEdit}
                                className="flex items-center space-x-1 md:space-x-2 px-3 py-2.5 md:py-2 bg-white/10 hover:bg-white/20 text-foreground rounded-lg transition-colors text-sm active:scale-95 touch-manipulation border border-white/10"
                            >
                                <Edit3 className="w-4 h-4" />
                                <span className="hidden sm:inline">Edit</span>
                            </button>
                        </>
                    )}
                    {hasUnknownContext && (
                        <div>
                            <button
                                onClick={() => setShowOptions(!showOptions)}
                                className="flex items-center space-x-2 px-3 py-2.5 md:py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors active:scale-95 touch-manipulation"
                            >
                                <Sliders className="w-4 h-4" />
                            </button>

                            {/* Options Dropdown - Anchored to Header Right */}
                            {showOptions && (
                                <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2.5rem)] glass rounded-xl shadow-xl border border-white/20 p-4 z-50 origin-top-right backdrop-blur-xl">
                                    <h4 className="font-semibold text-foreground mb-3">Customize Summary</h4>

                                    {/* Length Option */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Length</label>
                                        <div className="flex gap-2">
                                            {(['short', 'medium', 'detailed'] as const).map((len) => (
                                                <button
                                                    key={len}
                                                    onClick={() => setOptions({ ...options, length: len })}
                                                    className={`flex-1 px-2 py-2.5 md:py-1.5 rounded-lg text-sm capitalize transition-colors touch-manipulation border ${options.length === len
                                                        ? 'bg-primary text-white border-primary shadow-warm-glow'
                                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                                                        }`}
                                                >
                                                    {len}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Style Option */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Format</label>
                                        <div className="flex gap-2">
                                            {(['bullet', 'paragraph', 'mixed'] as const).map((style) => (
                                                <button
                                                    key={style}
                                                    onClick={() => setOptions({ ...options, style })}
                                                    className={`flex-1 px-2 py-2.5 md:py-1.5 rounded-lg text-sm capitalize transition-colors touch-manipulation border ${options.style === style
                                                        ? 'bg-primary text-white border-primary shadow-warm-glow'
                                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                                                        }`}
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Focus Area */}
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Focus Area (optional)</label>
                                        <input
                                            type="text"
                                            value={options.focus}
                                            onChange={(e) => setOptions({ ...options, focus: e.target.value })}
                                            placeholder="e.g., key concepts, definitions..."
                                            className="w-full px-3 py-2.5 md:py-2 rounded-lg bg-white/5 text-foreground border border-white/10 focus:ring-2 focus:ring-primary/50 outline-none text-sm placeholder:text-muted-foreground/50"
                                        />
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-primary text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors active:scale-95 touch-manipulation shadow-warm-glow"
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
                            className="flex items-center space-x-1 md:space-x-2 px-4 py-2.5 md:px-4 md:py-2 bg-primary text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm active:scale-95 touch-manipulation font-medium shadow-warm-glow"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            <span className="hidden sm:inline">{summary ? 'Regenerate' : 'Generate'} Summary</span>
                            <span className="sm:hidden">{summary ? 'Redo' : 'Go'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 glass-card p-4 md:p-8 relative overflow-hidden group">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
                            <Loader2 className="w-10 h-10 animate-spin text-blue-500 relative z-10" />
                        </div>
                        <p className="text-lg font-medium animate-pulse">Synthesizing document insights...</p>
                    </div>
                ) : isEditing ? (
                    <div className="flex flex-col h-full animate-fade-in">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-zinc-700 pb-4">
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <Edit3 className="w-4 h-4" /> Editing Mode
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-all hover:shadow-md flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> Save Changes
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={editedSummary}
                            onChange={(e) => setEditedSummary(e.target.value)}
                            className="flex-1 w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-900/50 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none font-mono text-sm leading-relaxed transition-all"
                            placeholder="Type your summary improvements here..."
                            autoFocus
                        />
                    </div>
                ) : summary ? (
                    <div ref={summaryContentRef} className="h-full overflow-y-auto pr-2 custom-scrollbar relative" id="summary-content">
                        {/* Reading Stats */}
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-zinc-700">
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3.5 h-3.5" />
                                ~{Math.ceil(summary.split(/\s+/).length / 200)} min read
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {summary.split(/\s+/).length.toLocaleString()} words
                            </span>
                        </div>

                        <article className="prose prose-sm md:prose-lg prose-slate dark:prose-invert max-w-none 
                            prose-headings:font-bold prose-headings:tracking-tight 
                            prose-h1:text-2xl md:prose-h1:text-3xl prose-h2:text-xl md:prose-h2:text-2xl 
                            prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-300
                            prose-li:text-gray-600 dark:prose-li:text-gray-300
                            prose-strong:text-gray-900 dark:prose-strong:text-white"
                        >
                            <ReactMarkdown>{summary}</ReactMarkdown>
                        </article>

                        {/* Back to Top Button - Positioned above bottom nav on mobile */}
                        <button
                            onClick={() => summaryContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                            className={`fixed bottom-24 right-6 md:absolute md:bottom-4 md:right-4 w-10 h-10 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:shadow-xl transition-all z-10 ${showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                            title="Back to top"
                            type="button"
                        >
                            <ArrowUp className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Ready to Summarize</h3>
                        <p className="text-muted-foreground max-w-sm">
                            Generate a concise summary of your uploaded documents to grasp key concepts quickly.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
