import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { saveSummary, getLastSummary } from '../lib/activityService';
import { getPreference, setPreference } from '../lib/preferencesService';

// Layout Components
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import AppLayout from './layout/AppLayout';
import BottomNav from './layout/BottomNav';
import DashboardHome from './DashboardHome';
import OnboardingModal from './OnboardingModal';
import type { Tab } from './dashboard/types';

// Lazy Load Heavy Components to optimize initial load
import {
    ExamEngineTab,
    TeachAITab,
    BeliefGraphTab,
    ConceptRemixTab,
    MentalModelTab
} from './premium';
import { useVideoContext } from './premium/VideoContext';
import { usePremiumFeatures } from '../hooks/usePremiumFeatures';

// Lazy Load Heavy Components
const KnowledgeRadarTab = lazy(() => import('./premium').then(module => ({ default: module.KnowledgeRadarTab })));

const MindMapTab = lazy(() => import('./MindMapTab'));
const QuizzesTab = lazy(() => import('./QuizzesTab'));
const StudyShortsTab = lazy(() => import('./StudyShortsTab'));
const HistoryTab = lazy(() => import('./HistoryTab'));
const SettingsTab = lazy(() => import('./SettingsTab'));

// Lazy load remaining tabs that were previously eager
const ChatTab = lazy(() => import('./ChatTab'));
const FlashcardsTab = lazy(() => import('./FlashcardsTab'));
const SummaryTab = lazy(() => import('./SummaryTab'));

const VALID_TABS: readonly Tab[] = [
    'dashboard', 'chat', 'flashcards', 'summary', 'quizzes', 'mindmap',
    'beliefGraph', 'radar', 'confidence', 'exam', 'teaching', 'remix',
    'mental', 'videos', 'reels', 'history', 'settings'
];

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

