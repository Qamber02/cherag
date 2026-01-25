import { useRef, useState, useCallback } from 'react';
import {
    Upload, LayoutDashboard, Layers, FileQuestion,
    Play, Settings, User, FileText, X, MessageCircle, FileCheck,
    Map, Clock, Radar, Target, GraduationCap, Minimize2, GitMerge, Brain,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import type { Document } from '../hooks/useFiles';
import logoImg from '../assets/logo.png';
import type { Session } from '@supabase/supabase-js';

interface SidebarProps {
    files: Document[];
    isParsing: boolean;
    onUpload: (file: File) => void;
    onRemove: (id: string) => void;
    onSignOut: () => void;
    userEmail?: string;
    activeTab: string;
    onTabChange: (tab: string) => void;
    session: Session; // Added
}

const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'summary', icon: FileCheck, label: 'Summary' },
    { id: 'flashcards', icon: Layers, label: 'Flashcards' },
    { id: 'quizzes', icon: FileQuestion, label: 'Quizzes' },

    { id: 'mindmap', icon: Map, label: 'Roadmap' },
    { id: 'videos', icon: Play, label: 'Study Shorts' },
    { id: 'radar', icon: Radar, label: 'Knowledge Radar' },
    { id: 'exam', icon: Target, label: 'Exam Engine' },
    { id: 'teaching', icon: GraduationCap, label: 'Feynman Mode' },
    { id: 'compress', icon: Minimize2, label: 'Compression' },
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

    return (
        <div className="flex h-full transition-all duration-300 ease-in-out">
            <aside className={`${isCollapsed ? 'w-20' : 'w-64'} glass-sidebar flex flex-col h-full py-6 z-20 relative transition-all duration-300`}>
                {/* Logo & Toggle */}
                <div className={`flex ${isCollapsed ? 'justify-center' : 'px-6 justify-between'} items-center mb-8 transition-all`}>
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shrink-0">
                        <img src={logoImg} alt="Cherág" className="w-full h-full object-cover" />
                    </div>
                    {!isCollapsed && (
                        <h1 className="font-bold text-xl ml-3 text-gray-800 dark:text-white tracking-tight">Cherág</h1>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isCollapsed ? 'absolute -right-3 top-8 bg-white shadow-md border border-gray-100 dark:bg-gray-800 dark:border-gray-700' : ''}`}
                    >
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {/* Navigation Icons */}
                <nav className="flex-1 flex flex-col space-y-1 w-full overflow-y-auto min-h-0 no-scrollbar px-3 pt-2">
                    {/* Upload Button */}
                    <button
                        onClick={() => setShowFilePanel(!showFilePanel)}
                        className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl transition-all duration-200 group relative mb-4 ${showFilePanel ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title={isCollapsed ? "Upload Files" : undefined}
                    >
                        <Upload className={`w-5 h-5 ${showFilePanel ? 'text-primary' : 'text-gray-500'}`} />

                        {!isCollapsed && (
                            <span className="ml-3 font-medium text-sm">Upload Files</span>
                        )}

                        {/* File count badge */}
                        {files.length > 0 && (
                            <span className={`absolute ${isCollapsed ? '-top-1 -right-1' : 'right-3'} w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                                {files.length}
                            </span>
                        )}

                        {isCollapsed && (
                            <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                Upload Files
                            </span>
                        )}
                    </button>

                    {/* Core Tools */}
                    {navItems.slice(0, 5).map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-500'}`} />

                                {!isCollapsed && (
                                    <span className="ml-3 font-medium text-sm">{item.label}</span>
                                )}

                                {isCollapsed && (
                                    <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* Separator */}
                    <div className="py-2">
                        {isCollapsed ? (
                            <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 mx-auto" />
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 opacity-50">
                                <span className="text-xs font-bold tracking-wider uppercase">Advanced Tools</span>
                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
                            </div>
                        )}
                    </div>

                    {/* Advanced Tools */}
                    {navItems.slice(5).map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-500'}`} />

                                {!isCollapsed && (
                                    <span className="ml-3 font-medium text-sm">{item.label}</span>
                                )}

                                {isCollapsed && (
                                    <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Hidden file input */}
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={handleFileUpload}
                />

                {/* Bottom section - Settings & User */}
                <div className="flex flex-col items-center space-y-4 mt-auto mb-4 w-full px-2">

                    <div className="flex flex-col gap-2 items-center">
                        <button
                            onClick={() => onTabChange('settings')}
                            className={`icon-btn ${activeTab === 'settings' ? 'active' : ''}`}
                            title="Settings"
                        >
                            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-gray-900' : 'text-gray-500'}`} />
                        </button>

                        {/* Sign Out (Use onSignOut) */}
                        <button
                            onClick={onSignOut}
                            className="icon-btn hover:text-red-500 hover:bg-red-50/10"
                            title="Sign Out"
                        >
                            <User className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                        </button>
                    </div>

                    {/* User Avatar */}
                    {session && (
                        <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-medium text-sm cursor-pointer hover:shadow-lg transition-shadow"
                            title={userEmail}
                        >
                            {userEmail ? userEmail[0].toUpperCase() : 'U'}
                        </div>
                    )}
                </div>
            </aside>

            {/* File Upload Panel */}
            {showFilePanel && (
                <div className="w-80 glass-sidebar flex flex-col h-full py-6 px-4 border-l border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-xl z-10 animate-fade-in custom-scrollbar">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-lg text-foreground">Documents</h3>
                        <button
                            onClick={() => setShowFilePanel(false)}
                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            drop-zone rounded-xl p-8 text-center cursor-pointer mb-6 transition-all duration-300
                            ${isDragging ? 'dragging border-primary bg-primary/5' : 'border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-white/30 dark:hover:bg-black/20'}
                        `}
                    >
                        {isParsing ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                                <span className="text-sm font-medium text-foreground">Processing...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-white/50 dark:bg-white/5 rounded-full mb-1">
                                    <Upload className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-medium text-foreground">
                                    Click or drop files
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    PDF, DOCX, TXT
                                </p>
                            </div>
                        )}
                    </div>

                    {/* File List Header */}
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Uploaded Files
                        </span>
                        <span className="text-xs bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-foreground font-medium">
                            {files.length}
                        </span>
                    </div>

                    {/* File List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                                <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                                <p className="text-sm text-foreground">No files yet</p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-[150px]">
                                    Upload documents to start chatting with them
                                </p>
                            </div>
                        ) : (
                            files.map((file) => (
                                <div
                                    key={file.id}
                                    className="group flex items-center gap-3 p-3 bg-white/60 dark:bg-black/20 rounded-xl hover:bg-white/80 dark:hover:bg-black/30 transition-all border border-transparent hover:border-black/5 dark:hover:border-white/5 shadow-sm"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col items-start">
                                        <span className="text-sm font-medium text-foreground truncate w-full" title={file.filename}>
                                            {file.filename}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase">
                                            {file.file_type}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(file.id);
                                        }}
                                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 rounded-lg transition-all"
                                        title="Remove file"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
