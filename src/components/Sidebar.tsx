import { useRef, useState, useCallback } from 'react';
import {
    Upload, LayoutDashboard, Layers, FileQuestion,
    Play, History, Settings, Brain, User, FileText, X
} from 'lucide-react';
import type { Document } from '../hooks/useFiles';

interface SidebarProps {
    files: Document[];
    isParsing: boolean;
    onUpload: (file: File) => void;
    onRemove: (id: string) => void;
    onSignOut: () => void;
    userEmail?: string;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'flashcards', icon: Layers, label: 'Flashcards' },
    { id: 'quizzes', icon: FileQuestion, label: 'Quizzes' },
    { id: 'diagrams', icon: LayoutDashboard, label: 'Diagrams' },
    { id: 'mindmap', icon: LayoutDashboard, label: 'Mind Map' },
    { id: 'videos', icon: Play, label: 'Study Shorts' },
    { id: 'history', icon: History, label: 'History' },
];

export default function Sidebar({
    files,
    isParsing,
    onUpload,
    onRemove,
    userEmail,
    activeTab,
    onTabChange
}: SidebarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showFilePanel, setShowFilePanel] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

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
        <>
            <aside className="w-20 glass-sidebar flex flex-col h-full py-6">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                </div>

                {/* Navigation Icons */}
                <nav className="flex-1 flex flex-col items-center space-y-2">
                    {/* Upload Button */}
                    <button
                        onClick={() => setShowFilePanel(!showFilePanel)}
                        className={`icon-btn group relative ${showFilePanel ? 'active' : ''}`}
                        title="Upload Files"
                    >
                        <Upload className={`w-5 h-5 ${showFilePanel ? 'text-gray-900' : 'text-gray-500'}`} />

                        {/* File count badge */}
                        {files.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {files.length}
                            </span>
                        )}

                        {/* Parsing indicator */}
                        {isParsing && (
                            <span className="absolute -top-1 -right-1 w-4 h-4">
                                <span className="animate-ping absolute w-4 h-4 rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative block w-4 h-4 rounded-full bg-blue-500"></span>
                            </span>
                        )}

                        <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                            Upload Files
                        </span>
                    </button>

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`icon-btn group relative ${isActive ? 'active' : ''}`}
                                title={item.label}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-500'}`} />

                                <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                    {item.label}
                                </span>
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
                <div className="flex flex-col items-center space-y-2 mt-auto">
                    <button
                        onClick={() => onTabChange('settings')}
                        className={`icon-btn ${activeTab === 'settings' ? 'active' : ''}`}
                        title="Settings"
                    >
                        <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-gray-900' : 'text-gray-500'}`} />
                    </button>

                    {/* User Avatar */}
                    <div
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-medium text-sm cursor-pointer hover:shadow-lg transition-shadow"
                        title={userEmail}
                    >
                        {userEmail ? userEmail[0].toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                </div>
            </aside>

            {/* File Upload Panel */}
            {showFilePanel && (
                <div className="w-72 glass-sidebar flex flex-col h-full py-6 px-4 border-l border-white/20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Documents</h3>
                        <button
                            onClick={() => setShowFilePanel(false)}
                            className="p-1 hover:bg-gray-100 rounded-lg"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`drop-zone rounded-xl p-6 text-center cursor-pointer mb-4 ${isDragging ? 'dragging' : ''}`}
                    >
                        {isParsing ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                <span className="text-sm text-gray-600">Processing...</span>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">
                                    Drop files here or <span className="text-amber-600">browse</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT</p>
                            </>
                        )}
                    </div>

                    {/* File List */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                        <p className="text-xs text-gray-500 font-medium">
                            {files.length} file(s) uploaded
                        </p>
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center gap-2 p-2 bg-white/50 rounded-lg hover:bg-white transition-colors"
                            >
                                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700 truncate flex-1">{file.filename}</span>
                                <button
                                    onClick={() => onRemove(file.id)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <X className="w-3 h-3 text-gray-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
