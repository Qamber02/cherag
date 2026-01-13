
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    RELEVANCE_THRESHOLD: 70,
    SEMANTIC_THRESHOLD: 0.75,
    MAX_RESULTS_PER_FETCH: 10,
    MIN_DESCRIPTION_LENGTH: 50,
    TRUST_BOOST_ON_PASS: 0.05,
    TRUST_PENALTY_ON_FAIL: 0.02,
    BANNED_KEYWORDS: [
        // Entertainment
        'prank', 'challenge', 'vlog', 'react', 'roast', 'comedy', 'funny', 'meme',
        // Personal
        'salary', 'day in my life', 'routine', 'grwm', 'get ready',
        // Anime/Cartoon
        'anime', 'cartoon', 'shinchan', 'doraemon', 'naruto', 'pokemon', 'manga',
        // Gaming
        'gaming', 'gameplay', 'fortnite', 'minecraft', 'gta', 'pubg', 'free fire',
        // Music
        'music video', 'song', 'dance', 'tiktok', 'trending',
        // Movies/TV
        'movie', 'trailer', 'scene', 'clip', 'celebrity', 'gossip',
        // Other irrelevant
        'asmr', 'satisfying', 'shorts', '#shorts', 'viral', 'fyp', 'foryou'
    ],
    MAX_INPUT_LENGTH: 15000,
    RATE_LIMIT_WINDOW: 60000, // 1 minute in ms
    RATE_LIMIT_MAX_REQUESTS: 30, // 30 requests per minute per IP
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Security-Policy': "default-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

}

// ============================================================================
// SECURITY: INPUT SANITIZATION & RATE LIMITING
// ============================================================================
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function sanitizeInput(text: string, maxLength: number = CONFIG.MAX_INPUT_LENGTH): string {
    if (!text || typeof text !== 'string') return '';

    return text
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/onerror=/gi, '')
        .slice(0, maxLength)
        .trim();
}

function checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (!record || now > record.resetTime) {
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + CONFIG.RATE_LIMIT_WINDOW
        });
        return true;
    }

    if (record.count >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    record.count++;
    return true;
}

// Cleanup old rate limit records periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000);

// ============================================================================
// OPENROUTER INTEGRATION FOR DIAGRAMS
// ============================================================================
async function generateDiagramWithOpenRouter(context: string, openrouterKey: string): Promise<string> {
    const sanitized = sanitizeInput(context, 5000);

    const prompt = `You are a professional diagram generator. Create a clean, educational Mermaid.js flowchart.

STRICT REQUIREMENTS:
1. Use ONLY "flowchart TD" or "flowchart LR" syntax
2. Keep node labels SHORT and CLEAR (max 4 words each)
3. Use simple descriptive IDs: A, B, C, etc.
4. Maximum 10 nodes for clarity
5. Use professional styling: boxes [Text], diamonds {Decision}, rounded ((Start/End))
6. Include meaningful connections with clear arrows: -->
7. Add labels on arrows when needed: -->|label|
8. NO special characters in labels (only letters, numbers, spaces)
9. Output ONLY the Mermaid code, no explanations

EXAMPLE FORMAT:
flowchart TD
    A[Start Process] --> B{Check Condition}
    B -->|Yes| C[Action One]
    B -->|No| D[Action Two]
  C --> E[Final Step]
    D --> E

Content to visualize:
${sanitized}

Generate the Mermaid flowchart now:`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'allenai/molmo-2-8b:free',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.3,
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'OpenRouter API error');
    }

    const diagramText = data.choices?.[0]?.message?.content || '';
    return diagramText.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();
}

// ============================================================================
// TYPES
// ============================================================================
interface VideoCandidate {
    id: string;
    title: string;
    channel: string;
    channelId: string;
    description: string;
    thumbnail: string;
    viewCount: number;
}

interface VerifiedVideo {
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
    relevanceScore: number;
    semanticScore?: number;
    channelTrust?: number;
}

