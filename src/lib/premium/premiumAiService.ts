// Advanced AI Service with multiple models, rate limiting, and fallbacks
import { rateLimiter } from '../rateLimiter';
import { generateCacheKey, getFromCache, saveToCache } from '../cacheService';

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
const PREMIUM_GEMINI_MODELS = [
    'gemini-2.0-flash-lite',           // Fastest, most efficient
    'gemini-2.0-flash',                // Fast and capable
    'gemini-2.5-flash',                // Advanced flash
    'gemini-2.5-pro',                  // Most capable (fallback)
];

// Hugging Face Models for different tasks
const HF_MODELS = {
    summary: 'facebook/bart-large-cnn',
    chat: 'meta-llama/Llama-3.2-3B-Instruct',
    flashcards: 'mistralai/Mistral-7B-Instruct-v0.2',
    quizzes: 'mistralai/Mistral-7B-Instruct-v0.2',
};

interface AIResponse {
    success: boolean;
    data: string;
    model: string;
    cached: boolean;
}

/**
 * Call AI with premium model cascade and caching
 */
export async function callPremiumAI(
    prompt: string,
    taskType: string,
    options: {
        maxTokens?: number;
        temperature?: number;
        useCache?: boolean;
        cacheTTL?: number; // minutes
    } = {}
): Promise<AIResponse> {
    const {
        maxTokens = 2000,
        temperature = 0.5,
        useCache = true,
    } = options;

    // Security: Sanitize prompt
    const sanitizedPrompt = sanitizeInput(prompt, 15000); // Allow slightly larger for premium tasks

    // Check cache first
    if (useCache) {
        const cacheKey = generateCacheKey(sanitizedPrompt, `premium_${taskType}`);
        const cached = getFromCache<string>(cacheKey);
        if (cached) {
            console.log(`[Premium AI] Cache hit for ${taskType}`);
            return { success: true, data: cached, model: 'cache', cached: true };
        }
    }

    // Rate limiting
    await rateLimiter.waitForToken(taskType);

    // 1. Try OpenRouter (Molmo) First (Free & Fast)
    if (OPENROUTER_API_KEY) {
        try {
            const openRouterResult = await tryOpenRouter(sanitizedPrompt, maxTokens, temperature);
            if (openRouterResult) {
                if (useCache) saveToCache(generateCacheKey(sanitizedPrompt, `premium_${taskType}`), openRouterResult.data, taskType);
                return openRouterResult;
            }
        } catch (e) {
            console.warn('[Premium AI] OpenRouter failed, checking next fallback...');
        }
    }

    // 2. Try Gemini Models
    try {
        const geminiResult = await tryGeminiModels(sanitizedPrompt, maxTokens, temperature, taskType);
        if (geminiResult) {
            if (useCache) saveToCache(generateCacheKey(sanitizedPrompt, `premium_${taskType}`), geminiResult.data, taskType);
            return geminiResult;
        }
    } catch (e) {
        console.warn('[Premium AI] Gemini loop exhausted or failed, checking fallbacks...');
    }

    // 3. Fallback: Hugging Face
    if (HUGGINGFACE_API_KEY) {
        try {
            const hfResult = await tryHuggingFace(sanitizedPrompt, maxTokens, temperature, taskType);
            if (hfResult) {
                if (useCache) saveToCache(generateCacheKey(sanitizedPrompt, `premium_${taskType}`), hfResult.data, taskType);
                return hfResult;
            }
        } catch (e) {
            console.warn('[Premium AI] Hugging Face failed.');
        }
    }

    throw new Error('All premium AI models and fallbacks failed. Please try again later.');
}

// --- Helpers ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function tryGeminiModels(prompt: string, maxTokens: number, temperature: number, taskType: string): Promise<AIResponse | null> {
    for (const model of PREMIUM_GEMINI_MODELS) {
        try {
            console.log(`[Premium AI] Trying ${model} for ${taskType}...`);
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            maxOutputTokens: maxTokens,
                            temperature: temperature,
                        }
                    })
                }
            );
            const data = await response.json();

            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const result = data.candidates[0].content.parts[0].text;
                console.log(`[Premium AI] ✅ Success with ${model}`);
                return { success: true, data: result, model, cached: false };
            }

            if (data.error?.code === 429) {
                console.warn(`[Premium AI] Rate limit on ${model}, waiting 1s then trying next...`);
                await delay(1000); // Wait 1s before next model to let burst limit cool down
                continue;
            }
            throw new Error(data.error?.message || 'Unknown error');
        } catch (err: any) {
            console.warn(`[Premium AI] ${model} failed:`, err.message);
            continue;
        }
    }
    return null;
}

