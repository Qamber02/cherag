import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Search, User } from 'lucide-react';
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

    const handleGenerateSummary = async () => {
        if (!context) return;
        setIsSummaryLoading(true);
        try {
            const { generateSummary } = await import('../lib/aiService');
            const result = await generateSummary(context);
            setSummary(result);
            // Save to activity history
            await saveSummary(session.user.id, result);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSummaryLoading(false);
        }
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
        <div className="flex h-screen bg-scholar overflow-hidden font-sans">
            {/* Icon Sidebar */}
            <Sidebar
                files={files}
                isParsing={isParsing}
                onUpload={uploadFile}
                onRemove={removeFile}
                onSignOut={handleSignOut}
                userEmail={session.user.email}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Bar with Search */}
                <header className="h-16 flex items-center px-6 gap-4 shrink-0">
                    {/* Search Bar */}
                    <div className="flex-1 max-w-2xl">
                        <div className="search-bar flex items-center gap-3 px-4 py-3 rounded-xl">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search past papers, notes, and concepts..."
                                className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
                            />
                        </div>
                    </div>

                    {/* User Avatar */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium shadow-lg">
                            {session.user.email ? session.user.email[0].toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-hidden p-6 pt-0">
                    <div className="w-full h-full overflow-hidden">
                        {activeTab === 'dashboard' && (
                            <DashboardHome
                                files={files}
                                flashcards={flashcards}
                                summary={summary}
                                onNavigate={handleTabChange}
                                onUpload={uploadFile}
                                isParsing={isParsing}
                            />
                        )}
                        {activeTab === 'chat' && (
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <ChatTab
                                    messages={messages}
                                    onSendMessage={(msg) => sendMessage(msg, context)}
                                    isLoading={isChatLoading}
                                />
                            </div>
                        )}
                        {activeTab === 'flashcards' && (
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <FlashcardsTab
                                    flashcards={flashcards}
                                    isLoading={isFlashcardsLoading}
                                    onGenerate={generateFlashcards}
                                    onClear={clearFlashcards}
                                    hasUnknownContext={files.length > 0}
                                />
                            </div>
                        )}
                        {activeTab === 'summary' && (
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <SummaryTab
                                    summary={summary}
                                    isLoading={isSummaryLoading}
                                    onGenerate={handleGenerateSummary}
                                    hasUnknownContext={files.length > 0}
                                />
                            </div>
                        )}
                        {activeTab === 'quizzes' && (
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <QuizzesTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        )}
                        {activeTab === 'diagrams' && (
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <DiagramsTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        )}
                        {activeTab === 'mindmap' && (
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <MindMapTab
                                    userId={session.user.id}
                                    context={context}
                                    hasContext={files.length > 0}
                                />
                            </div>
                        )}
                        {activeTab === 'videos' && (
                            <StudyShortsTab
                                videos={videos}
                                isLoading={isVideosLoading}
                                isLoadingMore={isLoadingMore}
                                hasMore={hasMore}
                                onGenerate={generateShorts}
                                onLoadMore={loadMore}
                                hasUnknownContext={files.length > 0}
                            />
                        )}
                        {activeTab === 'history' && (
                            <div className="glass-card rounded-2xl h-full overflow-hidden">
                                <HistoryTab userId={session.user.id} />
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <SettingsTab
                                userEmail={session.user.email}
                                onSignOut={handleSignOut}
                                onClearData={handleClearAllData}
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
