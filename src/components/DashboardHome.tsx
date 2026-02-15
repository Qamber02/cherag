import { useRef } from 'react';
import { FileText, Layers, Play, ArrowRight, Sparkles, Brain, Clock, Plus } from 'lucide-react';
import type { Document } from '../hooks/useFiles';
import type { Flashcard } from '../hooks/useFlashcards';
import type { Session } from '@supabase/supabase-js';
import HeroSection from './dashboard/HeroSection';

interface DashboardHomeProps {
    files: Document[];
    flashcards: Flashcard[];
    summary: string;
    onNavigate: (tab: string) => void;
    onUpload: (file: File) => void;
    isParsing: boolean;
    session: Session;
}

export default function DashboardHome({
    files,
    flashcards,
    summary,
    onNavigate,
    onUpload,
    isParsing,
    session
}: DashboardHomeProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = e.target.files;
        if (!uploadedFiles) return;
        for (let i = 0; i < uploadedFiles.length; i++) {
            onUpload(uploadedFiles[i]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="w-full space-y-8">
            {/* Hidden Input for Upload */}
            <input
                type="file"
                ref={fileInputRef}
                multiple
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileChange}
            />

            {/* Hero Section */}
            <HeroSection
                session={session}
                onUpload={() => fileInputRef.current?.click()}
                onViewRoadmap={() => onNavigate('roadmap')}
            />

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column - Stats & Activity (Span 8) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Recent Activity / Summaries */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Recent Activity
                            </h2>
                            <button onClick={() => onNavigate('history')} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                View History
                            </button>
                        </div>

                        <div className="glass-card rounded-2xl p-6 border border-white/20 relative overflow-hidden group">
                            {/* Decoration */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />

                            <h3 className="text-base font-semibold mb-3">Latest Summary</h3>
                            {summary ? (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-white/10">
                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-primary uppercase tracking-wider">
                                            <FileText className="w-3 h-3" />
                                            {files[0]?.filename?.substring(0, 30) || 'Document'}
                                            {files[0]?.filename?.length > 30 ? '...' : ''}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                            {summary}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onNavigate('summary')}
                                        className="w-full py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        Continue Reading <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-10 flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                        <FileText className="w-6 h-6 text-primary/50" />
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-4">No summaries generated yet.</p>
                                    {files.length > 0 ? (
                                        <button
                                            onClick={() => onNavigate('summary')}
                                            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                                        >
                                            Generate Summary
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                                        >
                                            Upload a Document
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Quick Topics */}
                    <section>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                                <Brain className="w-5 h-5 text-orange-500" />
                                Extracted Concepts
                            </h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {flashcards.length > 0 ? flashcards.slice(0, 5).map((card, i) => (
                                <div key={i} className="px-3 py-1.5 rounded-lg bg-white/40 dark:bg-white/5 border border-white/20 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-default">
                                    {card.question.substring(0, 20)}...
                                </div>
                            )) : (
                                <div className="w-full p-8 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-sm text-muted-foreground">
                                    Upload documents to extract concepts automatically.
                                </div>
                            )}
                        </div>
                    </section>

                </div>

                {/* Right Column - Actions & Status (Span 4) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Flashcards Status */}
                    <div className="glass-card rounded-2xl p-5 border border-white/20 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm">Flashcards Due</h3>
                            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">{flashcards.length}</span>
                        </div>

                        <div className="relative h-32 w-full rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center mb-4 group cursor-pointer" onClick={() => onNavigate('flashcards')}>
                            <Layers className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                        </div>

                        <button
                            onClick={() => onNavigate('flashcards')}
                            className="w-full py-2.5 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-foreground font-medium text-sm transition-colors border border-white/10"
                        >
                            Review Now
                        </button>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onNavigate('quizzes')}
                            className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/60 dark:hover:bg-black/40 transition-all border border-white/20 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                            </div>
                            <span className="text-xs font-semibold">Quiz Me</span>
                        </button>

                        <button
                            onClick={() => onNavigate('videos')}
                            className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/60 dark:hover:bg-black/40 transition-all border border-white/20 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 text-red-500 fill-current" />
                            </div>
                            <span className="text-xs font-semibold">Shorts</span>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/60 dark:hover:bg-black/40 transition-all border border-white/20 group col-span-2"
                        >
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-emerald-500" />
                            </div>
                            <span className="text-xs font-semibold">Add New Material</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
