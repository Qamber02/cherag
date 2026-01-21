/**
 * TypeScript Type Definitions
 * Shared types across the mobile application
 */

// User & Authentication
export interface User {
    id: string;
    email: string;
    created_at: string;
}

export interface Session {
    access_token: string;
    refresh_token: string;
    user: User;
}

// Documents
export interface Document {
    id: string;
    user_id: string;
    filename: string;
    file_type: string;
    file_path?: string;
    file_size?: number;
    content: string;
    created_at: string;
}

// Chat
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export interface Chat {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
}

// Flashcards
export interface Flashcard {
    id: string;
    question: string;
    answer: string;
    status?: 'new' | 'learning' | 'mastered';
}

// Quizzes
export interface Quiz {
    id: string;
    question: string;
    options: string[];
    correct_answer: string; // 'A', 'B', 'C', or 'D'
    explanation: string;
    answered?: boolean;
    user_answer?: string | null;
}

// Mind Map / Roadmap
export interface RoadmapNode {
    id: string;
    title: string;
    description?: string;
    type: 'main' | 'topic' | 'subtopic';
    children?: RoadmapNode[];
}

// Videos / Study Shorts
export interface Video {
    id: string;
    title: string;
    thumbnail: string;
    channel?: string;
    relevanceScore?: number;
}

// Activity History
export interface ActivityItem {
    id: string;
    activity_type: 'summary' | 'flashcard' | 'quiz' | 'mindmap' | 'chat' | 'video';
    title: string;
    content_preview: string;
    created_at: string;
}

// Summary Options
export interface SummaryOptions {
    length: 'short' | 'medium' | 'detailed';
    style: 'bullet' | 'paragraph' | 'mixed';
    focus?: string;
}

// API Response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> {
    result: T[];
    nextPageToken?: string | null;
}

// UI State types
export interface LoadingState {
    isLoading: boolean;
    error: string | null;
}

// Theme
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserPreferences {
    theme: ThemeMode;
    lastActiveTab: string;
}

// Navigation
export type RootStackParamList = {
    '(auth)': undefined;
    '(main)': undefined;
};

export type AuthStackParamList = {
    login: undefined;
    register: undefined;
    'forgot-password': undefined;
};

export type MainTabParamList = {
    index: undefined;
    chat: undefined;
    summary: undefined;
    flashcards: undefined;
    quizzes: undefined;
    mindmap: undefined;
    videos: undefined;
    history: undefined;
    settings: undefined;
};