async function tryOpenRouter(prompt: string, maxTokens: number, temperature: number): Promise<AIResponse | null> {
    try {
        console.log(`[Premium AI] Trying OpenRouter ${MOLMO_MODEL}...`);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.origin,
                "X-Title": "Cherag Educational Platform"
            },
            body: JSON.stringify({
                "model": MOLMO_MODEL,
                "messages": [
                    { "role": "user", "content": prompt }
                ],
                "max_tokens": maxTokens,
                "temperature": temperature,
            })
        });

        const data = await response.json();

        if (response.ok && data.choices?.[0]?.message?.content) {
            const result = data.choices[0].message.content;
            console.log(`[Premium AI] ✅ Success with OpenRouter`);
            return { success: true, data: result, model: 'openrouter', cached: false };
        }

        console.warn(`[Premium AI] OpenRouter error:`, data);
        return null;

    } catch (e: any) {
        console.warn(`[Premium AI] OpenRouter fetch failed:`, e.message);
        return null;
    }
}

async function tryHuggingFace(prompt: string, maxTokens: number, temperature: number, taskType: string): Promise<AIResponse | null> {
    const model = HF_MODELS[taskType as keyof typeof HF_MODELS] || HF_MODELS.chat;

    console.log(`[Premium AI] 🔄 Fallback: Trying Hugging Face (${model})...`);

    try {
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: Math.min(maxTokens, 1000),
                        temperature: temperature,
                        return_full_text: false
                    }
                }),
            }
        );

        const data = await response.json();

        if (response.ok && Array.isArray(data) && data[0]?.generated_text) {
            console.log(`[Premium AI] ✅ Success with Hugging Face`);
            return { success: true, data: data[0].generated_text, model: 'huggingface', cached: false };
        } else if (data.summary_text) {
            return { success: true, data: data.summary_text, model: 'huggingface', cached: false };
        }

        console.warn(`[Premium AI] Hugging Face error:`, data);
        return null;

    } catch (e: any) {
        console.warn(`[Premium AI] Hugging Face fetch failed:`, e.message);
        return null;
    }
}

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
export function parseJSONResponse<T>(response: string): T {
    let cleaned = response.trim();

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[a-z]*\s*/gi, '');
    cleaned = cleaned.replace(/```\s*$/g, '');

    // Find first valid start character
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');

    if (firstBrace === -1 && firstBracket === -1) {
        throw new Error('No JSON object or array found in response');
    }

    const isObject = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);
    const startIdx = isObject ? firstBrace : firstBracket;

    // Improved extraction using brace balancing
    let balance = 0;
    let endIdx = -1;
    let inString = false;
    let escape = false;
    const openChar = isObject ? '{' : '[';
    const closeChar = isObject ? '}' : ']';

    for (let i = startIdx; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escape) {
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === openChar) {
                balance++;
            } else if (char === closeChar) {
                balance--;
                if (balance === 0) {
                    endIdx = i;
                    break;
                }
            }
        }
    }

    if (endIdx !== -1) {
        cleaned = cleaned.slice(startIdx, endIdx + 1);
    } else {
        // Fallback: Use the original naive approach if balancing failed (unlikely but safe)
        // or just try parsing the whole thing if it looks like it might be okay.
        // But usually absence of balance 0 means truncation.
        console.warn('JSON appears truncated or malformed (brace mismatch). parsing might fail.');
        // We do strictly nothing here and let JSON.parse fail, 
        // OR we could try to slice to the very last char if we want to be permissive, 
        // but truncation is usually fatal.
    }

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn('JSON Parse Failed initially. Attempting repair...', (e as any).message);

        // Attempt 1: Fix trailing commas
        try {
            return JSON.parse(cleaned.replace(/,\s*([\]}])/g, '$1'));
        } catch (e2) {
            // Attempt 2: Truncated JSON repair
            try {
                // If it looks like an array start but no end
                if (cleaned.trim().startsWith('[') && !cleaned.trim().endsWith(']')) {
                    // Remove the last incomplete item if it ends with a comma
                    let repaired = cleaned.trim();
                    if (repaired.endsWith(',')) repaired = repaired.slice(0, -1);

                    // Close the string if open
                    if (repaired.split('"').length % 2 === 0) repaired += '"';

                    // Close the object if open
                    if (repaired.lastIndexOf('{') > repaired.lastIndexOf('}')) repaired += '}';

                    // Close the array
                    repaired += ']';

                    console.log('Attempting to parse repaired JSON:', repaired);
                    return JSON.parse(repaired);
                }

                // If it looks like an object start but no end
                if (cleaned.trim().startsWith('{') && !cleaned.trim().endsWith('}')) {
                    let repaired = cleaned.trim();
                    if (repaired.endsWith(',')) repaired = repaired.slice(0, -1);
                    if (repaired.split('"').length % 2 === 0) repaired += '"';
                    repaired += '}';
                    return JSON.parse(repaired);
                }

                throw e;
            } catch (e3) {
                console.error('All JSON repair attempts failed.');
                console.error('Original:', cleaned);
                throw e;
            }
        }
    }
}

/**
 * Premium prompt chain executor
 */
export async function executePromptChain<T>(
    prompts: Array<{
        id: string;
        prompt: string | ((prev: any) => string);
        parse: (response: string) => any;
        cacheKey?: string;
    }>,
    taskType: string
): Promise<T> {
    let previousResult: any = null;

    for (const step of prompts) {
        const promptText = typeof step.prompt === 'function'
            ? step.prompt(previousResult)
            : step.prompt;

        console.log(`[Chain] Executing step: ${step.id}`);

        const response = await callPremiumAI(promptText, `${taskType}_${step.id}`, {
            useCache: !!step.cacheKey,
        });

        previousResult = step.parse(response.data);
    }

    return previousResult as T;
}

// ============================================
// KNOWLEDGE RADAR
// ============================================

import { KNOWLEDGE_RADAR_PROMPTS } from './prompts';
import type {
    ConceptExtractionResult,
    DependencyMappingResult,
    GapAnalysisResult
} from './prompts';

export interface KnowledgeRadarData {
    concepts: ConceptExtractionResult;
    dependencies: DependencyMappingResult;
    gaps: GapAnalysisResult;
}

export async function analyzeKnowledgeRadar(
    content: string,
    userMastery: Record<string, number> = {}
): Promise<KnowledgeRadarData> {
    // Step 1: Extract concepts (high token usage)
    let conceptsResponse = await callPremiumAI(
        KNOWLEDGE_RADAR_PROMPTS.conceptExtraction(content),
        'knowledge_radar_concepts',
        { maxTokens: 8192 }
    );

    let concepts: ConceptExtractionResult;
    try {
        concepts = parseJSONResponse<ConceptExtractionResult>(conceptsResponse.data);
    } catch (e) {
        if (conceptsResponse.cached) {
            console.warn('[Premium] Cached concepts corrupted, refetching...');
            conceptsResponse = await callPremiumAI(
                KNOWLEDGE_RADAR_PROMPTS.conceptExtraction(content),
                'knowledge_radar_concepts',
                { useCache: false, maxTokens: 8192 }
            );
            concepts = parseJSONResponse<ConceptExtractionResult>(conceptsResponse.data);
        } else throw e;
    }

    // Step 2: Map dependencies
    const conceptNames = concepts.map(c => c.concept);
    let dependencyResponse = await callPremiumAI(
        KNOWLEDGE_RADAR_PROMPTS.dependencyMapping(conceptNames),
        'knowledge_radar_dependencies',
        { maxTokens: 8192 }
    );

    let dependencies: DependencyMappingResult;
    try {
        dependencies = parseJSONResponse<DependencyMappingResult>(dependencyResponse.data);
    } catch (e) {
        if (dependencyResponse.cached) {
            console.warn('[Premium] Cached dependencies corrupted, refetching...');
            dependencyResponse = await callPremiumAI(
                KNOWLEDGE_RADAR_PROMPTS.dependencyMapping(conceptNames),
                'knowledge_radar_dependencies',
                { useCache: false, maxTokens: 8192 }
            );
            dependencies = parseJSONResponse<DependencyMappingResult>(dependencyResponse.data);
        } else throw e;
    }

    // Step 3: Analyze gaps (if we have mastery data)
    let gaps: GapAnalysisResult = [];
    if (Object.keys(userMastery).length > 0) {
        const gapsResponse = await callPremiumAI(
            KNOWLEDGE_RADAR_PROMPTS.gapAnalysis(dependencies, userMastery),
            'knowledge_radar_gaps',
            { maxTokens: 8192 }
        );
        gaps = parseJSONResponse<GapAnalysisResult>(gapsResponse.data);
    }

    return { concepts, dependencies, gaps };
}

// ============================================
// EXAM ENGINE
// ============================================

import { EXAM_ENGINE_PROMPTS, MENTAL_MODEL_PROMPTS } from './prompts';
import type {
    SyllabusAnalysisResult,
    ReadinessResult,
    ExamQuestion,
    MentalModelResult
} from './prompts';

export async function analyzeSyllabus(syllabus: string): Promise<SyllabusAnalysisResult> {
    let response = await callPremiumAI(
        EXAM_ENGINE_PROMPTS.syllabusAnalysis(syllabus),
        'exam_syllabus',
        { maxTokens: 8192 }
    );

    try {
        return parseJSONResponse<SyllabusAnalysisResult>(response.data);
    } catch (e) {
        if (response.cached) {
            console.warn('[Premium] Cached syllabus corrupted, refetching...');
            response = await callPremiumAI(
                EXAM_ENGINE_PROMPTS.syllabusAnalysis(syllabus),
                'exam_syllabus',
                { maxTokens: 8192, useCache: false }
            );
            return parseJSONResponse<SyllabusAnalysisResult>(response.data);
        }
        throw e;
    }
}

export async function calculateExamReadiness(
    syllabus: SyllabusAnalysisResult,
    userMastery: Record<string, number>
): Promise<ReadinessResult> {
    let response = await callPremiumAI(
        EXAM_ENGINE_PROMPTS.readinessAssessment(syllabus, userMastery),
        'exam_readiness',
        { maxTokens: 4000 }
    );

    try {
        return parseJSONResponse<ReadinessResult>(response.data);
    } catch (e) {
        if (response.cached) {
            console.warn('[Premium] Cached readiness corrupted, refetching...');
            response = await callPremiumAI(
                EXAM_ENGINE_PROMPTS.readinessAssessment(syllabus, userMastery),
                'exam_readiness',
                { maxTokens: 4000, useCache: false }
            );
            return parseJSONResponse<ReadinessResult>(response.data);
        }
        throw e;
    }
}

export async function generateExamQuestions(
    topics: string[],
    count: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'
): Promise<ExamQuestion[]> {
    const response = await callPremiumAI(
        EXAM_ENGINE_PROMPTS.examGeneration(topics, count, difficulty),
        'exam_generation',
        { useCache: false, maxTokens: 8192 } // Always fresh questions
    );
    return parseJSONResponse<ExamQuestion[]>(response.data);
}

// ============================================
// COGNITIVE MONITORING
// ============================================

import { LEARNING_ANALYTICS_PROMPTS } from './prompts';
import type { CognitiveLoadResult, LearningDNAResult } from './prompts';

export async function assessCognitiveLoad(metrics: {
    sessionMinutes: number;
    errorRateTrend: number[];
    responseTimesMs: number[];
    contentSwitches: number;
    scrollBehavior: 'steady' | 'erratic' | 'stuck';
}): Promise<CognitiveLoadResult> {
    const response = await callPremiumAI(
        LEARNING_ANALYTICS_PROMPTS.cognitiveLoadAssessment(metrics),
        'cognitive_load',
        { useCache: false } // Real-time assessment
    );
    return parseJSONResponse<CognitiveLoadResult>(response.data);
}

export async function generateLearningDNA(activityData: {
    sessions: Array<{
        startTime: string;
        durationMinutes: number;
        performanceScore: number;
        contentTypes: string[];
    }>;
    contentTypePerformance: Record<string, number>;
    topicPreferences: string[];
}): Promise<LearningDNAResult> {
    const response = await callPremiumAI(
        LEARNING_ANALYTICS_PROMPTS.learningDNAProfile(activityData),
        'learning_dna'
    );
    return parseJSONResponse<LearningDNAResult>(response.data);
}

// ============================================
// TEACHING MODE
// ============================================

import { TEACHING_MODE_PROMPTS } from './prompts';
import type { TeachingSessionEvaluation } from './prompts';

export function getTeachingModeSystemPrompt(
    concept: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
) {
    return TEACHING_MODE_PROMPTS.curiousStudent(concept, difficulty);
}

export async function evaluateTeachingSession(
    concept: string,
    conversation: Array<{ role: 'teacher' | 'student'; content: string }>,
    referenceContent?: string
): Promise<TeachingSessionEvaluation> {
    const response = await callPremiumAI(
        TEACHING_MODE_PROMPTS.sessionEvaluation(concept, conversation, referenceContent),
        'teaching_evaluation'
    );
    return parseJSONResponse<TeachingSessionEvaluation>(response.data);
}

export async function generateTeachingResponse(
    prompt: string
): Promise<string> {
    const response = await callPremiumAI(prompt, 'teaching_msg', { useCache: false });
    return response.success ? response.data : "I'm thinking...";
}

// ============================================
// CONTENT PROCESSING
// ============================================

import { CONTENT_PROCESSING_PROMPTS } from './prompts';
import type { CompressionResult, RemixResult } from './prompts';

export async function compressConcept(
    content: string,
    conceptName: string
): Promise<CompressionResult> {
    let response = await callPremiumAI(
        CONTENT_PROCESSING_PROMPTS.conceptCompression(content, conceptName),
        'concept_compression',
        { maxTokens: 4000 }
    );

    try {
        return parseJSONResponse<CompressionResult>(response.data);
    } catch (e) {
        if (response.cached) {
            console.warn('[Premium] Cached compression corrupted, refetching...');
            response = await callPremiumAI(
                CONTENT_PROCESSING_PROMPTS.conceptCompression(content, conceptName),
                'concept_compression',
                { maxTokens: 4000, useCache: false }
            );
            return parseJSONResponse<CompressionResult>(response.data);
        }
        throw e;
    }
}

export async function remixConcepts(
    concepts: Array<{ name: string; description: string }>
): Promise<RemixResult> {
    let response = await callPremiumAI(
        CONTENT_PROCESSING_PROMPTS.conceptRemix(concepts),
        'concept_remix',
        { maxTokens: 4000 }
    );

    try {
        return parseJSONResponse<RemixResult>(response.data);
    } catch (e) {
        if (response.cached) {
            console.warn('[Premium] Cached remix corrupted, refetching...');
            response = await callPremiumAI(
                CONTENT_PROCESSING_PROMPTS.conceptRemix(concepts),
                'concept_remix',
                { maxTokens: 4000, useCache: false }
            );
            return parseJSONResponse<RemixResult>(response.data);
        }
        throw e;
    }
}

// ============================================
// STUDY AGENT
// ============================================

import { STUDY_AGENT_PROMPTS } from './prompts';
import type { DailyPlan, NotesAnalysis } from './prompts';

export async function generateDailyPlan(context: {
    goals: Array<{ goal: string; deadline: string; priority: number }>;
    availableMinutes: number;
    learningDNA: {
        peakHours: number[];
        sessionLength: 'short' | 'moderate' | 'long';
        strengths: string[];
    };
    currentProgress: Record<string, number>;
    currentHour: number;
}): Promise<DailyPlan> {
    const response = await callPremiumAI(
        STUDY_AGENT_PROMPTS.dailyPlan(context),
        'daily_plan',
        { useCache: false }
    );
    return parseJSONResponse<DailyPlan>(response.data);
}

export async function analyzeLivingNotes(context: {
    currentNotes: string;
    recentActivity: Array<{
        type: 'quiz' | 'chat' | 'flashcard';
        topic: string;
        insight: string;
    }>;
    conceptUpdates: Array<{
        concept: string;
        newUnderstanding: string;
    }>;
}): Promise<NotesAnalysis> {
    const response = await callPremiumAI(
        STUDY_AGENT_PROMPTS.livingNotesAnalysis(context),
        'living_notes'
    );
    return parseJSONResponse<NotesAnalysis>(response.data);
}

export function getKnowledgeTwinPrompt(profile: {
    knowledgeGraph: Record<string, number>;
    strengths: string[];
    gaps: string[];
    learningStyle: string;
    recentLearning: string[];
}) {
    return STUDY_AGENT_PROMPTS.knowledgeTwinSystem(profile);
}

// ============================================
// MENTAL MODELS
// ============================================

export async function generateMentalModelAnalysis(
    content: string,
    model: 'first_principles' | 'second_order' | 'pareto' | 'inversion' | 'opportunity_cost'
): Promise<MentalModelResult> {
    let response = await callPremiumAI(
        MENTAL_MODEL_PROMPTS.analysis(content, model),
        `mental_model_${model}`,
        { maxTokens: 4000 }
    );

    try {
        return parseJSONResponse<MentalModelResult>(response.data);
    } catch (e) {
        if (response.cached) {
            console.warn('[Premium] Cached mental model corrupted, refetching...');
            response = await callPremiumAI(
                MENTAL_MODEL_PROMPTS.analysis(content, model),
                `mental_model_${model}`,
                { maxTokens: 4000, useCache: false }
            );
            return parseJSONResponse<MentalModelResult>(response.data);
        }
        throw e;
    }
}
