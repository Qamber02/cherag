import { LayoutDashboard, MessageCircle, Layers, FileQuestion, MoreHorizontal } from 'lucide-react';
import type { Tab } from '../dashboard/types';

interface BottomNavProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    onMoreClick: () => void;
}

export default function BottomNav({ activeTab, onTabChange, onMoreClick }: BottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 md:hidden glass border-t border-white/10 z-50 safe-area-bottom shadow-lg overflow-hidden">
            {/* Glow effect at top */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="flex items-center justify-around h-[72px] px-1 gap-1 relative">
                <button
                    onClick={() => onTabChange('dashboard')}
                    className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 group ${activeTab === 'dashboard'
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <div className={`p-1 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary/10 shadow-warm-glow-sm' : ''}`}>
                        <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold">Home</span>
                </button>

                <button
                    onClick={() => onTabChange('chat')}
                    className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 group ${activeTab === 'chat'
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <div className={`p-1 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-primary/10 shadow-warm-glow-sm' : ''}`}>
                        <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold">Chat</span>
                </button>

                <button
                    onClick={() => onTabChange('flashcards')}
                    className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 group ${activeTab === 'flashcards'
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <div className={`p-1 rounded-xl transition-all ${activeTab === 'flashcards' ? 'bg-primary/10 shadow-warm-glow-sm' : ''}`}>
                        <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold">Cards</span>
                </button>

                <button
                    onClick={() => onTabChange('quizzes')}
                    className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 group ${activeTab === 'quizzes'
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <div className={`p-1 rounded-xl transition-all ${activeTab === 'quizzes' ? 'bg-primary/10 shadow-warm-glow-sm' : ''}`}>
                        <FileQuestion className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold">Quiz</span>
                </button>

                <button
                    onClick={onMoreClick}
                    className="flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl text-muted-foreground hover:text-foreground transition-all active:scale-95"
                >
                    <div className="p-1 rounded-xl">
                        <MoreHorizontal className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold">More</span>
                </button>
            </div>
        </nav>
    );
}
