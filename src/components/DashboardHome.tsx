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
        <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-2">
                {/* Upload Drop Zone */}
                <div
                    className="glass-card rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-all col-span-1"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        className="hidden"
                        accept=".pdf,.docx,.doc,.txt,.md"
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center text-center py-8">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isParsing ? 'bg-blue-100 dark:bg-blue-900 animate-pulse' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <Upload className={`w-8 h-8 ${isParsing ? 'text-blue-500' : 'text-gray-400'}`} />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {isParsing ? 'Processing...' : 'Drag & Drop PDFs, documents, or paste notes here'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Supports PDF, DOCX, TXT, MD</p>
                        <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Browse Files
                        </button>
                    </div>
                    {files.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{files.length} file(s) uploaded</p>
                            {files.slice(0, 2).map(file => (
                                <div key={file.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-1">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span className="truncate">{file.filename}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Summary Card */}
                <div className="glass-card rounded-2xl p-6 col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Recent Summaries</h3>
                        <button
                            onClick={() => onNavigate('summary')}
                            className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1"
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
                                className="w-full py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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

                {/* AI Flashcards Preview */}
                <div className="glass-card rounded-2xl p-6 col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">AI-Generated Flashcards</h3>
                        <button
                            onClick={() => onNavigate('flashcards')}
                            className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    {flashcards.length > 0 ? (
                        <div className="space-y-4">
                            {/* Preview Card */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
                                <p className="text-xs text-amber-600 mb-1">Term:</p>
                                <p className="font-bold text-gray-900 dark:text-white text-lg mb-3">{flashcards[0].question}</p>
                                <button className="w-full py-2 bg-white/80 dark:bg-gray-800/80 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Flip to see Definition
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                📚 {flashcards.length} cards generated for this document
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No flashcards yet</p>
                            <button
                                onClick={() => onNavigate('flashcards')}
                                className="mt-3 text-sm text-amber-600 hover:text-amber-700"
                            >
                                Generate Flashcards
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="glass-card rounded-2xl p-6 col-span-1 lg:col-span-2 xl:col-span-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onNavigate('quizzes')}
                            className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl hover:shadow-md transition-all text-left"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">Take Quiz</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Test your knowledge</p>
                        </button>
                        <button
                            onClick={() => onNavigate('videos')}
                            className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 rounded-xl hover:shadow-md transition-all text-left"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center mb-3">
                                <Play className="w-5 h-5 text-white" />
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">Study Shorts</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Watch related videos</p>
                        </button>
                    </div>
                </div>

                {/* Study Shortcuts */}
                <div className="glass-card rounded-2xl p-6 col-span-1 lg:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-4">Study Concepts</h3>
                    {flashcards.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {flashcards.slice(0, 6).map((card, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1.5 bg-white/60 rounded-lg text-sm text-gray-700 border border-gray-100"
                                >
                                    {card.question.split(' ').slice(0, 3).join(' ')}...
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Upload a document to see concepts</p>
                    )}
                </div>
            </div>
        </div>
    );
}
