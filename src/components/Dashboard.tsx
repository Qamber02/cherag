import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Search, User, Menu, LayoutDashboard, MessageCircle, Layers, FileQuestion, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { saveSummary, getLastSummary } from '../lib/activityService';

import Sidebar from './Sidebar';
import ChatTab from './ChatTab';
import FlashcardsTab from './FlashcardsTab';
import SummaryTab from './SummaryTab';
import StudyShortsTab from './StudyShortsTab';
import SettingsTab from './SettingsTab';
import QuizzesTab from './QuizzesTab';
import HistoryTab from './HistoryTab';
import DashboardHome from './DashboardHome';
import DiagramsTab from './DiagramsTab';
import MindMapTab from './MindMapTab';

import { useFiles } from '../hooks/useFiles';
import { useChat } from '../hooks/useChat';
import { useFlashcards } from '../hooks/useFlashcards';
import { useStudyShorts } from '../hooks/useStudyShorts';

interface DashboardProps {
    session: Session;
}

type Tab = 'dashboard' | 'chat' | 'flashcards' | 'summary' | 'quizzes' | 'diagrams' | 'mindmap' | 'videos' | 'history' | 'settings';

export default function Dashboard({ session }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Hooks
    const { files, isParsing, uploadFile, removeFile } = useFiles(session.user);
    const context = files.map(f => f.content).join('\n\n');

    const { messages, sendMessage, isLoading: isChatLoading } = useChat(session.user);
    const { flashcards, generateFlashcards, clearFlashcards, isLoading: isFlashcardsLoading } = useFlashcards(session.user, context);
    const { videos, generateShorts, loadMore, isLoading: isVideosLoading, isLoadingMore, hasMore } = useStudyShorts(session.user, context);

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
        await supabase.from('flashcards').delete().eq('user_id', session.user.id);
        await supabase.from('videos').delete().eq('user_id', session.user.id);
        await supabase.from('quizzes').delete().eq('user_id', session.user.id);
        await supabase.from('messages').delete().match({ chat_id: session.user.id });
        window.location.reload();
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as Tab);
    };

    return (
        <div className="flex h-screen bg-scholar overflow-hidden font-sans text-foreground">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Icon Sidebar */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 transition-transform duration-300 h-full`}>
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
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Bar with Search */}
                <header className="h-14 md:h-16 flex items-center px-4 md:px-6 gap-3 md:gap-4 shrink-0 transition-all duration-300">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg md:hidden text-foreground"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-2xl">
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/5 shadow-sm focus-within:ring-2 ring-primary/20 transition-all">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    {/* User Avatar */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center text-primary-foreground font-semibold shadow-lg text-sm">
                            {session.user.email ? session.user.email[0].toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-hidden p-3 md:p-6 pt-0 pb-20 md:pb-6">
                    <div className="w-full h-full overflow-hidden relative">
                        {/* Dashboard Tab */}
                        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'dashboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <DashboardHome
                                files={files}
                                flashcards={flashcards}
                                summary={summary}
                                onNavigate={handleTabChange}
                                onUpload={uploadFile}
                                isParsing={isParsing}
                            />
                        </div>

                        {/* Chat Tab */}
                        <div className={`glass-card rounded-2xl h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <ChatTab
                                messages={messages}
                                onSendMessage={(msg) => sendMessage(msg, context)}
                                isLoading={isChatLoading}
                            />
                        </div>

                        {/* Flashcards Tab */}
                        <div className={`glass-card rounded-2xl h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'flashcards' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <FlashcardsTab
                                flashcards={flashcards}
                                isLoading={isFlashcardsLoading}
                                onGenerate={generateFlashcards}
                                onClear={clearFlashcards}
                                hasUnknownContext={files.length > 0}
                            />
                        </div>

                        {/* Summary Tab */}
                        <div className={`glass-card rounded-2xl h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'summary' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <SummaryTab
                                summary={summary}
                                isLoading={isSummaryLoading}
                                onGenerate={handleGenerateSummary}
                                onUpdateSummary={handleUpdateSummary}
                                hasUnknownContext={files.length > 0}
                            />
                        </div>

                        {/* Quizzes Tab */}
                        <div className={`glass-card rounded-2xl h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'quizzes' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <QuizzesTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>

                        {/* Diagrams Tab */}
                        <div className={`glass-card rounded-2xl h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'diagrams' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <DiagramsTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>

                        {/* Mind Map Tab */}
                        <div className={`glass-card rounded-2xl h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'mindmap' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <MindMapTab
                                userId={session.user.id}
                                context={context}
                                hasContext={files.length > 0}
                            />
                        </div>

                        {/* Study Shorts Tab */}
                        <div className={`h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'videos' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <StudyShortsTab
                                videos={videos}
                                isLoading={isVideosLoading}
                                isLoadingMore={isLoadingMore}
                                hasMore={hasMore}
                                onGenerate={generateShorts}
                                onLoadMore={loadMore}
                                hasUnknownContext={files.length > 0}
                            />
                        </div>

                        {/* History Tab */}
                        <div className={`glass-card rounded-2xl h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'history' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <HistoryTab userId={session.user.id} />
                        </div>

                        {/* Settings Tab */}
                        <div className={`h-full overflow-hidden absolute inset-0 transition-all duration-300 ${activeTab === 'settings' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <SettingsTab
                                userEmail={session.user.email}
                                onSignOut={handleSignOut}
                                onClearData={handleClearAllData}
                            />
                        </div>
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-t from-amber-50/95 via-white/95 to-white/90 dark:from-gray-900/95 dark:via-gray-900/95 dark:to-gray-800/90 backdrop-blur-xl border-t border-amber-200/50 dark:border-gray-700 z-50 safe-area-bottom shadow-lg shadow-amber-900/5">
                    <div className="flex items-center justify-around h-16 px-2">
                        <button
                            onClick={() => handleTabChange('dashboard')}
                            className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all ${activeTab === 'dashboard'
                                ? 'text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/30'
                                : 'text-gray-500 dark:text-gray-400 hover:text-amber-500'}`}
                        >
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-semibold">Home</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('chat')}
                            className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all ${activeTab === 'chat'
                                ? 'text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/30'
                                : 'text-gray-500 dark:text-gray-400 hover:text-amber-500'}`}
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-semibold">Chat</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('flashcards')}
                            className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all ${activeTab === 'flashcards'
                                ? 'text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/30'
                                : 'text-gray-500 dark:text-gray-400 hover:text-amber-500'}`}
                        >
                            <Layers className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-semibold">Cards</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('quizzes')}
                            className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all ${activeTab === 'quizzes'
                                ? 'text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/30'
                                : 'text-gray-500 dark:text-gray-400 hover:text-amber-500'}`}
                        >
                            <FileQuestion className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-semibold">Quiz</span>
                        </button>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="flex flex-col items-center justify-center flex-1 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-amber-500 transition-all"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-semibold">More</span>
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    );
}
