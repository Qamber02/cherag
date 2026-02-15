import { Search, Menu, User, Sun, Moon, Bell } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

interface HeaderProps {
    setSidebarOpen: (open: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    session: Session;
}

export default function Header({
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    session
}: HeaderProps) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Init state
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggleTheme = () => {
        const doc = document.documentElement;
        if (doc.classList.contains('dark')) {
            doc.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            doc.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    return (
        <header className="h-16 flex items-center justify-between px-4 md:px-6 py-3 gap-4 shrink-0 z-20 transition-all">
            {/* Mobile Menu Button - Only visible on mobile */}
            <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg md:hidden text-foreground flex-shrink-0 transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Search Bar - Glassy */}
            <div className="flex-1 max-w-xl">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search concepts, documents, or flashcards..."
                        className="
                            block w-full pl-10 pr-3 py-2.5 rounded-xl
                            bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/10
                            text-sm text-foreground placeholder:text-muted-foreground
                            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30
                            transition-all backdrop-blur-sm shadow-sm
                        "
                    />
                </div>
            </div>

            {/* Actions Area */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors"
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Notifications */}
                <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background box-content"></span>
                </button>

                {/* Divider */}
                <div className="h-6 w-px bg-border hidden md:block" />

                {/* User Profile Pill */}
                <div className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px] shadow-sm">
                        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            {session.user.email ? (
                                <span className="text-xs font-bold text-foreground">
                                    {session.user.email[0].toUpperCase()}
                                </span>
                            ) : (
                                <User className="w-4 h-4 text-foreground" />
                            )}
                        </div>
                    </div>
                    <div className="hidden md:block text-left">
                        <p className="text-sm font-semibold text-foreground leading-none">
                            {session.user.email?.split('@')[0]}
                        </p>
                        <p className="text-[10px] text-primary font-medium leading-none mt-1">
                            Pro Plan
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}