export default function Dashboard({ session }: DashboardProps) {
    // Initialize from saved preference
    const savedTab = getPreference('lastActiveTab') as Tab;
    const hasCompletedOnboarding = getPreference('hasCompletedOnboarding');

    // State
    const [activeTab, setActiveTab] = useState<Tab>(VALID_TABS.includes(savedTab) ? savedTab : 'dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(!hasCompletedOnboarding);

    const handleOnboardingComplete = () => {
        setPreference('hasCompletedOnboarding', true);
        setShowOnboarding(false);
    };

    // Hooks
    const { files, isParsing, uploadFile, removeFile } = useFiles(session.user);
    // Memoize context to prevent expensive re-calculation on every render (e.g. typing search)
    const context = useMemo(() => files.map((f: any) => f.content).join('\n\n'), [files]);

    const { messages, sendMessage, isLoading: isChatLoading } = useChat(session.user);
    const { flashcards, generateFlashcards, clearFlashcards, isLoading: isFlashcardsLoading } = useFlashcards(session.user, context);
    const { videos, generateShorts, loadMore, resetVideos, isLoading: isVideosLoading, isLoadingMore, hasMore } = useStudyShorts(session.user, context);

    // Premium Features Hook
    const {
        knowledgeGraph,
        isLoading: isPremiumLoading,
        analyzeContent,
        generateActiveLessonAction,
        recordAnswer,
        completeLesson
    } = usePremiumFeatures(session.user.id);

    // Summary state
    const [summary, setSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    // Load saved summary on mount
    useEffect(() => {
        let active = true;
        async function loadSaved() {
            const saved = await getLastSummary(session.user.id);
            if (active && saved) setSummary(saved);
        }
        loadSaved();
        return () => { active = false; };
    }, [session.user.id]);

    const handleGenerateSummary = async (options?: { length?: string; style?: string; focus?: string }) => {
        if (!context) return;
        setIsSummaryLoading(true);
        try {
            // Use secure server-side AI generation
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

    // Sync initial active tab with VideoContext to prevent autoplay on load
    useEffect(() => {
        if (activeTab && setVideoContextTab) {
            setVideoContextTab(activeTab);
        }
    }, [setVideoContextTab, activeTab]);

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
        <AppLayout
            sidebar={
                <Sidebar
                    files={files}
                    isParsing={isParsing}
                    onUpload={uploadFile}
                    onRemove={removeFile}
                    onSignOut={handleSignOut}
                    userEmail={session.user.email}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    session={session}
                />
            }
            mobileSidebar={
                <div className={`fixed inset-0 z-50 md:hidden ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
                        onClick={() => setSidebarOpen(false)}
                    />
                    {/* Drawer */}
                    <div className={`absolute left-0 top-0 h-full w-72 transition-transform duration-300 ease-out z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
                            isMobile={true}
                            onCloseMobile={() => setSidebarOpen(false)}
                        />
                    </div>
                </div>
            }
            header={
                <Header
                    setSidebarOpen={setSidebarOpen}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    session={session}
                />
            }
        >
            {/* Page Content */}
            <div className="h-full relative">
                {/* Dashboard Tab */}
                {renderTab('dashboard', (
                    <div className="w-full min-h-full pb-20 md:pb-6">
                        <DashboardHome
                            files={files}
                            flashcards={flashcards}
                            summary={summary}
                            onNavigate={handleTabChange}
                            onUpload={uploadFile}
                            isParsing={isParsing}
                            session={session}
                        />
                    </div>
                ), true, true)}

                {/* Chat Tab */}
                {renderTab('chat', (
                    <div className="h-full w-full pb-20 md:pb-0">
                        <div className="glass-card rounded-2xl h-full overflow-hidden shadow-warm-glow">
                            <ChatTab
                                messages={messages}
                                onSendMessage={(msg) => sendMessage(msg, context)}
                                isLoading={isChatLoading}
                            />
                        </div>
                    </div>
                ), true, false)}

                {/* Flashcards Tab */}
                {renderTab('flashcards', (
                    <div className="w-full min-h-full pb-20 md:pb-6">
                        <div className="glass-card rounded-2xl overflow-hidden shadow-warm-glow">
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

                {/* Summary Tab */}
                {renderTab('summary', (
                    <div className="w-full min-h-full pb-20 md:pb-6">
                        <div className="glass-card rounded-2xl overflow-hidden shadow-warm-glow">
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

                {/* Quizzes Tab */}
                {renderTab('quizzes', (
                    <div className="w-full min-h-full pb-20 md:pb-6">
                        <div className="glass-card rounded-2xl overflow-hidden shadow-warm-glow">
                            <QuizzesTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>
                    </div>
                ), true, true)}

                {/* Mind Map Tab */}
                {renderTab('mindmap', (
                    <div className="h-full w-full pb-20 md:pb-0">
                        <div className="glass-card rounded-2xl h-full overflow-hidden shadow-warm-glow">
                            <MindMapTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>
                    </div>
                ), true, false)}

                {/* Knowledge Radar Tab — full height for internal flex layout */}
                {renderTab('beliefGraph', (
                    <div className="absolute inset-0 w-full pb-20 md:pb-6">
                        <div className="glass-card rounded-2xl h-full overflow-hidden shadow-warm-glow">
                            <BeliefGraphTab
                                userId={session.user.id}
                                courseId="recursion"
                            />
                        </div>
                    </div>
                ), true, false)}

                {/* Knowledge Radar Tab — full height for internal flex layout */}
                {renderTab('radar', (
                    <div className="absolute inset-0 w-full pb-20 md:pb-6">
                        <div className="glass-card rounded-2xl h-full overflow-hidden shadow-warm-glow">
                            <KnowledgeRadarTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                                onAnalyze={analyzeContent}
                                knowledgeGraph={knowledgeGraph}
                                isLoading={isPremiumLoading}
                                onGenerateLesson={generateActiveLessonAction}
                                onRecordAnswer={recordAnswer}
                                onCompleteLesson={completeLesson}
                            />
                        </div>
                    </div>
                ), true, false)}

                {/* Exam Engine Tab */}
                {renderTab('exam', (
                    <div className="h-full w-full pb-20 md:pb-0">
                        <div className="glass-card rounded-2xl h-full overflow-hidden shadow-warm-glow">
                            <ExamEngineTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>
                    </div>
                ), true, false)}

                {/* Teach AI Tab */}
                {renderTab('teaching', (
                    <div className="h-full w-full pb-20 md:pb-0">
                        <TeachAITab
                            userId={session.user.id}
                            context={context}
                            hasContext={files.length > 0}
                        />
                    </div>
                ), true, false)}

                {/* Remix Tab */}
                {renderTab('remix', (
                    <div className="w-full min-h-full pb-20 md:pb-6">
                        <div className="glass-card rounded-2xl overflow-hidden shadow-warm-glow">
                            <ConceptRemixTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>
                    </div>
                ), true, true)}

                {/* Mental Model Tab */}
                {renderTab('mental', (
                    <div className="w-full min-h-full pb-20 md:pb-6">
                        <div className="glass-card rounded-2xl overflow-hidden shadow-warm-glow">
                            <MentalModelTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>
                    </div>
                ), true, true)}

                {/* Study Shorts Tab — full viewport height, self-scrolling (SnapScroll) */}
                {renderTab('videos', (
                    <div className="absolute inset-0 w-full">
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
                ), true, false)}

                {/* History Tab */}
                {renderTab('history', (
                    <div className="w-full min-h-full pb-20 md:pb-6">
                        <div className="glass-card rounded-2xl overflow-hidden shadow-warm-glow">
                            <HistoryTab userId={session.user.id} />
                        </div>
                    </div>
                ), true, true)}

                {/* Settings Tab */}
                {renderTab('settings', (
                    <div className="w-full min-h-full pb-20 md:pb-6">
                        <SettingsTab
                            userEmail={session.user.email}
                            onSignOut={handleSignOut}
                            onClearData={handleClearAllData}
                        />
                    </div>
                ), true, true)}
            </div>

            {/* Mobile Bottom Navigation */}
            <BottomNav
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onMoreClick={() => setSidebarOpen(true)}
            />
            {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />}
        </AppLayout>
    );
}
