/**
 * AI Service for React Native
 * Handles Gemini API calls with rate limiting and caching
 */

import { cacheStorage } from './storage';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Available models in priority order
const GEMINI_MODELS = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
];

interface GeminiResponse {
    candidates?: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
    error?: { message: string; code?: number };
}

// Simple rate limiter
const rateLimiter = {
    tokens: 10,
    lastRefill: Date.now(),
    refillRate: 10 / 60, // 10 per minute

    tryConsume(): boolean {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(10, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    },
};

/**
 * Generate cache key from content
 */
const generateCacheKey = (content: string, type: string): string => {
    let hash = 0;
    const str = content.slice(0, 500);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return `${type}_${Math.abs(hash).toString(36)}`;
};

/**
 * Call Gemini API with fallback models
 */
async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
    }

    // Check rate limit
    if (!rateLimiter.tryConsume()) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
    }

    let lastError: Error | null = null;

    for (const model of GEMINI_MODELS) {
        try {
            const response = await fetch(
                `${GEMINI_API_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                    }),
                }
            );

            const data: GeminiResponse = await response.json();

            if (!response.ok) {
                // Try next model if rate limited
                if (data.error?.code === 429) {
                    console.log(`[AI] ${model} rate limited, trying next`);
                    continue;
                }
                throw new Error(data.error?.message || 'API error');
            }

            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (error) {
            lastError = error as Error;
            console.log(`[AI] ${model} failed:`, (error as Error).message);
        }
    }

    throw lastError || new Error('All AI models failed');
}

/**
 * Generate summary from document content
 */
export async function generateSummary(
    context: string,
    options?: { length?: string; style?: string }
): Promise<string> {
    const cacheKey = generateCacheKey(context, 'summary');
    const cached = await cacheStorage.get<string>(cacheKey);
    if (cached) {
        console.log('[AI] Summary cache hit');
        return cached;
    }

    const lengthGuide =
        options?.length === 'short'
            ? 'Keep it under 200 words.'
            : options?.length === 'detailed'
                ? 'Provide comprehensive coverage with examples.'
                : 'Aim for a balanced summary.';

    const styleGuide =
        options?.style === 'bullet'
            ? 'Use bullet points exclusively.'
            : options?.style === 'paragraph'
                ? 'Write in flowing paragraphs.'
                : 'Mix paragraphs with bullet points for key items.';

    const prompt = `Summarize this text for a student. Use **bold** for key terms.
${lengthGuide} ${styleGuide}

Text:
${context.slice(0, 10000)}`;

    const result = await callGemini(prompt);
    await cacheStorage.set(cacheKey, result, 30 * 60 * 1000); // 30 min cache
    return result;
}

/**
 * Generate flashcards from content
 */
export async function generateFlashcards(
    context: string
): Promise<Array<{ question: string; answer: string }>> {
    const cacheKey = generateCacheKey(context, 'flashcards');
    const cached = await cacheStorage.get<Array<{ question: string; answer: string }>>(cacheKey);
    if (cached) {
        console.log('[AI] Flashcards cache hit');
        return cached;
    }

    const prompt = `Generate 5 study flashcards as a JSON array.
Format: [{"question": "...", "answer": "..."}]
No markdown, just pure JSON.

Text:
${context.slice(0, 8000)}`;

    const result = await callGemini(prompt);
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    await cacheStorage.set(cacheKey, parsed, 60 * 60 * 1000); // 1 hour cache
    return parsed;
}

/**
 * Generate quiz questions from content
 */
export async function generateQuizzes(
    context: string
): Promise<
    Array<{
        question: string;
        options: string[];
        correct_answer: string;
        explanation: string;
    }>
> {
    const cacheKey = generateCacheKey(context, 'quizzes');
    const cached = await cacheStorage.get<
        Array<{
            question: string;
            options: string[];
            correct_answer: string;
            explanation: string;
        }>
    >(cacheKey);
    if (cached) {
        console.log('[AI] Quizzes cache hit');
        return cached;
    }

    const prompt = `Generate 5 multiple choice questions from this text as a JSON array.
Format: [{"question": "...", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "A", "explanation": "..."}]
- Each question has exactly 4 options
- correct_answer is just the letter (A, B, C, or D)
- Include brief explanations
No markdown, just pure JSON.

Text:
${context.slice(0, 8000)}`;

    const result = await callGemini(prompt);
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    await cacheStorage.set(cacheKey, parsed, 60 * 60 * 1000);
    return parsed;
}

/**
 * Generate mind map / learning roadmap
 */
export async function generateMindMap(
    context: string
): Promise<{ title: string; children: any[] }> {
    const cacheKey = generateCacheKey(context, 'mindmap');
    const cached = await cacheStorage.get<{ title: string; children: any[] }>(cacheKey);
    if (cached) {
        console.log('[AI] MindMap cache hit');
        return cached;
    }

    const prompt = `Create a learning roadmap structure from this text as JSON.
Format: {"title": "Main Topic", "children": [{"title": "Subtopic 1", "description": "Brief desc", "children": [...]}, ...]}
- Include all key concepts
- Max 3 levels deep
- Add brief descriptions for topics
No markdown, just pure JSON.

Text:
${context.slice(0, 8000)}`;

    const result = await callGemini(prompt);
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    await cacheStorage.set(cacheKey, parsed, 60 * 60 * 1000);
    return parsed;
}

/**
 * Chat with AI about the document
 */
export async function chatWithAI(context: string, query: string): Promise<string> {
    const prompt = `You are Cherág, a helpful AI study assistant. Answer based on the provided context.

Context:
${context?.slice(0, 6000) || 'No document context provided'}

Question: ${query}

Provide a helpful, accurate response. If the answer isn't in the context, say so clearly.`;

    return callGemini(prompt);
}

/**
 * Get topic explanation for roadmap nodes
 */
export async function getTopicExplanation(
    topic: string,
    description: string = ''
): Promise<string> {
    const prompt = `Explain this topic briefly for a student:
Topic: ${topic}
${description ? `Context: ${description}` : ''}

Provide a clear, educational explanation in 2-3 paragraphs. Include key points and practical examples if relevant.`;

    return callGemini(prompt);
}

/**
 * Search YouTube videos (uses YouTube API)
 */
export async function searchVideos(
    topic: string,
    pageToken?: string | null
): Promise<{ result: any[]; nextPageToken: string | null }> {
    const youtubeKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
    if (!youtubeKey) {
        throw new Error('YouTube API key not configured');
    }

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        topic
    )} educational&type=video&videoDuration=short&maxResults=10&key=${youtubeKey}`;

    if (pageToken) {
        url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'YouTube API error');
    }

    const videos = (data.items || []).map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        channel: item.snippet.channelTitle,
    }));

    return {
        result: videos,
        nextPageToken: data.nextPageToken || null,
    };
}