// ============================================================================
// 1. YOUTUBE DISCOVERY
// ============================================================================
async function fetchYouTubeVideos(
    topic: string,
    youtubeKey: string,
    pageToken?: string
): Promise<{ videos: VideoCandidate[], nextPageToken?: string }> {
    // Step 1: Search for video IDs
    let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodeURIComponent(topic)} shorts educational&type=video&videoDuration=short&safeSearch=strict&relevanceLanguage=en&maxResults=${CONFIG.MAX_RESULTS_PER_FETCH}&key=${youtubeKey}`;

    if (pageToken) {
        searchUrl += `&pageToken=${pageToken}`;
    }

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchRes.ok || !searchData.items?.length) {
        console.log("[DISCOVERY] No videos found for:", topic);
        return { videos: [], nextPageToken: undefined };
    }

    const videoIds = searchData.items.map((i: any) => i.id.videoId).join(',');

    // Step 2: Get full metadata
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${youtubeKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (!detailsData.items) {
        return { videos: [], nextPageToken: searchData.nextPageToken };
    }

    const videos: VideoCandidate[] = detailsData.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        description: item.snippet.description || '',
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        viewCount: parseInt(item.statistics.viewCount || '0')
    }));

    console.log(`[DISCOVERY] Found ${videos.length} candidates for "${topic}"`);
    return { videos, nextPageToken: searchData.nextPageToken };
}

// ============================================================================
// 2. METADATA FILTERING (Hard Rules)
// ============================================================================
function filterByMetadata(videos: VideoCandidate[], topic: string): VideoCandidate[] {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const filtered: VideoCandidate[] = [];

    for (const video of videos) {
        const titleLower = video.title.toLowerCase();
        const descLower = video.description.toLowerCase();
        const combined = titleLower + ' ' + descLower;

        // Rule 1: Must have at least one topic keyword
        const hasTopicKeyword = topicWords.some(word =>
            word.length > 3 && combined.includes(word)
        );

        // Rule 2: No banned keywords
        const hasBannedKeyword = CONFIG.BANNED_KEYWORDS.some(banned =>
            combined.includes(banned)
        );

        // Rule 3: Description must be meaningful
        const hasGoodDescription = video.description.length >= CONFIG.MIN_DESCRIPTION_LENGTH;

        if (!hasTopicKeyword) {
            console.log(`[FILTER] REJECTED (no topic keyword): ${video.id} - ${video.title}`);
            continue;
        }
        if (hasBannedKeyword) {
            console.log(`[FILTER] REJECTED (banned keyword): ${video.id} - ${video.title}`);
            continue;
        }
        if (!hasGoodDescription) {
            console.log(`[FILTER] REJECTED (short description): ${video.id} - ${video.title}`);
            continue;
        }

        filtered.push(video);
    }

    console.log(`[FILTER] ${filtered.length}/${videos.length} passed metadata filter`);
    return filtered;
}

// ============================================================================
// 3. AI VERIFICATION (Gemini)
// ============================================================================
async function verifyWithAI(
    videos: VideoCandidate[],
    topic: string,
    geminiKey: string
): Promise<Map<string, { isRelevant: boolean; score: number; reason: string }>> {
    const results = new Map();

    if (videos.length === 0) return results;

    const prompt = `You are a strict academic content verifier.

TOPIC: "${topic}"

Evaluate each video. For each, determine:
1. is_relevant: true ONLY if the video directly teaches/explains the topic
2. relevance_score: 0-100 (70+ = acceptable)
3. reason: One sentence explanation

STRICT RULES:
- Reject motivational content, vlogs, pranks, reactions
- Reject if topic is only mentioned, not taught
- Reject clickbait titles
- If unsure, reject

Videos to evaluate:
${JSON.stringify(videos.map(v => ({ id: v.id, title: v.title, desc: v.description.slice(0, 300) })))}

Return JSON object mapping video IDs to evaluations:
{
  "VIDEO_ID": { "is_relevant": true/false, "relevance_score": 0-100, "reason": "..." },
  ...
}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                }),
            }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text);

        for (const [videoId, evaluation] of Object.entries(parsed)) {
            const eval_data = evaluation as any;
            results.set(videoId, {
                isRelevant: eval_data.is_relevant === true,
                score: eval_data.relevance_score || 0,
                reason: eval_data.reason || 'No reason provided'
            });
        }
    } catch (error) {
        console.error("[AI VERIFY] Error:", error);
    }

    console.log(`[AI VERIFY] Processed ${results.size} videos`);
    return results;
}

