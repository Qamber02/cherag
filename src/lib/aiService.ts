// Advanced AI Service with multiple models, rate limiting, and fallbacks
import { rateLimiter } from './rateLimiter';
import { generateCacheKey, getFromCache, saveToCache } from './cacheService';
import { keyManager } from './keyManager';
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

// Call OpenRouter with Key Rotation
async function callOpenRouter(prompt: string): Promise<string | null> {
    const apiKey = keyManager.getKey('openrouter');
    if (!apiKey) return null;

    try {
        console.log(`[AI] Trying OpenRouter molmo-2-8b:free...`);

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
                console.log(`[AI] ✅ Success with OpenRouter`);
                return content;
            }
        }

        if (response.status === 429) {
            console.warn(`[AI] OpenRouter Rate Limit (429). Rotating key...`);
            keyManager.markRateLimited('openrouter');
            // Recursive retry with new key
            return callOpenRouter(prompt);
        }

        console.warn(`[AI] OpenRouter error:`, response.status);
    } catch (_err) {
        console.warn(`[AI] OpenRouter failed:`, _err);
    }
    return null;
}

// Call DeepSeek
async function callDeepSeek(prompt: string, _taskType: string = 'general'): Promise<string | null> {
    const apiKey = keyManager.getKey('deepseek');
    if (!apiKey) return null;

    try {
        console.log(`[AI] Trying DeepSeek (deepseek-chat)...`);
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
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

        // Handle specific error codes
        if (response.status === 402 || data.error?.code === 402) {
            console.warn(`[AI] DeepSeek Payment Required (402). Disabling provider for this session.`);
            // Optionally remove key or mark as failed globally
            return null; // Don't retry
        }

        if (response.status === 429) {
            console.warn(`[AI] DeepSeek Rate Limit (429). Rotating key...`);
            keyManager.markRateLimited('deepseek');
            return callDeepSeek(prompt, _taskType);
        }

        console.warn(`[AI] DeepSeek error:`, data);
        return null; // Move to next provider
    } catch (_e) {
        console.warn(`[AI] DeepSeek failed:`, _e);
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

    // 2. DeepSeek (Default robust generic) - if not already tried or failed
    if (preferred !== 'deepseek') {
        const result = await callDeepSeek(sanitizedPrompt, taskType);
        if (result) return result;
    }

    // 3. OpenRouter (Free) - if not already tried
    if (preferred !== 'openrouter') {
        const openRouterResult = await callOpenRouter(sanitizedPrompt);
        if (openRouterResult) return openRouterResult;
    }

    // 4. Gemini Fallback Loop
    // We iterate through models, and for each model, we try the current key.
    // If key fails (429), we rotate key and try same model again.
    // If model fails (other error), we move to next model.
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const model = GEMINI_MODELS[i];

        let attempts = 0;
        const MAX_RETRIES_PER_MODEL = 2; // Try up to 2 keys per model before moving to next model

        while (attempts < MAX_RETRIES_PER_MODEL) {
            const apiKey = keyManager.getKey('gemini');
            if (!apiKey) break; // Should not happen unless config missing

            try {
                console.log(`[AI] Trying Gemini model: ${model}`);
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

                if (response.status === 429 || data.error?.code === 429 || data.error?.message?.includes('quota')) {
                    console.warn(`[AI] Rate limit on ${model}, rotating key...`);
                    keyManager.markRateLimited('gemini');
                    attempts++;
                    continue; // Retry with new key
                }

                // If it's not a rate limit, it's a model error (e.g. overloaded), so break inner loop to try next model
                throw new Error(data.error?.message || 'Gemini error');
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.warn(`[AI] Failed with ${model}:`, errorMessage);
                break; // Break inner loop, try next model
            }
        }
    }

    // 5. Hugging Face Fallback
    console.log('[AI] All Gemini models failed, trying Hugging Face...');
    try {
        return await callHuggingFace(prompt, taskType);
    } catch (_e) {
        console.warn('[AI] Hugging Face failed, trying mock fallback...');
    }

    // 6. Final Fallback: Mock Data (Demo Mode)
    console.warn('[AI] ⚠️ All APIs failed. Using MOCK fallback.');
    return await tryMockFallback(prompt, taskType);
}

