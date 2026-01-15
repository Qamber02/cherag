// Advanced AI Service with multiple models, rate limiting, and fallbacks
import { rateLimiter } from './rateLimiter';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

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
async function callOpenRouter(prompt: string): Promise<string | null> {
    if (!OPENROUTER_API_KEY) return null;

    try {
        console.log('[AI] Trying OpenRouter molmo-2-8b:free...');

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
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
                console.log('[AI] ✅ Success with OpenRouter');
                return content;
            }
        }

        console.warn('[AI] OpenRouter response invalid, falling back...');
        return null;
    } catch (err) {
        console.warn('[AI] OpenRouter failed:', err);
        return null;
    }
}

// Call Gemini with automatic fallback and rate limiting
async function callGeminiWithFallback(prompt: string, taskType: string = 'general'): Promise<string> {
    // Security: Sanitize prompt
    const sanitizedPrompt = sanitizeInput(prompt, 15000);

    if (!sanitizedPrompt) {
        throw new Error('Invalid input provided');
    }

    // Try OpenRouter first (free and no rate limits)
    const openRouterResult = await callOpenRouter(sanitizedPrompt);
    if (openRouterResult) {
        return openRouterResult;
    }

    // Fallback to Gemini models
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

            // If rate limited or quota exceeded, try next model
            if (data.error?.code === 429 || data.error?.message?.includes('quota')) {
                console.warn(`[AI] Rate limit on ${model}, trying next...`);
                continue;
            }

            throw new Error(data.error?.message || 'Gemini API error');
        } catch (err: any) {
            console.warn(`[AI] Failed with ${model}:`, err.message);
            if (i === GEMINI_MODELS.length - 1) {
                // All Gemini models failed, fallback to Hugging Face
                console.log('[AI] All Gemini models failed, trying Hugging Face...');
                return await callHuggingFace(prompt, taskType);
            }
        }
    }

    throw new Error('All AI models failed. Please try again in a few minutes.');
}

// Hugging Face fallback
async function callHuggingFace(prompt: string, taskType: string): Promise<string> {
    if (!HUGGINGFACE_API_KEY) {
        throw new Error('No Hugging Face API key available');
    }

    const model = HF_MODELS[taskType as keyof typeof HF_MODELS] || HF_MODELS.chat;

    try {
        console.log(`Using Hugging Face model: ${model}`);

        const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
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
    await rateLimiter.waitForToken('summary');

    const sanitized = sanitizeInput(context);

    // Build customized instructions based on options
    let lengthInstruction = 'medium length';
    let styleInstruction = 'Use a mix of bullet points and paragraphs';
    let focusInstruction = '';

    if (options?.length === 'short') {
        lengthInstruction = 'brief and concise (2-3 paragraphs max)';
    } else if (options?.length === 'detailed') {
        lengthInstruction = 'comprehensive and detailed';
    }

    if (options?.style === 'bullet') {
        styleInstruction = 'Use bullet points exclusively for easy scanning';
    } else if (options?.style === 'paragraph') {
        styleInstruction = 'Use flowing paragraphs for narrative structure';
    }

    if (options?.focus) {
        focusInstruction = `Focus specifically on: ${options.focus}.`;
    }

    const prompt = `Create a ${lengthInstruction} summary of this text for a student studying for exams.

**Formatting Requirements:**
- Use **bold** for key terms and important concepts
- ${styleInstruction}
- Include section headers using ## for organization
- Highlight definitions and core concepts

${focusInstruction}

Text:
${sanitized}`;

    return callGeminiWithFallback(prompt, 'summary');
}

export async function generateFlashcards(context: string): Promise<Array<{ question: string, answer: string }>> {
    await rateLimiter.waitForToken('flashcards');

    const sanitized = sanitizeInput(context);
    const prompt = `Generate 5 study flashcards as a JSON array. Format: [{"question": "...", "answer": "..."}]. No markdown, ONLY valid JSON.

Text:
${sanitized}`;

    const result = await callGeminiWithFallback(prompt, 'flashcards');
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error('Not an array');
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
    await rateLimiter.waitForToken('quizzes');

    const sanitized = sanitizeInput(context);
    const prompt = `Generate 5 multiple choice questions as a JSON array. 
Format: [{"question": "...", "options": ["A text", "B text", "C text", "D text"], "correct_answer": "A", "explanation": "..."}]
IMPORTANT: correct_answer must be just the letter (A, B, C, or D). No markdown, ONLY valid JSON.

Text:
${sanitized}`;

    const result = await callGeminiWithFallback(prompt, 'quizzes');
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error('Not an array');
        return parsed;
    } catch (err) {
        console.warn('Failed to parse quizzes JSON');
        throw new Error('Failed to generate quizzes. Please try again.');
    }
}

