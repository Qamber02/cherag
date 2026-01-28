import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Search, User, Menu, LayoutDashboard, MessageCircle, Layers, FileQuestion, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { saveSummary, getLastSummary } from '../lib/activityService';
import { getPreference, setPreference } from '../lib/preferencesService';

import Sidebar from './Sidebar';
import ChatTab from './ChatTab';
import FlashcardsTab from './FlashcardsTab';
import SummaryTab from './SummaryTab';
import DashboardHome from './DashboardHome';
// Lazy Load Heavy Components to optimize initial load
import {
    ExamEngineTab,
    TeachAITab,
    ConceptCompressionTab,
    ConceptRemixTab,
    MentalModelTab
} from './premium';
import { useVideoContext } from './premium/VideoContext';
import { usePremiumFeatures } from '../hooks/usePremiumFeatures';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy Load Heavy Components
const KnowledgeRadarTab = lazy(() => import('./premium').then(module => ({ default: module.KnowledgeRadarTab })));

const MindMapTab = lazy(() => import('./MindMapTab'));
const QuizzesTab = lazy(() => import('./QuizzesTab'));
const StudyShortsTab = lazy(() => import('./StudyShortsTab'));
const HistoryTab = lazy(() => import('./HistoryTab'));
const SettingsTab = lazy(() => import('./SettingsTab'));

// Loading Fallback
const TabLoading = () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground animate-pulse">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-sm">Loading component...</p>
    </div>
);

import { useFiles } from '../hooks/useFiles';
import { useChat } from '../hooks/useChat';
import { useFlashcards } from '../hooks/useFlashcards';
import { useStudyShorts } from '../hooks/useStudyShorts';

interface DashboardProps {
    session: Session;
}

type Tab = 'dashboard' | 'chat' | 'flashcards' | 'summary' | 'quizzes' | 'mindmap' | 'radar' | 'confidence' | 'exam' | 'teaching' | 'compress' | 'remix' | 'mental' | 'videos' | 'reels' | 'history' | 'settings';

