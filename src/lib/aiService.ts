// Advanced AI Service with multiple models, rate limiting, and fallbacks
import { rateLimiter } from './rateLimiter';
import { generateCacheKey, getFromCache, saveToCache } from './cacheService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;

import { getPreference } from './preferencesService';

// OpenRouter model for chat
const MOLMO_MODEL = 'allenai/molmo-2-8b:free';

// Security: Input sanitization
function sanitizeInput(text: string, maxLength: number = 10000): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Remove potential XSS and injection attempts
    return text
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/onerror=/gi, '')
        .slice(0, maxLength)
        .trim();
}

// Gemini Models - ordered by priority (available models)
const GEMINI_MODELS = [
    'gemini-2.0-flash-lite',           // Fastest, most efficient
    'gemini-2.0-flash',                // Fast and capable
    'gemini-2.5-flash',                // Advanced flash
    'gemini-2.5-pro',                  // Most capable (fallback)
];

// Gemini Image Generation Model
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation';

// Hugging Face Models for different tasks
const HF_MODELS = {
    summary: 'facebook/bart-large-cnn',
    chat: 'meta-llama/Llama-3.2-3B-Instruct',
    flashcards: 'mistralai/Mistral-7B-Instruct-v0.2',
    quizzes: 'mistralai/Mistral-7B-Instruct-v0.2',
};

interface GeminiResponse {
    candidates?: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
    error?: { message: string; code?: number };
}

// Call OpenRouter (free molmo model)
const OPENROUTER_KEYS = [
    import.meta.env.VITE_OPENROUTER_API_KEY,
    import.meta.env.VITE_OPENROUTER_API_KEY_2,
    import.meta.env.VITE_OPENROUTER_API_KEY_3
].filter(Boolean);

// Call OpenRouter with Key Rotation
async function callOpenRouter(prompt: string): Promise<string | null> {
    if (OPENROUTER_KEYS.length === 0) return null;

    for (let i = 0; i < OPENROUTER_KEYS.length; i++) {
        const apiKey = OPENROUTER_KEYS[i];
        try {
            console.log(`[AI] Trying OpenRouter molmo-2-8b:free (Key ${i + 1})...`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Cherag Study Assistant'
                },
                body: JSON.stringify({
                    model: MOLMO_MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2000,
                    temperature: 0.5
                })
            });

            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                if (content) {
                    console.log(`[AI] ✅ Success with OpenRouter (Key ${i + 1})`);
                    return content;
                }
            }

            if (response.status === 429) {
                console.warn(`[AI] OpenRouter (Key ${i + 1}) Rate Limit (429). Trying next key...`);
                continue;
            }

            console.warn(`[AI] OpenRouter error (Key ${i + 1}):`, response.status);
        } catch (err) {
            console.warn(`[AI] OpenRouter failed (Key ${i + 1}):`, err);
        }
    }

    console.warn('[AI] All OpenRouter keys exhausted.');
    return null;
}

// Call DeepSeek
async function callDeepSeek(prompt: string, _taskType: string = 'general'): Promise<string | null> {
    if (!DEEPSEEK_API_KEY) return null;

    try {
        console.log(`[AI] Trying DeepSeek (deepseek-chat)...`);
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: "system", content: "You are a helpful study assistant." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.5,
                stream: false
            })
        });

        const data = await response.json();

        if (response.ok && data.choices?.[0]?.message?.content) {
            console.log(`[AI] ✅ Success with DeepSeek`);
            return data.choices[0].message.content;
        }

        console.warn(`[AI] DeepSeek error:`, data);
        return null;
    } catch (e) {
        console.warn(`[AI] DeepSeek failed:`, e);
        return null;
    }
}