// ============================================================================
// 4. SEMANTIC SIMILARITY CHECK
// ============================================================================
async function generateEmbedding(text: string, geminiKey: string): Promise<number[] | null> {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "models/text-embedding-004",
                    content: { parts: [{ text }] }
                })
            }
        );
        const data = await response.json();
        return data.embedding?.values || null;
    } catch {
        return null;
    }
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function checkSemanticSimilarity(
    videos: VideoCandidate[],
    topic: string,
    geminiKey: string
): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    const topicEmbedding = await generateEmbedding(`Educational content about: ${topic}`, geminiKey);
    if (!topicEmbedding) {
        console.log("[SEMANTIC] Failed to generate topic embedding, skipping check");
        videos.forEach(v => results.set(v.id, 1.0)); // Pass all if embedding fails
        return results;
    }

    for (const video of videos) {
        const videoText = `${video.title}. ${video.description}`;
        const videoEmbedding = await generateEmbedding(videoText, geminiKey);

        if (videoEmbedding) {
            const similarity = cosineSimilarity(topicEmbedding, videoEmbedding);
            results.set(video.id, similarity);
            console.log(`[SEMANTIC] ${video.id}: ${(similarity * 100).toFixed(1)}%`);
        } else {
            results.set(video.id, 0.5); // Neutral if embedding fails
        }
    }

    return results;
}

// ============================================================================
// 5. CHANNEL TRUST
// ============================================================================
async function updateChannelTrust(
    supabase: any,
    channelId: string,
    channelName: string,
    passed: boolean
): Promise<number> {
    try {
        // Upsert channel
        const { data: existing } = await supabase
            .from('channel_trust')
            .select('trust_score, videos_verified, videos_rejected')
            .eq('channel_id', channelId)
            .single();

        let newScore = 0.5;
        let verified = 0;
        let rejected = 0;

        if (existing) {
            newScore = existing.trust_score;
            verified = existing.videos_verified;
            rejected = existing.videos_rejected;
        }

        if (passed) {
            newScore = Math.min(1.0, newScore + CONFIG.TRUST_BOOST_ON_PASS);
            verified++;
        } else {
            newScore = Math.max(0.0, newScore - CONFIG.TRUST_PENALTY_ON_FAIL);
            rejected++;
        }

        await supabase.from('channel_trust').upsert({
            channel_id: channelId,
            channel_name: channelName,
            trust_score: newScore,
            videos_verified: verified,
            videos_rejected: rejected,
            updated_at: new Date().toISOString()
        });

        return newScore;
    } catch (e) {
        console.log('[TRUST] Table may not exist, skipping trust update');
        return 0.5;
    }
}

// ============================================================================
// 6. RANKING
// ============================================================================
function rankVideos(videos: VerifiedVideo[]): VerifiedVideo[] {
    return videos.sort((a, b) => {
        // Primary: Relevance score
        const relDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        if (relDiff !== 0) return relDiff;

        // Secondary: Semantic score
        const semDiff = (b.semanticScore || 0) - (a.semanticScore || 0);
        if (semDiff !== 0) return semDiff;

        // Tertiary: Channel trust
        return (b.channelTrust || 0.5) - (a.channelTrust || 0.5);
    });
}

// ============================================================================
// 7. CACHE MANAGEMENT
// ============================================================================
async function getCachedVideos(supabase: any, topic: string): Promise<VerifiedVideo[]> {
    try {
        const { data } = await supabase
            .from('verified_videos')
            .select('video_id, title, thumbnail_url, relevance_score, semantic_score')
            .ilike('topic', `%${topic}%`)
            .order('relevance_score', { ascending: false })
            .limit(20);

        if (!data) return [];

        return data.map((v: any) => ({
            id: v.video_id,
            title: v.title,
            thumbnail: v.thumbnail_url,
            channel: '',
            relevanceScore: v.relevance_score,
            semanticScore: v.semantic_score
        }));
    } catch (e) {
        console.log('[CACHE] Table may not exist, skipping cache check');
        return [];
    }
}

