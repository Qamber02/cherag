import { useState, useRef, useEffect } from 'react';
import { FileText, Loader2, Edit3, Check, Sliders, Copy, Download, ChevronDown, FileDown, X } from 'lucide-react';
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
    const optionsMenuRef = useRef<HTMLDivElement>(null);
    const [options, setOptions] = useState<SummaryOptions>({
        length: 'medium',
        style: 'mixed',
        focus: ''
    });

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setShowDownloadMenu(false);
            }
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update edited summary when summary prop changes
    useEffect(() => {
        setEditedSummary(summary);
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

    const handleCopyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(summary);
            // Could add toast notification here
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header - Fixed, not scrolling */}
            <div className="shrink-0 p-3 md:p-6 border-b border-border bg-background">
                <div className="flex items-center justify-between gap-2 mb-3 md:mb-0">
                    <h2 className="text-lg md:text-2xl font-bold text-foreground truncate">Document Summary</h2>

                    {/* Action Buttons - Compact on mobile */}
                    <div className="flex items-center gap-1 md:gap-2 shrink-0">
                        {summary && !isEditing && (
                            <>
                                {/* Copy Button */}
                                <button
                                    onClick={handleCopyToClipboard}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                                    title="Copy to clipboard"
                                    aria-label="Copy to clipboard"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>

                                {/* Download Dropdown */}
                                <div className="relative" ref={downloadMenuRef}>
                                    <button
                                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                        className="flex items-center gap-1 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                                        title="Download summary"
                                        aria-label="Download options"
                                        aria-expanded={showDownloadMenu}
                                    >
                                        <Download className="w-4 h-4" />
                                        <ChevronDown className={`w-3 h-3 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showDownloadMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-44 bg-card rounded-xl shadow-xl border border-border py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <button
                                                onClick={() => {
                                                    downloadAsMarkdown(summary, 'summary');
                                                    setShowDownloadMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors"
                                            >
                                                <FileDown className="w-4 h-4 text-muted-foreground" />
                                                <span>Markdown</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    downloadAsDOCX(summary, 'summary');
                                                    setShowDownloadMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors"
                                            >
                                                <FileDown className="w-4 h-4 text-blue-500" />
                                                <span>Word</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    downloadAsPDF(summary, 'summary');
                                                    setShowDownloadMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors"
                                            >
                                                <FileDown className="w-4 h-4 text-red-500" />
                                                <span>PDF</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Edit Button */}
                                <button
                                    onClick={handleStartEdit}
                                    className="flex items-center gap-1.5 px-2 md:px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors text-sm"
                                    aria-label="Edit summary"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Edit</span>
                                </button>
                            </>
                        )}

                        {hasUnknownContext && (
                            <>
                                {/* Options Button */}
                                <div className="relative" ref={optionsMenuRef}>
                                    <button
                                        onClick={() => setShowOptions(!showOptions)}
                                        className="p-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors"
                                        title="Customize summary"
                                        aria-label="Summary options"
                                        aria-expanded={showOptions}
                                    >
                                        <Sliders className="w-4 h-4" />
                                    </button>

                                    {/* Options Modal/Dropdown - Fixed positioning */}
                                    {showOptions && (
                                        <>
                                            {/* Mobile: Full screen modal */}
                                            <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" onClick={() => setShowOptions(false)}>
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl border-t border-border p-4 animate-in slide-in-from-bottom duration-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-semibold text-foreground text-lg">Customize Summary</h4>
                                                        <button
                                                            onClick={() => setShowOptions(false)}
                                                            className="p-1 hover:bg-secondary rounded-lg transition-colors"
                                                            aria-label="Close"
                                                        >
                                                            <X className="w-5 h-5 text-muted-foreground" />
                                                        </button>
                                                    </div>

                                                    {/* Length Option */}
                                                    <div className="mb-4">
                                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Length</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(['short', 'medium', 'detailed'] as const).map((len) => (
                                                                <button
                                                                    key={len}
                                                                    onClick={() => setOptions({ ...options, length: len })}
                                                                    className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${options.length === len
                                                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                                                            : 'bg-secondary hover:bg-secondary/80 text-foreground'
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
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(['bullet', 'paragraph', 'mixed'] as const).map((style) => (
                                                                <button
                                                                    key={style}
                                                                    onClick={() => setOptions({ ...options, style })}
                                                                    className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${options.style === style
                                                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                                                            : 'bg-secondary hover:bg-secondary/80 text-foreground'
                                                                        }`}
                                                                >
                                                                    {style === 'bullet' ? 'Bullets' : style}
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
                                                            className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={handleGenerate}
                                                        disabled={isLoading}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all font-medium"
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <FileText className="w-4 h-4" />
                                                        )}
                                                        <span>Generate Summary</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Desktop: Dropdown */}
                                            <div className="hidden md:block absolute right-0 top-full mt-1 w-80 bg-card rounded-xl shadow-xl border border-border p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <h4 className="font-semibold text-foreground mb-4">Customize Summary</h4>

                                                {/* Length Option */}
                                                <div className="mb-4">
                                                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Length</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(['short', 'medium', 'detailed'] as const).map((len) => (
                                                            <button
                                                                key={len}
                                                                onClick={() => setOptions({ ...options, length: len })}
                                                                className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${options.length === len
                                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                                        : 'bg-secondary hover:bg-secondary/80 text-foreground'
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
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {(['bullet', 'paragraph', 'mixed'] as const).map((style) => (
                                                            <button
                                                                key={style}
                                                                onClick={() => setOptions({ ...options, style })}
                                                                className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${options.style === style
                                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                                        : 'bg-secondary hover:bg-secondary/80 text-foreground'
                                                                    }`}
                                                            >
                                                                {style === 'bullet' ? 'Bullets' : style}
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
                                                        className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleGenerate}
                                                    disabled={isLoading}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all font-medium"
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <FileText className="w-4 h-4" />
                                                    )}
                                                    <span>Generate Summary</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Generate/Regenerate Button */}
                                <button
                                    onClick={() => onGenerate()}
                                    disabled={isLoading}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all text-sm font-medium"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileText className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">{summary ? 'Regenerate' : 'Generate'}</span>
                                    <span className="sm:hidden">{summary ? 'Redo' : 'Go'}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-hidden p-3 md:p-6">
                <div className="h-full bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-primary blur-xl opacity-20 animate-pulse"></div>
                                <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-primary relative z-10" />
                            </div>
                            <p className="text-sm md:text-base font-medium animate-pulse">Synthesizing document insights...</p>
                        </div>
                    ) : isEditing ? (
                        <div className="flex flex-col h-full p-4 md:p-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                                <span className="text-sm font-semibold text-primary flex items-center gap-2">
                                    <Edit3 className="w-4 h-4" /> Editing Mode
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
                                    >
                                        <Check className="w-4 h-4" /> Save
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={editedSummary}
                                onChange={(e) => setEditedSummary(e.target.value)}
                                className="flex-1 w-full p-3 md:p-4 rounded-xl bg-secondary/50 text-foreground border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none font-mono text-sm leading-relaxed transition-all"
                                placeholder="Type your summary improvements here..."
                                autoFocus
                            />
                        </div>
                    ) : summary ? (
                        <div className="h-full overflow-y-auto p-4 md:p-8">
                            <article className="prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none 
                                prose-headings:font-bold prose-headings:tracking-tight 
                                prose-h1:text-2xl md:prose-h1:text-3xl 
                                prose-h2:text-xl md:prose-h2:text-2xl 
                                prose-p:leading-relaxed prose-p:text-foreground
                                prose-li:text-foreground
                                prose-strong:text-foreground prose-strong:font-semibold
                                prose-code:text-foreground prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                prose-pre:bg-secondary prose-pre:border prose-pre:border-border"
                            >
                                <ReactMarkdown>{summary}</ReactMarkdown>
                            </article>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4">
                                <FileText className="w-7 h-7 md:w-8 md:h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">Ready to Summarize</h3>
                            <p className="text-sm md:text-base text-muted-foreground max-w-sm">
                                Generate a concise summary of your uploaded documents to grasp key concepts quickly.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}