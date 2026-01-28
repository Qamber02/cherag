import { useRef } from 'react';
import { Upload, FileText, Layers, Play, ArrowRight, Sparkles } from 'lucide-react';
import type { Document } from '../hooks/useFiles';
import type { Flashcard } from '../hooks/useFlashcards';

interface DashboardHomeProps {
    files: Document[];
    flashcards: Flashcard[];
    summary: string;
    onNavigate: (tab: string) => void;
    onUpload: (file: File) => void;
    isParsing: boolean;
}

export default function DashboardHome({
    files,
    flashcards,
    summary,
    onNavigate,
    onUpload,
    isParsing
}: DashboardHomeProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = e.target.files;
        if (!uploadedFiles) return;
        for (let i = 0; i < uploadedFiles.length; i++) {
            onUpload(uploadedFiles[i]);
        }
    };

    return (
        <div className="w-full">
            {/* Mobile-first grid: 1 column default, 2 on md, 3 on lg */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 px-4 md:px-6 lg:px-8 section-spacing">
                {/* Upload Drop Zone - Touch Optimized - Order 1 on all screens */}
                <div
                    className="glass-card-premium rounded-2xl md:rounded-3xl p-5 md:p-8 cursor-pointer hover:shadow-2xl transition-all col-span-1 focus:outline-none focus:ring-2 focus:ring-primary/50 group relative overflow-hidden active:scale-[0.99] order-1"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                    aria-label="Upload document"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        className="hidden"
                        accept=".pdf,.docx,.doc,.txt,.md"
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center text-center py-4 md:py-8 relative z-10">
                        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 shadow-sm transition-transform group-hover:scale-110 ${isParsing ? 'bg-blue-100 dark:bg-blue-900 animate-pulse' : 'bg-white dark:bg-gray-800'}`}>
                            <Upload className={`w-8 h-8 md:w-10 md:h-10 ${isParsing ? 'text-blue-500' : 'text-gray-400 group-hover:text-primary transition-colors'}`} />
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                            {isParsing ? 'Processing AI Models...' : 'Upload Study Material'}
                        </h3>
                        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-4 md:mb-6 max-w-[280px] leading-relaxed">
                            Drag & drop PDFs or tap to browse. We'll generate the rest.
                        </p>
                        <button
                            tabIndex={-1}
                            className="btn-touch btn-ghost px-6 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:border-primary/50 group-hover:text-primary"
                        >
                            Select Documents
                        </button>
                    </div>
                    {files.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{files.length} file(s) uploaded</p>
                            {files.slice(0, 2).map(file => (
                                <div key={file.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-1">
                                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">{file.filename}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Summary Card - Order 3 on mobile, 2 on desktop */}
                <div className="glass-card rounded-2xl p-4 md:p-6 col-span-1 order-3 md:order-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Recent Summaries</h3>
                        <button
                            onClick={() => onNavigate('summary')}
                            className="min-h-[44px] px-3 text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1 active:scale-95 transition-all"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    {summary ? (
                        <div className="space-y-3">
                            <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4 ai-text">
                                <strong>{files[0]?.filename || 'Document'}</strong>
                                <p className="mt-2">{summary.slice(0, 200)}...</p>
                            </div>
                            <button
                                onClick={() => onNavigate('summary')}
                                className="btn-touch w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
                            >
                                Read More
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No summaries yet</p>
                            <button
                                onClick={() => onNavigate('summary')}
                                className="mt-3 text-sm text-amber-600 hover:text-amber-700"
                            >
                                Generate Summary
                            </button>
                        </div>
                    )}
                </div>

                {/* AI Flashcards Preview - Order 4 on mobile, 3 on desktop */}
                <div className="glass-card-premium rounded-2xl md:rounded-3xl p-5 md:p-8 col-span-1 flex flex-col order-4 md:order-3">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-indigo-500" /> Flashcards
                        </h3>
                        <button
                            onClick={() => onNavigate('flashcards')}
                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                    {flashcards.length > 0 ? (
                        <div className="space-y-4 flex-1 flex flex-col justify-center">
                            {/* Preview Card */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800/30 relative overflow-hidden group">
                                <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-2">Next to review</p>
                                <p className="font-bold text-gray-900 dark:text-white text-xl mb-4 leading-snug font-serif">"{flashcards[0].question}"</p>
                                <button className="w-full py-3 bg-white dark:bg-gray-800 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    Flip Card
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 flex flex-col items-center justify-center h-full">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                                <Layers className="w-8 h-8 opacity-40" />
                            </div>
                            <p className="text-sm font-medium">No cards yet</p>
                        </div>
                    )}
                </div>

                {/* Quick Actions - Touch Optimized - Order 2 on mobile (priority!) */}
                <div className="glass-card-premium rounded-2xl md:rounded-3xl p-5 md:p-8 col-span-1 md:col-span-2 xl:col-span-1 order-2 md:order-4">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4 md:mb-6">Quick Actions</h3>
                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                        <button
                            onClick={() => onNavigate('quizzes')}
                            className="min-h-[72px] p-4 md:p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-purple-200 hover:shadow-lg active:scale-[0.98] transition-all text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-base">Take a Quiz</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Test your mastery</p>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => onNavigate('videos')}
                            className="min-h-[72px] p-4 md:p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-red-200 hover:shadow-lg active:scale-[0.98] transition-all text-left group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                                    <Play className="w-6 h-6 text-white ml-1" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-base">Study Shorts</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Visual learning</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Study Shortcuts - Order 5 on all screens */}
                <div className="glass-card-premium rounded-2xl md:rounded-3xl p-5 md:p-8 col-span-1 lg:col-span-2 order-5">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-6">Key Concepts Extracted</h3>
                    {flashcards.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                            {flashcards.slice(0, 8).map((card, idx) => (
                                <span
                                    key={idx}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:border-amber-500/50 hover:text-amber-600 transition-colors cursor-default shadow-sm"
                                >
                                    {card.question.split(' ').slice(0, 4).join(' ')}...
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                            <p className="text-sm text-gray-400 font-medium">Extracting concepts...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