// Unified Call Function with Preferences
async function callGeminiWithFallback(prompt: string, taskType: string = 'general'): Promise<string> {
    // Security: Sanitize prompt
    const sanitizedPrompt = sanitizeInput(prompt, 15000);
    if (!sanitizedPrompt) throw new Error('Invalid input provided');

    const preferred = getPreference('aiModel');

    // 1. Try Preferred Model First
    if (preferred === 'deepseek') {
        const result = await callDeepSeek(sanitizedPrompt, taskType);
        if (result) return result;
    } else if (preferred === 'openrouter') {
        const result = await callOpenRouter(sanitizedPrompt);
        if (result) return result;
    }
    // Note: Gemini preference handled in fallback loop or could be explicit here, 
    // but the fallback loop is Gemini-centric anyway.

    // 2. DeepSeek (Default robust generic) - if not already tried or failed
    if (preferred !== 'deepseek' && DEEPSEEK_API_KEY) {
        const result = await callDeepSeek(sanitizedPrompt, taskType);
        if (result) return result;
    }

    // 3. OpenRouter (Free) - if not already tried
    if (preferred !== 'openrouter') {
        const openRouterResult = await callOpenRouter(sanitizedPrompt);
        if (openRouterResult) return openRouterResult;
    }

    // 4. Gemini Fallback Loop
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const model = GEMINI_MODELS[i];
        try {
            console.log(`[AI] Trying Gemini model: ${model}`);
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: sanitizedPrompt }] }]
                    })
                }
            );

            const data: GeminiResponse = await response.json();

            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                console.log(`[AI] ✅ Success with ${model}`);
                return data.candidates[0].content.parts[0].text;
            }

            if (data.error?.code === 429 || data.error?.message?.includes('quota')) {
                console.warn(`[AI] Rate limit on ${model}, trying next...`);
                continue;
            }
            throw new Error('AI service temporarily unavailable.');
        } catch (err: any) {
            console.warn(`[AI] Failed with ${model}:`, err.message);
            if (i === GEMINI_MODELS.length - 1) {
                // All Gemini failed
                console.log('[AI] All Gemini models failed, trying Hugging Face...');
                try {
                    return await callHuggingFace(prompt, taskType);
                } catch (e) {
                    console.warn('[AI] Hugging Face failed, trying mock fallback...');
                }
            }
        }
    }

    // 5. Final Fallback: Mock Data (Demo Mode)
    console.warn('[AI] ⚠️ All APIs failed. Using MOCK fallback.');
    return await tryMockFallback(prompt, taskType);
}

// Mock Fallback for when all APIs fail
async function tryMockFallback(_prompt: string, taskType: string): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (taskType === 'summary') {
        return `## Summary (Simulated)
        
**Note: All AI services are currently unavailable. This is a simulated response.**

The text discusses key educational concepts. It likely covers:
*   **Fundamental Principles**: The core ideas of the subject.
*   **Applications**: How these principles are used in practice.
*   **Implications**: The broader impact of understanding these topics.

This fallback ensures you can still see the UI layout while we reconnect to the AI services.`;
    }

    if (taskType === 'flashcards') {
        const mockCards = [
            { question: "What is the status of the AI service?", answer: "Currently offline (Simulated Mode)" },
            { question: "Why am I seeing this?", answer: "To preserve app functionality during API outages." },
            { question: "How does the fallback work?", answer: "It returns predefined data structures." },
            { question: "Is this a real flashcard?", answer: "No, it is a placeholder." },
            { question: "What should I do?", answer: "Check your API keys or wait for rate limits to reset." }
        ];
        return JSON.stringify(mockCards);
    }

    if (taskType === 'quizzes') {
        const mockQuiz = [
            {
                question: "What is the current mode of the application?",
                options: ["A) Live Mode", "B) Simulation Mode", "C) Offline Mode", "D) Debug Mode"],
                correct_answer: "B",
                explanation: "All external APIs failed, so the system switched to Simulation Mode."
            },
            {
                question: "Which component handles this fallback?",
                options: ["A) Dashboard.tsx", "B) aiService.ts", "C) main.tsx", "D) App.tsx"],
                correct_answer: "B",
                explanation: "The aiService.ts file contains the tryMockFallback function."
            }
        ];
        return JSON.stringify(mockQuiz);
    }

    if (taskType === 'chat') {
        return "I am currently in **Offline Simulation Mode** because I cannot reach my AI brain (DeepSeek/Gemini). I can't answer specific questions about your text right now, but I'm still here! 🤖";
    }

    return "AI Service Unavailable (Simulated Response)";
}