// Mock Fallback for when all APIs fail
async function tryMockFallback(_prompt: string, taskType: string): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (taskType === 'summary') {
        return `## ⚠️ Offline Mode: Summary
        
**Note: AI services are currently unreachable. Displaying fallback content.**

### Key Concepts
*   **System Resilience**: The ability of a system to handle failures gracefully.
*   **Fallback Mechanisms**: Strategies like "Simulation Mode" to keep the UI functional.
*   **User Experience**: Ensuring the user knows why data is generic (e.g., connectivity issues).

> "Reliability is not about never failing, but about recovering quickly."

### Next Steps
1. Check your internet connection.
2. Verify API keys in settings.
3. Try again in a few minutes.`;
    }

    if (taskType === 'flashcards') {
        const mockCards = [
            { question: "What is 'Simulation Mode'?", answer: "A fallback state when AI services are offline." },
            { question: "Why is this happening?", answer: "Network issues or API rate limits." },
            { question: "How do I fix it?", answer: "Check your API keys or wait for the quota to reset." },
            { question: "Is my data safe?", answer: "Yes, your local data is preserved." },
            { question: "Can I still study?", answer: "Yes, you can review existing materials." }
        ];
        return JSON.stringify(mockCards);
    }

    if (taskType === 'quizzes') {
        const mockQuiz = [
            {
                question: "Which component manages API keys?",
                options: ["A) KeyManager", "B) RateLimiter", "C) Dashboard", "D) App.tsx"],
                correct_answer: "A",
                explanation: "The KeyManager class handles key rotation and failover."
            },
            {
                question: "What does HTTP 429 mean?",
                options: ["A) Not Found", "B) Server Error", "C) Too Many Requests", "D) Unauthorized"],
                correct_answer: "C",
                explanation: "429 indicates that the API rate limit has been exceeded."
            },
            {
                question: "What is the primary fallback model?",
                options: ["A) GPT-4", "B) Claude 3", "C) DeepSeek", "D) Hugging Face"],
                correct_answer: "D",
                explanation: "Hugging Face is used as a fallback when Gemini fails."
            }
        ];
        return JSON.stringify(mockQuiz);
    }

    if (taskType === 'chat') {
        return "I'm currently in **Offline Simulation Mode**. \n\nI can't process new text right now, but I'm here to tell you that the app is still working! Please check your connection or API keys.";
    }

    if (taskType === 'mindmap') {
        return JSON.stringify({
            title: "Offline Mode",
            children: [
                { title: "Check Connection" },
                { title: "Verify API Keys" },
                { title: "Wait for Quota Reset" }
            ]
        });
    }

    return "AI Service Unavailable (Simulated Response)";
}

// Hugging Face fallback
async function callHuggingFace(prompt: string, taskType: string): Promise<string> {
    const apiKey = keyManager.getKey('huggingface');
    if (!apiKey) {
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
                    'Authorization': `Bearer ${apiKey}`,
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

        if (response.status === 429 || data.error?.includes('Rate limit')) {
            console.warn(`[AI] HuggingFace Rate Limit (429). Rotating key...`);
            keyManager.markRateLimited('huggingface');
            return callHuggingFace(prompt, taskType);
        }

        throw new Error('Unexpected Hugging Face response format');
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Hugging Face error:', errorMessage);
        throw new Error(`All AI providers failed: ${errorMessage}`);
    }
}

// Gemini Image Generation
export async function generateImageWithGemini(prompt: string): Promise<string | null> {
    const apiKey = keyManager.getKey('gemini');
    if (!apiKey) return null;

    try {
        console.log('[AI] Generating image with Gemini...');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
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
    } catch (_err) {
        console.warn('[AI] Gemini image generation failed:', _err);
        return null;
    }
}

// Task-specific functions with validation and rate limiting

// Helper to extract JSON from AI response
function extractJson(text: string): string {
    // Remove markdown code blocks first
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Try to find array `[...]`
    const startArray = cleaned.indexOf('[');
    const endArray = cleaned.lastIndexOf(']');

    // Try to find object `{...}`
    const startObject = cleaned.indexOf('{');
    const endObject = cleaned.lastIndexOf('}');

    // Determine which outer structure appears first
    if (startArray !== -1 && (startObject === -1 || startArray < startObject)) {
        if (endArray !== -1 && endArray > startArray) {
            return cleaned.substring(startArray, endArray + 1);
        }
    } else if (startObject !== -1) {
        if (endObject !== -1 && endObject > startObject) {
            return cleaned.substring(startObject, endObject + 1);
        }
    }

    return cleaned;
}

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
    const cleaned = extractJson(result);

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error('Not an array');

        // Only cache if NOT a simulated response (simple check for mock structure)
        const isMock = Array.isArray(parsed) && parsed[0]?.answer?.includes('Simulated Mode');

        if (!isMock) {
            saveToCache(cacheKey, parsed, 'flashcards');
        }

        return parsed;
    } catch (_err) {
        // If parsing fails, create simple flashcards from text
        console.warn('Failed to parse flashcards JSON, creating fallback');
        return [{
            question: "What are the main topics in this content?",
            answer: sanitized.slice(0, 200) + "..."
        }];
    }
}

