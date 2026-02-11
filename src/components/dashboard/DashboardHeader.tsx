import { Search, Menu, User } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

interface DashboardHeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    session: Session;
}

export default function DashboardHeader({
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    session
}: DashboardHeaderProps) {
    return (
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
    );
}