// Hugging Face fallback
async function callHuggingFace(prompt: string, taskType: string): Promise<string> {
    if (!HUGGINGFACE_API_KEY) {
        throw new Error('AI service configuration error. Please contact support.');
    }

    const model = HF_MODELS[taskType as keyof typeof HF_MODELS] || HF_MODELS.chat;

    const baseUrl = import.meta.env.DEV ? '/api/hf' : 'https://router.huggingface.co';

    try {
        console.log(`Using Hugging Face model: ${model}`);

        const response = await fetch(
            `${baseUrl}/models/${model}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 1000,
                        temperature: 0.7,
                    }
                })
            }
        );

        const data = await response.json();

        if (Array.isArray(data) && data[0]?.generated_text) {
            return data[0].generated_text;
        } else if (data.summary_text) {
            return data.summary_text;
        }

        throw new Error('Unexpected Hugging Face response format');
    } catch (err: any) {
        console.error('Hugging Face error:', err);
        throw new Error(`All AI providers failed: ${err.message}`);
    }
}

// Gemini Image Generation
export async function generateImageWithGemini(prompt: string): Promise<string | null> {
    if (!GEMINI_API_KEY) return null;

    try {
        console.log('[AI] Generating image with Gemini...');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        responseModalities: ["image", "text"]
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.warn('[AI] Gemini image error:', data.error?.message);
            return null;
        }

        // Extract image from response
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
                const imageData = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;
                console.log('[AI] ✅ Image generated with Gemini');
                return `data:${mimeType};base64,${imageData}`;
            }
        }

        console.warn('[AI] No image in Gemini response');
        return null;
    } catch (err) {
        console.warn('[AI] Gemini image generation failed:', err);
        return null;
    }
}

// Task-specific functions with validation and rate limiting

export async function generateSummary(context: string, options?: { length?: string; style?: string; focus?: string }): Promise<string> {
    const sanitized = sanitizeInput(context);

    // Check cache first
    const cacheKey = generateCacheKey(sanitized + JSON.stringify(options || {}), 'summary');
    const cached = getFromCache<string>(cacheKey);
    if (cached) {
        console.log('[AI] Using cached summary');
        return cached;
    }

    await rateLimiter.waitForToken('summary');

    // Build customized instructions based on options
    let lengthInstruction = 'medium length (4-5 paragraphs)';
    let styleInstruction = 'Use a balanced mix of bullet points for lists and paragraphs for explanations.';
    let focusInstruction = '';

    if (options?.length === 'short') {
        lengthInstruction = 'very brief and concise (2-3 paragraphs max)';
    } else if (options?.length === 'detailed') {
        lengthInstruction = 'comprehensive, detailed, and in-depth';
    }

    if (options?.style === 'bullet') {
        styleInstruction = 'STRICT FORMATTING RULE: Use BULLET POINTS ONLY. Do NOT use paragraphs. Break down every concept into bulleted lists.';
    } else if (options?.style === 'paragraph') {
        styleInstruction = 'STRICT FORMATTING RULE: Use PARAGRAPHS ONLY. Do NOT use bullet points. Write in full, flowing sentences.';
    }

    if (options?.focus) {
        focusInstruction = `Focus specifically on: ${options.focus}.`;
    }

    const prompt = `Create a ${lengthInstruction} summary of this text for a student.

**CRITICAL FORMATTING RULES:**
1. ${styleInstruction}
2. Use **bold** for key terms and important concepts.
3. Include section headers using ## for organization.
4. Highlight definitions and core concepts.

${focusInstruction}

Text:
${sanitized}`;

    const result = await callGeminiWithFallback(prompt, 'summary');

    // Only cache if NOT a simulated response
    if (!result.includes('(Simulated)')) {
        saveToCache(cacheKey, result, 'summary');
    }

    return result;
}

export async function generateFlashcards(context: string): Promise<Array<{ question: string, answer: string }>> {
    const sanitized = sanitizeInput(context);

    // Check cache first
    const cacheKey = generateCacheKey(sanitized, 'flashcards');
    const cached = getFromCache<Array<{ question: string, answer: string }>>(cacheKey);
    if (cached) {
        console.log('[AI] Using cached flashcards');
        return cached;
    }

    await rateLimiter.waitForToken('flashcards');

    const prompt = `Generate 5 study flashcards as a JSON array. Format: [{"question": "...", "answer": "..."}]. No markdown, ONLY valid JSON.

Text:
${sanitized}`;

    const result = await callGeminiWithFallback(prompt, 'flashcards');
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error('Not an array');

        // Only cache if NOT a simulated response (simple check for mock structure)
        const isMock = Array.isArray(parsed) && parsed[0]?.answer?.includes('Simulated Mode');

        if (!isMock) {
            saveToCache(cacheKey, parsed, 'flashcards');
        }

        return parsed;
    } catch (err) {
        // If parsing fails, create simple flashcards from text
        console.warn('Failed to parse flashcards JSON, creating fallback');
        return [{
            question: "What are the main topics in this content?",
            answer: sanitized.slice(0, 200) + "..."
        }];
    }
}

export async function generateQuizzes(context: string): Promise<Array<{ question: string, options: string[], correct_answer: string, explanation: string }>> {
    const sanitized = sanitizeInput(context);

    // Check cache first
    const cacheKey = generateCacheKey(sanitized, 'quizzes');
    const cached = getFromCache<Array<{ question: string, options: string[], correct_answer: string, explanation: string }>>(cacheKey);
    if (cached) {
        console.log('[AI] Using cached quizzes');
        return cached;
    }

    await rateLimiter.waitForToken('quizzes');

    const prompt = `Generate 5 multiple choice questions as a JSON array. 
Format: [{"question": "...", "options": ["A) text", "B) text", "C) text", "D) text"], "correct_answer": "A", "explanation": "..."}]

CRITICAL RULES:
1. correct_answer must be just the letter (A, B, C, or D)
2. VARY the correct answers - do NOT make all answers the same letter! Mix A, B, C, and D throughout the quiz.
3. Each option should start with its letter like "A) answer text"
4. Make questions educational and relevant to the content
5. No markdown, ONLY valid JSON array

Text:
${sanitized}`;

    const result = await callGeminiWithFallback(prompt, 'quizzes');
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error('Not an array');

        // Only cache if NOT a simulated response
        const isMock = Array.isArray(parsed) && parsed[0]?.explanation?.includes('Simulation Mode');

        if (!isMock) {
            saveToCache(cacheKey, parsed, 'quizzes');
        }

        return parsed;
    } catch (err) {
        console.warn('Failed to parse quizzes JSON');
        throw new Error('Failed to generate quizzes. Please try again.');
    }
}



export async function generateMindMap(context: string): Promise<{ title: string, children: any[] }> {
    await rateLimiter.waitForToken('mindmap');

    const sanitized = sanitizeInput(context, 5000);
    const prompt = `Create a simple mind map as JSON.
Format: {"title": "Main Topic", "children": [{"title": "Subtopic 1"}, {"title": "Subtopic 2"}]}
Max 2 levels deep. No markdown, ONLY valid JSON.

Text:
${sanitized}`;

    const result = await callGeminiWithFallback(prompt, 'general');
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        return JSON.parse(cleaned);
    } catch (err) {
        // Fallback structure
        return {
            title: "Study Content",
            children: [
                { title: "Topic 1" },
                { title: "Topic 2" },
                { title: "Topic 3" }
            ]
        };
    }
}

export async function chatWithAI(context: string, query: string): Promise<string> {
    await rateLimiter.waitForToken('chat');

    const sanitizedContext = sanitizeInput(context);
    const sanitizedQuery = sanitizeInput(query, 1000);

    const systemPrompt = `You are Cherág, an AI study assistant. You help students understand their study materials. Be helpful, clear, and educational.`;

    const userPrompt = `Based on this context, answer the question.

Context:
${sanitizedContext || 'No context provided'}

Question: ${sanitizedQuery}`;

    // Fallback to Gemini/DeepSeek/OpenRouter via unified function
    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    return callGeminiWithFallback(prompt, 'chat');
}

// YouTube Video Generation with AI relevance scoring
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export interface VideoResult {
    id: string;
    title: string;
    thumbnail: string;
    channel?: string;
    relevanceScore?: number;
}

export async function generateVideos(topic: string, pageToken?: string | null): Promise<{ result: VideoResult[], nextPageToken: string | null }> {
    await rateLimiter.waitForToken('videos');

    if (!YOUTUBE_API_KEY) {
        throw new Error('YouTube API key not configured');
    }

    try {
        // Extract key topic from content using AI if it's long text
        let searchTopic = topic;

        if (topic.length > 100) {
            // Use AI to extract the main topic from document content
            try {
                const topicPrompt = `Extract the main educational topic from this content in 3-5 keywords for a YouTube search. Only output the keywords, nothing else.

Content: ${topic.slice(0, 1000)}

Keywords:`;

                const extractedTopic = await callGeminiWithFallback(topicPrompt, 'general');
                if (extractedTopic && extractedTopic.length > 3 && extractedTopic.length < 100) {
                    searchTopic = extractedTopic.trim();
                    console.log('[Videos] Extracted topic:', searchTopic);
                }
            } catch {
                // Fallback: use first 50 chars
                searchTopic = topic.slice(0, 50);
            }
        }

        // Clean up search topic
        searchTopic = searchTopic
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log('[Videos] Searching for:', searchTopic);

        // Search YouTube with educational focus
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('q', `${searchTopic} explained tutorial`);
        searchUrl.searchParams.set('type', 'video');
        searchUrl.searchParams.set('maxResults', '15');
        searchUrl.searchParams.set('videoDuration', 'medium'); // Medium length for educational content
        searchUrl.searchParams.set('relevanceLanguage', 'en');
        searchUrl.searchParams.set('safeSearch', 'strict');
        searchUrl.searchParams.set('videoEmbeddable', 'true');
        searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
        if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);

        const response = await fetch(searchUrl.toString());
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'YouTube API error');
        }

        // Filter out irrelevant content by checking titles
        const topicWords = searchTopic.toLowerCase().split(' ').filter(w => w.length > 2);

        const videos: VideoResult[] = (data.items || [])
            .map((item: any) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                channel: item.snippet.channelTitle,
                relevanceScore: calculateRelevance(item.snippet.title, item.snippet.channelTitle, topicWords)
            }))
            .filter((v: VideoResult) => !isClickbaitOrEntertainment(v.title)) // Filter clickbait
            .filter((v: VideoResult) => (v.relevanceScore ?? 0) > 0.35) // Stricter relevance threshold
            .sort((a: VideoResult, b: VideoResult) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
            .slice(0, 10);

        return {
            result: videos,
            nextPageToken: data.nextPageToken || null
        };
    } catch (err: any) {
        console.error('Video generation error:', err);
        return { result: [], nextPageToken: null };
    }
}

// Check if video title suggests clickbait or entertainment (not educational)
function isClickbaitOrEntertainment(title: string): boolean {
    const titleLower = title.toLowerCase();
    const negativePatterns = [
        'challenge', 'prank', 'vlog', 'reaction', 'mukbang', 'asmr',
        'gameplay', 'gaming', 'live stream', 'giveaway', 'unboxing',
        'you won\'t believe', 'shocking', 'gone wrong', 'try not to',
        'tiktok', 'shorts compilation', 'memes', 'roast', 'drama',
        'exposed', 'cancelled', 'dating', 'relationship', 'gossip'
    ];

    return negativePatterns.some(pattern => titleLower.includes(pattern));
}

// Calculate relevance score based on topic match
function calculateRelevance(title: string, channel: string, topicWords: string[]): number {
    const titleLower = title.toLowerCase();
    const channelLower = channel?.toLowerCase() || '';
    let matches = 0;

    // Check topic word matches in title
    for (const word of topicWords) {
        if (titleLower.includes(word)) {
            matches++;
        }
    }

    // Boost for educational keywords
    const eduKeywords = ['tutorial', 'explained', 'learn', 'course', 'lesson', 'guide', 'how to', 'introduction', 'basics', 'beginner', 'complete', 'crash course', 'fundamentals'];
    for (const kw of eduKeywords) {
        if (titleLower.includes(kw)) {
            matches += 0.5;
        }
    }

    // Boost for educational channels
    const eduChannelKeywords = ['academy', 'school', 'university', 'edu', 'learn', 'course', 'tutor', 'class', 'professor', 'khan', 'codecademy'];
    for (const kw of eduChannelKeywords) {
        if (channelLower.includes(kw)) {
            matches += 0.3;
            break;
        }
    }

    // Slight penalty for entertainment indicators
    const entertainmentIndicators = ['funny', 'crazy', 'insane', 'epic', 'amazing', 'incredible'];
    for (const kw of entertainmentIndicators) {
        if (titleLower.includes(kw)) {
            matches -= 0.2;
        }
    }

    return topicWords.length > 0 ? Math.max(0, matches / topicWords.length) : 0.5;
}
