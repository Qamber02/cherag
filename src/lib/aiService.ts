// Cherág AI Service - Thin Client Proxy
// All AI orchestration is now handled by the FastAPI backend on Railway
// This service simply proxies requests with Supabase authentication

import { supabase } from './supabaseClient';

// Railway API Base URL
const API_BASE = 'https://api-cherag.up.railway.app';

// =============================================================================
// Types
// =============================================================================

export interface VideoResult {
    id: string;
    title: string;
    thumbnail: string;
    channel?: string;
    relevanceScore?: number;
    duration?: string;
}

export interface Flashcard {
    question: string;
    answer: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
}

export interface MindMapNode {
    title: string;
    children?: MindMapNode[];
}

export interface RoadmapNode {
    id: string;
    title: string;
    description?: string;
    type: 'main' | 'topic' | 'subtopic';
    children?: RoadmapNode[];
}

// =============================================================================
// Authentication Helper
// =============================================================================

async function getAuthHeaders(): Promise<Headers> {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
        throw new Error('Authentication required. Please log in.');
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${session.access_token}`);

    return headers;
}

async function apiRequest<T>(
    endpoint: string,
    body: Record<string, unknown>
): Promise<T> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.detail || `Request failed: ${response.statusText}`;

        if (response.status === 401) {
            throw new Error('Session expired. Please log in again.');
        }
        if (response.status === 503) {
            throw new Error('AI service temporarily unavailable. Please try again.');
        }

        throw new Error(message);
    }

    return response.json();
}

// =============================================================================
// AI Service Functions
// =============================================================================

/**
 * Generate a summary of the provided content
 */
export async function generateSummary(
    context: string,
    options?: { length?: string; style?: string; focus?: string }
): Promise<string> {
    const response = await apiRequest<{ summary: string }>('/generate-summary', {
        context,
        length: options?.length,
        style: options?.style,
        focus: options?.focus
    });

    return response.summary;
}

/**
 * Generate flashcards from the provided content
 */
export async function generateFlashcards(
    context: string
): Promise<Flashcard[]> {
    const response = await apiRequest<{ flashcards: Flashcard[] }>('/generate-flashcards', {
        context
    });

    return response.flashcards;
}

/**
 * Generate quiz questions from the provided content
 */
export async function generateQuizzes(
    context: string,
    options: { count?: number; difficulty?: string; seed?: number; forceRefresh?: boolean } = {}
): Promise<QuizQuestion[]> {
    const response = await apiRequest<{ quizzes: QuizQuestion[] }>('/generate-quizzes', {
        context,
        count: options.count,
        difficulty: options.difficulty,
        force_refresh: options.forceRefresh
    });

    return response.quizzes;
}

/**
 * Generate a mindmap structure from the provided content
 */
export async function generateMindMap(
    context: string
): Promise<MindMapNode> {
    const response = await apiRequest<{ mindmap: MindMapNode }>('/generate-mindmap', {
        context
    });

    return response.mindmap;
}

/**
 * Search for educational YouTube videos related to the topic
 */
export async function generateVideos(
    topic: string,
    pageToken?: string | null
): Promise<{ result: VideoResult[]; nextPageToken: string | null }> {
    const response = await apiRequest<{ result: VideoResult[]; next_page_token: string | null }>('/generate-videos', {
        topic,
        page_token: pageToken
    });

    return {
        result: response.result,
        nextPageToken: response.next_page_token
    };
}

/**
 * Chat with AI about the study content
 */
export async function chatWithAI(
    context: string,
    query: string
): Promise<string> {
    const response = await apiRequest<{ response: string }>('/chat', {
        context,
        query
    });

    return response.response;
}

/**
 * Generate a learning roadmap from the provided content
 */
export async function generateRoadmap(
    context: string
): Promise<RoadmapNode> {
    const response = await apiRequest<{ roadmap: RoadmapNode }>('/generate-roadmap', {
        context
    });

    return response.roadmap;
}

/**
 * Get an explanation for a specific node in the roadmap
 */
export async function getNodeExplanation(
    title: string,
    description: string
): Promise<string> {
    const response = await apiRequest<{ explanation: string }>('/get-node-explanation', {
        title,
        description
    });

    return response.explanation;
}

// =============================================================================
// Legacy Exports (for backward compatibility)
// =============================================================================

// Note: Image generation is not yet supported in the backend
// This is a placeholder that returns null
export async function generateImageWithGemini(_prompt: string): Promise<string | null> {
    console.warn('[aiService] Image generation not yet available via backend');
    return null;
}
