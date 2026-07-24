import { useRef, useState, useCallback } from 'react';
import {
    Upload, LayoutDashboard, Layers, FileQuestion,
    Play, Settings, User, FileText, X, MessageCircle, FileCheck,
    Map, Clock, Radar, Target, GraduationCap, GitMerge, Brain, BrainCircuit,
    ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import type { Document } from '../../hooks/useFiles';
import logoImg from '../../assets/logo.png';
import type { Session } from '@supabase/supabase-js';

// Reusing types/interfaces if possible, or defining here
interface SidebarProps {
    files: Document[];
    isParsing: boolean;
    onUpload: (file: File) => void;
    onRemove: (id: string) => void;
    onSignOut: () => void;
    userEmail?: string;
    activeTab: string;
    onTabChange: (tab: string) => void;
    session: Session;
    isMobile?: boolean;
    onCloseMobile?: () => void;
}

const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'summary', icon: FileCheck, label: 'Summary' },
    { id: 'flashcards', icon: Layers, label: 'Flashcards' },
    { id: 'quizzes', icon: FileQuestion, label: 'Quizzes' },

    { id: 'mindmap', icon: Map, label: 'Roadmap' },
    { id: 'videos', icon: Play, label: 'Study Shorts' },

    { id: 'beliefGraph', icon: BrainCircuit, label: 'Belief Graph' },
    { id: 'radar', icon: Radar, label: 'Knowledge Radar' },
    { id: 'exam', icon: Target, label: 'Exam Engine' },
    { id: 'teaching', icon: GraduationCap, label: 'Feynman Mode' },
    { id: 'remix', icon: GitMerge, label: 'Concept Remix' },
    { id: 'mental', icon: Brain, label: 'Mental Models' },
    { id: 'history', icon: Clock, label: 'History' },
];