export async function generateDiagram(context: string): Promise<string> {
    // Security: Sanitize and limit input
    const sanitizedContext = sanitizeInput(context, 5000);

    if (sanitizedContext.length < 10) {
        throw new Error('Insufficient content for diagram generation');
    }

    // Generate detailed diagram specification using AI
    try {
        console.log('[Diagram] Analyzing content for professional diagram...');

        const analysisPrompt = `Analyze this educational content and create a detailed professional diagram specification.

Content: ${sanitizedContext}

Provide a comprehensive specification including:
1. Main title/concept (clear and concise)
2. 5-8 key elements or steps with brief descriptions
3. Relationships and connections between elements
4. Recommended color scheme (professional, educational)
5. Best diagram type (flowchart, process diagram, hierarchy, concept map, etc.)
6. Visual suggestions (icons, layout, style)

Be specific and detailed to guide professional diagram creation.`;

        const specification = await callGeminiWithFallback(analysisPrompt, 'diagrams');

        // Create professional image generation prompt
        const imagePrompt = `Create a highly professional, detailed educational diagram based on this specification:

${specification}

CRITICAL DESIGN REQUIREMENTS:
✓ Professional infographic style with modern, clean aesthetics
✓ Use a cohesive professional color palette (blues, purples, teals, or educational colors)
✓ Large, clear, readable typography with proper hierarchy
✓ Include relevant icons or simple illustrations for each key concept
✓ Clear visual flow with professional arrows/connectors
✓ Proper spacing and balanced layout
✓ White or light neutral background for maximum clarity
✓ High contrast for text readability
✓ Publication-quality graphic design
✓ Suitable for educational presentations or study materials
✓ Modern flat design style
✓ Professional diagram layout (flowchart, process, or concept map)

The diagram should look like it was created by a professional graphic designer for an educational textbook or presentation. Focus on visual clarity, professional appearance, and educational value.`;

        // Return special marker for image generation
        return `IMAGE:${imagePrompt}`;

    } catch (error: any) {
        console.warn('[Diagram] AI-assisted generation failed, using simplified approach');

        // Fallback: Direct image prompt from content
        const simplifiedPrompt = `Create a professional educational diagram illustrating the key concepts from this content:

"${sanitizedContext.slice(0, 500)}..."

Design Requirements:
- Modern, clean infographic style
- Professional blue/purple color scheme
- Clear labels and text
- Visual flow diagram or concept map
- Icons for main concepts
- White background
- High-quality, professional appearance
- Educational and polished look`;

        return `IMAGE:${simplifiedPrompt}`;
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

    // Try OpenRouter molmo first
    if (OPENROUTER_API_KEY) {
        try {
            console.log('[Chat] Using OpenRouter molmo-2-8b:free...');

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Cherag Study Assistant'
                },
                body: JSON.stringify({
                    model: MOLMO_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });

            if (response.ok) {
                const data = await response.json();
                const answer = data.choices?.[0]?.message?.content;
                if (answer) {
                    console.log('[Chat] ✅ Success with molmo-2-8b');
                    return answer;
                }
            }
            console.warn('[Chat] OpenRouter response not valid, falling back to Gemini');
        } catch (error: any) {
            console.warn('[Chat] OpenRouter failed:', error.message);
        }
    }

    // Fallback to Gemini
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

                const extractedTopic = await callOpenRouter(topicPrompt);
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