async function cacheVerifiedVideos(
    supabase: any,
    videos: VerifiedVideo[],
    topic: string,
    channelMap: Map<string, string>
): Promise<void> {
    const rows = videos.map(v => ({
        video_id: v.id,
        topic: topic,
        title: v.title,
        thumbnail_url: v.thumbnail,
        relevance_score: v.relevanceScore,
        semantic_score: v.semanticScore || null,
        channel_id: channelMap.get(v.id) || null
    }));

    try {
        await supabase.from('verified_videos').upsert(rows, { onConflict: 'video_id' });
        console.log(`[CACHE] Stored ${rows.length} verified videos`);
    } catch (e) {
        console.log('[CACHE] Could not store videos, table may not exist');
    }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Rate limiting check
        const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(clientIP)) {
            return new Response(JSON.stringify({
                error: 'Rate limit exceeded. Please try again in a few moments.'
            }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { query, context, mode, topic, pageToken } = await req.json();
        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        const youtubeKey = Deno.env.get('VITE_YOUTUBE_API_KEY');
        const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');

        // Debug logging
        console.log(`[AI-GATEWAY] Mode: ${mode}, Context length: ${context?.length || 0}, Query: ${query?.slice(0, 50)}`);

        // Security: Sanitize inputs
        const sanitizedContext = context ? sanitizeInput(context) : '';
        const sanitizedQuery = query ? sanitizeInput(query, 1000) : '';

        // ====================================================================
        // VIDEO CURATION PIPELINE
        // ====================================================================
        if (mode === 'videos') {
            if (!youtubeKey) throw new Error('Missing YouTube API Key');
            if (!geminiKey) throw new Error('Missing GEMINI_API_KEY');

            const searchTopic = topic || (context ? context.slice(0, 200) : 'Science education');
            console.log(`\n========== VIDEO PIPELINE START ==========`);
            console.log(`Topic: "${searchTopic}"`);

            // Check cache first
            const cached = await getCachedVideos(supabase, searchTopic);
            if (cached.length >= 5 && !pageToken) {
                console.log(`[CACHE HIT] Returning ${cached.length} cached videos`);
                return new Response(JSON.stringify({
                    result: cached,
                    topic: searchTopic,
                    nextPageToken: null,
                    fromCache: true
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // Step 1: Discovery
            const { videos: candidates, nextPageToken } = await fetchYouTubeVideos(
                searchTopic, youtubeKey, pageToken
            );

            if (candidates.length === 0) {
                return new Response(JSON.stringify({
                    result: cached, // Return cache if available
                    topic: searchTopic,
                    nextPageToken: null
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // Step 2: Metadata Filter
            const filtered = filterByMetadata(candidates, searchTopic);

            // Step 3: AI Verification
            const aiResults = await verifyWithAI(filtered, searchTopic, geminiKey);

            // Step 4: Semantic Similarity
            const semanticScores = await checkSemanticSimilarity(filtered, searchTopic, geminiKey);

            // Combine results and apply thresholds
            const verified: VerifiedVideo[] = [];
            const channelMap = new Map<string, string>();

            for (const video of filtered) {
                const aiResult = aiResults.get(video.id);
                const semanticScore = semanticScores.get(video.id) || 0;

                // Apply strict thresholds
                if (!aiResult?.isRelevant) {
                    console.log(`[REJECT] ${video.id} - AI says not relevant: ${aiResult?.reason}`);
                    await updateChannelTrust(supabase, video.channelId, video.channel, false);
                    continue;
                }
                if (aiResult.score < CONFIG.RELEVANCE_THRESHOLD) {
                    console.log(`[REJECT] ${video.id} - Score ${aiResult.score} < ${CONFIG.RELEVANCE_THRESHOLD}`);
                    await updateChannelTrust(supabase, video.channelId, video.channel, false);
                    continue;
                }
                if (semanticScore < CONFIG.SEMANTIC_THRESHOLD) {
                    console.log(`[REJECT] ${video.id} - Semantic ${(semanticScore * 100).toFixed(1)}% < ${CONFIG.SEMANTIC_THRESHOLD * 100}%`);
                    await updateChannelTrust(supabase, video.channelId, video.channel, false);
                    continue;
                }

                // Passed! Update trust and add to results
                const trustScore = await updateChannelTrust(supabase, video.channelId, video.channel, true);
                channelMap.set(video.id, video.channelId);

                verified.push({
                    id: video.id,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    channel: video.channel,
                    relevanceScore: aiResult.score,
                    semanticScore: semanticScore,
                    channelTrust: trustScore
                });
            }

            // Step 5: Rank
            const ranked = rankVideos(verified);
            console.log(`[PIPELINE COMPLETE] ${ranked.length} videos verified`);

            // Step 6: Cache
            if (ranked.length > 0) {
                await cacheVerifiedVideos(supabase, ranked, searchTopic, channelMap);
            }

            return new Response(JSON.stringify({
                result: ranked,
                topic: searchTopic,
                nextPageToken: nextPageToken,
                fromCache: false
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // ====================================================================
        // OTHER MODES (Chat, Summary, Flashcards, Quizzes, Diagrams, Mind Maps)
        // ====================================================================
        if (!geminiKey) throw new Error('Missing GEMINI_API_KEY');

        // Validate context for modes that require it
        if ((mode === 'summary' || mode === 'flashcards' || mode === 'quizzes' || mode === 'diagram' || mode === 'mindmap') && (!sanitizedContext || sanitizedContext.length < 10)) {
            throw new Error('No document content provided. Please upload a document first.');
        }

        // DIAGRAM MODE: Try OpenRouter first, fallback to Gemini
        if (mode === 'diagram') {
            if (openrouterKey) {
                try {
                    console.log('[AI-GATEWAY] Using OpenRouter for diagram generation');
                    const diagram = await generateDiagramWithOpenRouter(sanitizedContext, openrouterKey);
                    return new Response(JSON.stringify({ result: diagram }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                } catch (error: any) {
                    console.warn('[AI-GATEWAY] OpenRouter failed, falling back to Gemini:', error.message);
                }
            }
        }

        let prompt = '';
        if (mode === 'chat') {
            prompt = `You are Cherág, an AI study assistant. Answer based on the provided context.\n\nContext:\n${sanitizedContext || 'No context provided'}\n\nQuestion: ${sanitizedQuery}`;
        } else if (mode === 'summary') {
            prompt = `Summarize this text concisely for a student. Use **bold** for key terms and important concepts. Include bullet points for key highlights.\n\nText:\n${sanitizedContext}`;
        } else if (mode === 'flashcards') {
            prompt = `Generate 5 study flashcards as a JSON array. Format: [{"question": "...", "answer": "..."}]. No markdown.\n\nText:\n${sanitizedContext}`;
        } else if (mode === 'quizzes') {
            prompt = `Generate 5 multiple choice questions from this text as a JSON array. 
Format: [{"question": "...", "options": ["Option A text", "Option B text", "Option C text", "Option D text"], "correct_answer": "A", "explanation": "..."}]
- Each question should have exactly 4 options with full text (not just letters)
- correct_answer should be just the letter (A, B, C, or D)
- Include a brief explanation for the correct answer
No markdown, just pure JSON.

Text:
${sanitizedContext}`;
        } else if (mode === 'diagram') {
            prompt = `Create a Mermaid.js flowchart diagram based on this text. Output ONLY valid Mermaid syntax, nothing else.
Use flowchart TD (top-down) style. Include relationships and key concepts.
Example format:
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]

Text to diagram:
${sanitizedContext.slice(0, 500)}`;
        } else if (mode === 'mindmap') {
            prompt = `Create a mind map structure from this text as JSON.
Format: {"title": "Main Topic", "children": [{"title": "Subtopic 1", "children": [...]}, ...]}
Include all key concepts, organized hierarchically. Max 3 levels deep.
No markdown, just pure JSON.

Text:
${sanitizedContext}`;
        } else {
            throw new Error(`Unknown mode: ${mode}`);
        }

        // Force fresh deploy v3 - 2026-01-11 15:55
        console.log(`[AI-GATEWAY] Calling Gemini with prompt length: ${prompt.length}`);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            }
        );

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');

        let result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (mode === 'flashcards' || mode === 'quizzes') {
            result = result.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return new Response(JSON.stringify({ result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("[ERROR]", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