export default function Sidebar({
    files,
    isParsing,
    onUpload,
    onRemove,
    onSignOut,
    userEmail,
    activeTab,
    onTabChange,
    session,
    isMobile,
    onCloseMobile
}: SidebarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showFilePanel, setShowFilePanel] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles) return;
        for (let i = 0; i < uploadedFiles.length; i++) {
            onUpload(uploadedFiles[i]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        for (let i = 0; i < droppedFiles.length; i++) {
            onUpload(droppedFiles[i]);
        }
    }, [onUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const sidebarClass = isMobile
        ? "w-64 h-full"
        : `${isCollapsed ? 'w-20' : 'w-72'} h-full transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]`;

    return (
        <div className={`flex h-full relative z-20`}>
            {/* Main Sidebar Glass Panel */}
            <aside className={`${sidebarClass} glass flex flex-col border-r border-white/10 relative overflow-hidden transition-all duration-300`}>

                {/* Background Ambient Glow */}
                <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                {/* Header / Logo */}
                <div className={`p-6 flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between'} transition-all`}>
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-warm-glow-sm shrink-0 border border-white/20 group">
                            <img src={logoImg} alt="Cherág" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-primary/10 group-hover:bg-transparent transition-colors" />
                        </div>
                        {(!isCollapsed || isMobile) && (
                            <h1 className="font-display font-bold text-xl text-foreground tracking-tight">
                                Cherág
                            </h1>
                        )}
                    </div>

                    {!isMobile && (
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        </button>
                    )}

                    {isMobile && (
                        <button onClick={onCloseMobile} className="p-2 text-muted-foreground">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Navigation Scroll Area */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar no-scrollbar">

                    {/* Upload Section */}
                    <button
                        onClick={() => setShowFilePanel(!showFilePanel)}
                        className={`
                            relative w-full flex items-center rounded-xl transition-all duration-300 group overflow-hidden
                            ${isCollapsed && !isMobile ? 'justify-center p-3' : 'px-4 py-3'}
                            ${showFilePanel ? 'bg-primary/10 text-primary shadow-warm-glow-sm' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'}
                        `}
                    >
                        <Upload size={20} className={`shrink-0 ${showFilePanel ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />

                        {(!isCollapsed || isMobile) && (
                            <span className="ml-3 font-medium text-sm">Upload Files</span>
                        )}

                        {/* File Badge */}
                        {files.length > 0 && (
                            <span className={`
                                absolute flex items-center justify-center bg-primary text-white font-bold rounded-full text-[10px] shadow-sm
                                ${isCollapsed && !isMobile ? 'top-2 right-2 w-4 h-4' : 'right-4 top-1/2 -translate-y-1/2 min-w-[1.25rem] h-5 px-1'}
                            `}>
                                {files.length}
                            </span>
                        )}
                    </button>

                    <div className="my-2 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />

                    {/* Main Nav Items */}
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`
                                    relative w-full flex items-center rounded-xl transition-all duration-300 group
                                    ${isCollapsed && !isMobile ? 'justify-center p-3' : 'px-4 py-3'}
                                    ${isActive
                                        ? 'bg-white dark:bg-white/10 text-primary shadow-sm border border-transparent dark:border-white/5'
                                        : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground hover:pl-5'}
                                `}
                                title={isCollapsed && !isMobile ? item.label : undefined}
                            >
                                <Icon
                                    size={20}
                                    className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                                />

                                {(!isCollapsed || isMobile) && (
                                    <span className={`ml-3 font-medium text-sm ${isActive ? 'font-semibold' : ''}`}>
                                        {item.label}
                                    </span>
                                )}

                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-md shadow-warm-glow-sm" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer Section */}
                <div className={`p-4 mt-auto border-t border-white/10 ${isCollapsed && !isMobile ? 'items-center' : ''} flex flex-col gap-2`}>

                    <button
                        onClick={() => onTabChange('settings')}
                        className={`flex items-center rounded-xl p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
                    >
                        <Settings size={20} className="text-muted-foreground group-hover:text-foreground" />
                        {(!isCollapsed || isMobile) && <span className="ml-3 text-sm font-medium text-muted-foreground group-hover:text-foreground">Settings</span>}
                    </button>

                    <button
                        onClick={onSignOut}
                        className={`flex items-center rounded-xl p-3 hover:bg-red-500/10 transition-colors group ${isCollapsed && !isMobile ? 'justify-center' : ''}`}
                    >
                        <LogOut size={20} className="text-muted-foreground group-hover:text-red-500" />
                        {(!isCollapsed || isMobile) && <span className="ml-3 text-sm font-medium text-muted-foreground group-hover:text-red-500">Sign Out</span>}
                    </button>

                    {/* Profile Avatar */}
                    <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'px-2'} pt-2`}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-orange-400 p-[2px] shadow-warm-glow-sm cursor-pointer">
                            <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-xs font-bold text-foreground">
                                {userEmail ? userEmail[0].toUpperCase() : 'U'}
                            </div>
                        </div>
                        {(!isCollapsed || isMobile) && (
                            <div className="ml-3 overflow-hidden">
                                <p className="text-sm font-semibold truncate text-foreground">{userEmail?.split('@')[0] || 'User'}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Online
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* File Upload Panel (Slide out) */}
            <div className={`
                absolute left-full top-0 h-full w-[28rem] max-w-[85vw] glass border-l border-white/20 transition-all duration-300 ease-in-out z-10
                ${showFilePanel ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0 pointer-events-none'}
            `}>
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h3 className="font-display font-semibold text-lg">Documents</h3>
                    <button onClick={() => setShowFilePanel(false)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 h-[calc(100%-80px)] overflow-y-auto custom-scrollbar">
                    {/* Reuse existing Drop Zone Logic */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            drop-zone rounded-xl p-6 text-center cursor-pointer mb-4 transition-all duration-300 border-2 border-dashed
                            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted/40 hover:border-primary/50 hover:bg-white/40 dark:hover:bg-white/5'}
                        `}
                    >
                        {isParsing ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2" />
                                <span className="text-xs font-medium">Processing...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-full text-primary">
                                    <Upload size={20} />
                                </div>
                                <p className="text-sm font-medium">Click or drop files</p>
                            </div>
                        )}
                    </div>

                    {/* Simple File List */}
                    <div className="space-y-2">
                        {files.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 rounded-lg bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText size={16} className="text-primary shrink-0" />
                                    <span className="text-sm truncate text-muted-foreground">{file.filename}</span>
                                </div>
                                <button
                                    onClick={() => onRemove(file.id)}
                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 hover:text-red-500 transition-all"
                                    aria-label={`Remove ${file.filename}`}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={handleFileUpload}
                />
            </div>
        </div>
    );
}
