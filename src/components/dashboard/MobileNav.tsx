import { LayoutDashboard, MessageCircle, Layers, FileQuestion, MoreHorizontal } from 'lucide-react';
import type { Tab } from './types';

interface MobileNavProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    onMoreClick: () => void;
}

export default function MobileNav({ activeTab, onTabChange, onMoreClick }: MobileNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl border-t border-border z-50 safe-area-bottom shadow-lg">
            <div className="flex items-center justify-around h-[72px] px-1 gap-1">
                <button
                    onClick={() => onTabChange('dashboard')}
                    className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${activeTab === 'dashboard'
                        ? 'text-primary bg-primary/15 shadow-sm'
                        : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}
                >
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[11px] mt-1 font-semibold">Home</span>
                </button>
                <button
                    onClick={() => onTabChange('chat')}
                    className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${activeTab === 'chat'
                        ? 'text-primary bg-primary/15 shadow-sm'
                        : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}
                >
                    <MessageCircle className="w-6 h-6" />
                    <span className="text-[11px] mt-1 font-semibold">Chat</span>
                </button>
                <button
                    onClick={() => onTabChange('flashcards')}
                    className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${activeTab === 'flashcards'
                        ? 'text-primary bg-primary/15 shadow-sm'
                        : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}
                >
                    <Layers className="w-6 h-6" />
                    <span className="text-[11px] mt-1 font-semibold">Cards</span>
                </button>
                <button
                    onClick={() => onTabChange('quizzes')}
                    className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all active:scale-95 ${activeTab === 'quizzes'
                        ? 'text-primary bg-primary/15 shadow-sm'
                        : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}
                >
                    <FileQuestion className="w-6 h-6" />
                    <span className="text-[11px] mt-1 font-semibold">Quiz</span>
                </button>
                <button
                    onClick={onMoreClick}
                    className="flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl text-muted-foreground hover:text-primary hover:bg-muted/50 transition-all active:scale-95"
                >
                    <MoreHorizontal className="w-6 h-6" />
                    <span className="text-[11px] mt-1 font-semibold">More</span>
                </button>
            </div>
        </nav>
    );
}
