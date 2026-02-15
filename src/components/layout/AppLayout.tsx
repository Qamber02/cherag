import type { ReactNode } from 'react';

interface AppLayoutProps {
    sidebar: ReactNode;
    header: ReactNode;
    children: ReactNode;
    mobileSidebar: ReactNode;
}

export default function AppLayout({ sidebar, header, children, mobileSidebar }: AppLayoutProps) {
    return (
        <div className="flex h-[100dvh] w-full bg-background text-foreground font-sans overflow-hidden relative">
            {/* Ambient Mesh Background - Fixed */}
            <div className="fixed inset-0 z-0 bg-mesh-warm opacity-40 dark:opacity-20 pointer-events-none" />
            <div className="fixed inset-0 z-0 bg-background/60 backdrop-blur-2xl pointer-events-none" />

            {/* Desktop Sidebar - Left */}
            <div className="hidden md:block h-full shrink-0 z-30 relative">
                {sidebar}
            </div>

            {/* Mobile Sidebar - Drawer Overlay */}
            {mobileSidebar}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 z-10 relative h-full">

                {/* Header */}
                <div className="shrink-0 z-20">
                    {header}
                </div>

                {/* Page Content */}
                <main className="flex-1 overflow-hidden relative p-3 md:p-6 pt-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