export default function Dashboard({ session }: DashboardProps) {
    // Initialize from saved preference
    const savedTab = getPreference('lastActiveTab') as Tab;
    // State
    const [activeTab, setActiveTab] = useState<Tab>(savedTab || 'dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Hooks
    const { files, isParsing, uploadFile, removeFile } = useFiles(session.user);
    const context = files.map(f => f.content).join('\n\n');

    const { messages, sendMessage, isLoading: isChatLoading } = useChat(session.user);
    const { flashcards, generateFlashcards, clearFlashcards, isLoading: isFlashcardsLoading } = useFlashcards(session.user, context);
    const { videos, generateShorts, loadMore, resetVideos, isLoading: isVideosLoading, isLoadingMore, hasMore } = useStudyShorts(session.user, context);

    // Premium Features Hook
    const {
        knowledgeGraph,
        isLoading: isPremiumLoading,
        analyzeContent,
        generateActiveLessonAction,
        recordAnswer
    } = usePremiumFeatures(session.user.id);

    // Summary state
    const [summary, setSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    // Load saved summary on mount
    useEffect(() => {
        async function loadSaved() {
            const saved = await getLastSummary(session.user.id);
            if (saved) setSummary(saved);
        }
        loadSaved();
    }, [session.user.id]);

    const handleGenerateSummary = async (options?: { length?: string; style?: string; focus?: string }) => {
        if (!context) return;
        setIsSummaryLoading(true);
        try {
            const { generateSummary } = await import('../lib/aiService');
            const result = await generateSummary(context, options);
            setSummary(result);
            // Save to activity history
            await saveSummary(session.user.id, result);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const handleUpdateSummary = async (newSummary: string) => {
        setSummary(newSummary);
        // Save to activity history
        await saveSummary(session.user.id, newSummary);
    };

    const handleSignOut = () => supabase.auth.signOut();

    const handleClearAllData = async () => {
        try {
            const { clearUserData } = await import('../lib/premium/dataService');
            await clearUserData(session.user.id);
            window.location.reload();
        } catch (error) {
            console.error('Failed to clear data', error);
            alert('Failed to clear data. Please try again.');
        }
    };

    // VideoContext for pausing videos on tab change
    const { setActiveTab: setVideoContextTab } = useVideoContext() || {};

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as Tab);
        // Save to preferences for persistence
        setPreference('lastActiveTab', tab);
        // Notify VideoContext to pause videos when leaving videos tab
        setVideoContextTab?.(tab);
    };

    // Helper to render tabs with preservation or conditional mounting
    const renderTab = (tabName: Tab, component: React.ReactNode, preserveState = true, isScrollable = true) => {
        const isActive = activeTab === tabName;

        // Container styles
        const baseClasses = "absolute inset-0 h-full w-full bg-background transition-opacity duration-200";
        const visibilityClasses = isActive ? "opacity-100 z-10 visible" : "opacity-0 z-0 invisible pointer-events-none";
        const scrollClasses = isScrollable ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden";

        if (!preserveState) {
            return isActive ? (
                <div className={`absolute inset-0 h-full w-full ${scrollClasses} ${isActive ? 'z-10' : 'z-0'}`}>
                    <Suspense fallback={<TabLoading />}>
                        {component}
                    </Suspense>
                </div>
            ) : null;
        }

        return (
            <div className={`${baseClasses} ${visibilityClasses} ${scrollClasses}`}>
                <Suspense fallback={<TabLoading />}>
                    {component}
                </Suspense>
            </div>
        );
    };

    return (
        <div className="flex h-[100dvh] bg-scholar overflow-hidden font-sans text-foreground">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Icon Sidebar */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 transition-transform duration-300 h-full shrink-0`}>
                <Sidebar
                    files={files}
                    isParsing={isParsing}
                    onUpload={uploadFile}
                    onRemove={removeFile}
                    onSignOut={handleSignOut}
                    userEmail={session.user.email}
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                        handleTabChange(tab);
                        setSidebarOpen(false);
                    }}
                    session={session}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
                {/* Top Bar with Search */}
                <header className="h-14 md:h-16 flex items-center px-3 md:px-6 gap-2 md:gap-4 shrink-0 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 hover:bg-secondary rounded-lg md:hidden text-foreground flex-shrink-0"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Search Bar */}
                    <div className="flex-1 min-w-0 max-w-2xl">
                        <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-secondary/50 border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
                            />
                        </div>
                    </div>

                    {/* User Avatar */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center text-primary-foreground font-semibold shadow-lg text-sm">
                            {session.user.email ? session.user.email[0].toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-hidden relative">
                    {/* Dashboard Tab */}
                    {renderTab('dashboard', (
                        <div className="w-full min-h-full p-3 md:p-6 pb-20 md:pb-6">
                            <DashboardHome
                                files={files}
                                flashcards={flashcards}
                                summary={summary}
                                onNavigate={handleTabChange}
                                onUpload={uploadFile}
                                isParsing={isParsing}
                            />
                        </div>
                    ), true, true)}

                    {/* Chat Tab - Preserve State, Internal Scroll */}
                    {renderTab('chat', (
                        <div className="h-full w-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <ChatTab
                                    messages={messages}
                                    onSendMessage={(msg) => sendMessage(msg, context)}
                                    isLoading={isChatLoading}
                                />
                            </div>
                        </div>
                    ), true, false)}

                    {/* Flashcards Tab - Page Scroll */}
                    {renderTab('flashcards', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <FlashcardsTab
                                    flashcards={flashcards}
                                    isLoading={isFlashcardsLoading}
                                    onGenerate={generateFlashcards}
                                    onClear={clearFlashcards}
                                    hasUnknownContext={files.length > 0}
                                />
                            </div>
                        </div>
                    ), true, true)}

                    {/* Summary Tab - Page Scroll */}
                    {renderTab('summary', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <SummaryTab
                                    summary={summary}
                                    isLoading={isSummaryLoading}
                                    onGenerate={handleGenerateSummary}
                                    onUpdateSummary={handleUpdateSummary}
                                    hasUnknownContext={files.length > 0}
                                />
                            </div>
                        </div>
                    ), true, true)}

                    {/* Quizzes Tab - Page Scroll */}
                    {renderTab('quizzes', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <QuizzesTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        </div>
                    ), true, true)}

                    {/* Mind Map Tab - Internal Scroll (Split View) */}
                    {renderTab('mindmap', (
                        <div className="h-full w-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <MindMapTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        </div>
                    ), true, false)}

                    {/* Knowledge Radar Tab - Page Scroll */}
                    {renderTab('radar', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <KnowledgeRadarTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                    onAnalyze={analyzeContent}
                                    knowledgeGraph={knowledgeGraph}
                                    isLoading={isPremiumLoading}
                                    onGenerateLesson={generateActiveLessonAction}
                                    onRecordAnswer={recordAnswer}
                                />
                            </div>
                        </div>
                    ), true, true)}

                    {/* Exam Engine Tab - Page Scroll */}
                    {renderTab('exam', (
                        <div className="h-full w-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <ExamEngineTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        </div>
                    ), true, false)}

                    {/* Teach AI Tab - Internal Scroll */}
                    {renderTab('teaching', (
                        <div className="h-full w-full p-2 md:p-6 pb-20 md:pb-6">
                            <TeachAITab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>
                    ), true, false)}

                    {/* Compression Tab - Page Scroll */}
                    {renderTab('compress', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <ConceptCompressionTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        </div>
                    ), true, true)}

                    {/* Remix Tab - Page Scroll */}
                    {renderTab('remix', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <ConceptRemixTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        </div>
                    ), true, true)}

                    {/* Mental Model Tab - Page Scroll */}
                    {renderTab('mental', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <MentalModelTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        </div>
                    ), true, true)}

                    {/* Study Shorts Tab - Page Scroll */}
                    {renderTab('videos', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <StudyShortsTab
                                videos={videos}
                                isLoading={isVideosLoading}
                                isLoadingMore={isLoadingMore}
                                hasMore={hasMore}
                                onGenerate={generateShorts}
                                onLoadMore={loadMore}
                                onReset={resetVideos}
                                onExit={() => handleTabChange('dashboard')}
                                hasUnknownContext={files.length > 0}
                            />
                        </div>
                    ), true, true)}



                    {/* History Tab - Page Scroll */}
                    {renderTab('history', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <HistoryTab userId={session.user.id} />
                            </div>
                        </div>
                    ), true, true)}

                    {/* Settings Tab - Page Scroll */}
                    {renderTab('settings', (
                        <div className="w-full min-h-full p-2 md:p-6 pb-20 md:pb-6">
                            <SettingsTab
                                userEmail={session.user.email}
                                onSignOut={handleSignOut}
                                onClearData={handleClearAllData}
                            />
                        </div>
                    ), true, true)}
                </main>

                {/* Mobile Bottom Navigation - Touch Optimized */}
                <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl border-t border-border z-50 safe-area-bottom shadow-lg">
                    <div className="flex items-center justify-around h-[72px] px-1 gap-1">
                        <button
                            onClick={() => handleTabChange('dashboard')}
                            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${activeTab === 'dashboard'
                                ? 'text-primary bg-primary/15 shadow-sm'
                                : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}
                        >
                            <LayoutDashboard className="w-6 h-6" />
                            <span className="text-[11px] mt-1 font-semibold">Home</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('chat')}
                            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${activeTab === 'chat'
                                ? 'text-primary bg-primary/15 shadow-sm'
                                : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}
                        >
                            <MessageCircle className="w-6 h-6" />
                            <span className="text-[11px] mt-1 font-semibold">Chat</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('flashcards')}
                            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${activeTab === 'flashcards'
                                ? 'text-primary bg-primary/15 shadow-sm'
                                : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}
                        >
                            <Layers className="w-6 h-6" />
                            <span className="text-[11px] mt-1 font-semibold">Cards</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('quizzes')}
                            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${activeTab === 'quizzes'
                                ? 'text-primary bg-primary/15 shadow-sm'
                                : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}
                        >
                            <FileQuestion className="w-6 h-6" />
                            <span className="text-[11px] mt-1 font-semibold">Quiz</span>
                        </button>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl text-muted-foreground hover:text-primary hover:bg-muted/50 transition-all active:scale-95"
                        >
                            <MoreHorizontal className="w-6 h-6" />
                            <span className="text-[11px] mt-1 font-semibold">More</span>
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    );
}