export async function generateQuizzes(context: string, options: { count?: number; difficulty?: string; seed?: number } = {}): Promise<Array<{ question: string, options: string[], correct_answer: string, explanation: string }>> {
    const sanitized = sanitizeInput(context);
    const count = options.count || 5;
    const difficulty = options.difficulty || 'medium';
    // Use seed to make cache key unique if provided
    const seed = options.seed || ''; // Empty string if no seed, uses standard caching

    // Check cache first - include options and seed in key
    const cacheKey = generateCacheKey(`${sanitized}-${count}-${difficulty}-${seed}`, 'quizzes');

    // If a seed is provided, we might still want to check if we have THIS specific random iteration cached (unlikely but safe)
    // Or we could strictly bypass cache. Using it in the key is safer/standard.
    const cached = getFromCache<Array<{ question: string, options: string[], correct_answer: string, explanation: string }>>(cacheKey);
    if (cached) {
        console.log('[AI] Using cached quizzes');
        return cached;
    }

    await rateLimiter.waitForToken('quizzes');

    const difficultyPrompt = difficulty === 'hard'
        ? "Make questions challenging, focusing on analysis, synthesis, and deep understanding."
        : difficulty === 'easy'
            ? "Make questions straightforward, focusing on basic definitions and core concepts."
            : "Make questions of medium difficulty, focusing on application and understanding.";

    // Add seed instructions to the prompt to encourage variance at the model level too
    const varianceInstruction = seed
        ? `Ensure questions are COMPLETELY different from any standard or previous questions. Random seed: ${seed}. Be creative and explore different angles of the topic.`
        : 'Generate fresh, unique questions.';

    const prompt = `Generate ${count} multiple choice questions as a JSON array. 
Format: [{"question": "...", "options": ["A) text", "B) text", "C) text", "D) text"], "correct_answer": "A", "explanation": "..."}]

CRITICAL RULES:
1. correct_answer must be just the letter (A, B, C, or D)
2. VARY the correct answers - do NOT make all answers the same letter! Mix A, B, C, and D throughout the quiz.
3. Each option should start with its letter like "A) answer text"
4. Make questions educational and relevant to the content.
5. Difficulty Level: ${difficulty}. ${difficultyPrompt}
6. No markdown, ONLY valid JSON array
7. UNIQUE CONTENT: Do not reuse common questions.
${varianceInstruction}

Text:
${sanitized}`;

    const result = await callGeminiWithFallback(prompt, 'quizzes');
    const cleaned = extractJson(result);

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error('Not an array');

        // Only cache if NOT a simulated response
        const isMock = Array.isArray(parsed) && parsed[0]?.explanation?.includes('Simulation Mode');

        if (!isMock) {
            saveToCache(cacheKey, parsed, 'quizzes');
        }

        return parsed;
    } catch (_err) {
        console.warn('Failed to parse quizzes JSON. Raw:', result);
        throw new Error('Failed to generate quizzes. Please try again.');
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateMindMap(context: string): Promise<{ title: string, children: any[] }> {
    await rateLimiter.waitForToken('mindmap');

    const sanitized = sanitizeInput(context, 5000);
    const prompt = `Create a simple mind map as JSON.
Format: {"title": "Main Topic", "children": [{"title": "Subtopic 1"}, {"title": "Subtopic 2"}]}
Max 2 levels deep. No markdown, ONLY valid JSON.

Text:
${sanitized}`;

    const result = await callGeminiWithFallback(prompt, 'general');
    const cleaned = extractJson(result);

    try {
        return JSON.parse(cleaned);
    } catch (_err) {
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (_err: any) {
        console.error('Video generation error:', _err);
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
