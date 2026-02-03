// Advanced AI Service - Thin Client Stub
// Premium features are temporarily disabled during migration to FastAPI backend.
// This prevents legacy server-side code from leaking into the client bundle.

// import { waitForToken } from '@/lib/server/rateLimiter';
// import { generateCacheKey, getFromCache, saveToCache } from '@/lib/server/cache';
// import { getKey, markRateLimited } from '@/lib/server/keyManager';

// Security: Input sanitization
function sanitizeInput(text: string, maxLength: number = 10000): string {
    if (!text || typeof text !== 'string') {
        return '';
    }
    return text.substring(0, maxLength);
}

import { getPreference } from '../preferencesService';

interface AIResponse {
    success: boolean;
    data: string;
    model: string;
    cached: boolean;
}

/**
 * Call AI with premium model cascade - STUBBED FOR MIGRATION
 */
export async function callPremiumAI(
    prompt: string,
    taskType: string,
    options: {
        maxTokens?: number;
        temperature?: number;
        useCache?: boolean;
        cacheTTL?: number; // minutes
        preferredProvider?: 'auto' | 'deepseek' | 'gemini' | 'huggingface' | 'openrouter';
    } = {}
): Promise<AIResponse> {
    console.warn('[Premium AI] Calls are currently stubbed awaiting backend migration.');

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return mock fallback
    return tryMockFallback(prompt, taskType);
}

// --- Helpers ---

async function tryGeminiModels(prompt: string, maxTokens: number, temperature: number, taskType: string): Promise<AIResponse | null> {
    for (const model of PREMIUM_GEMINI_MODELS) {
        let attempts = 0;
        const MAX_RETRIES_PER_MODEL = 2; // Try up to 2 keys

        while (attempts < MAX_RETRIES_PER_MODEL) {
            const apiKey = getKey('gemini');
            if (!apiKey) break;

            try {
                console.log(`[Premium AI] Trying ${model} for ${taskType}...`);
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

                if (response.status === 429 || data.error?.code === 429) {
                    console.warn(`[Premium AI] Rate limit on ${model}, rotating key...`);
                    markRateLimited('gemini');
                    attempts++;
                    continue;
                }

                throw new Error(data.error?.message || 'Unknown error');
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                console.warn(`[Premium AI] ${model} failed:`, message);
                break; // Model error, try next model
            }
        }
    }
    return null;
}


async function tryOpenRouter(prompt: string, maxTokens: number, temperature: number): Promise<AIResponse | null> {
    const apiKey = getKey('openrouter');
    if (!apiKey) return null;

    try {
        console.log(`[Premium AI] Trying OpenRouter ${MOLMO_MODEL}...`);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
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

        if (response.status === 429) {
            console.warn(`[Premium AI] OpenRouter Rate Limit (429). Rotating key...`);
            markRateLimited('openrouter');
            return tryOpenRouter(prompt, maxTokens, temperature);
        }

        console.warn(`[Premium AI] OpenRouter error:`, data);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn(`[Premium AI] OpenRouter failed:`, message);
    }

    return null;
}

async function tryDeepSeek(prompt: string, maxTokens: number, temperature: number, taskType: string): Promise<AIResponse | null> {
    const apiKey = getKey('deepseek');
    if (!apiKey) return null;

    // Determine model based on task type
    // Use reasoner for complex tasks like mental models or exam generation
    const isComplex = taskType.includes('mental_model') || taskType.includes('exam') || taskType.includes('analysis');
    const model = isComplex ? 'deepseek-reasoner' : 'deepseek-chat';

    console.log(`[Premium AI] Trying DeepSeek (${model}) for ${taskType}...`);

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: "You are a helpful assistant." }, // Optional system message
                    { role: "user", content: prompt }
                ],
                max_tokens: maxTokens,
                temperature: temperature,
                stream: false
            })
        });

        const data = await response.json();

        if (response.ok && data.choices?.[0]?.message?.content) {
            console.log(`[Premium AI] ✅ Success with DeepSeek (${model})`);
            return { success: true, data: data.choices[0].message.content, model: `deepseek-${model}`, cached: false };
        }

        if (response.status === 429) {
            console.warn(`[Premium AI] DeepSeek Rate Limit (429). Rotating key...`);
            markRateLimited('deepseek');
            return tryDeepSeek(prompt, maxTokens, temperature, taskType);
        }

        console.warn(`[Premium AI] DeepSeek error:`, data);
        return null;

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn(`[Premium AI] DeepSeek fetch failed:`, message);
        return null;
    }
}

// Mock Fallback for when all APIs fail (Demo Mode)
async function tryMockFallback(_prompt: string, taskType: string): Promise<AIResponse> {
    console.warn(`[Premium AI] ⚠️ All APIs failed. Falling back to MOCK mode for demo purposes.`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    let mockData = "";

    if (taskType.includes('active_lesson')) {
        const concept = taskType.replace('active_lesson_', '');
        mockData = JSON.stringify({
            explanation: {
                hook: `Here is a simulated lesson for ${concept}.`,
                core_concept: `${concept} is a fundamental building block in this domain.`,
                analogy: `Think of ${concept} like a key that unlocks specific doors in a building.`,
                key_takeaway: `Mastering ${concept} allows you to understand more complex systems.`
            },
            quiz: {
                question: `What is the primary function of ${concept} in this context?`,
                options: [
                    "It has no function",
                    `It serves as a foundational element`,
                    "It is deprecated",
                    "It is unrelated to the topic"
                ],
                correct_index: 1,
                explanation: `Correct! ${concept} acts as a core component upon which others rely.`
            }
        });
    } else if (taskType.includes('knowledge_radar')) {
        // Fallback for analysis
        mockData = JSON.stringify({
            concepts: [
                { concept: "Core Concept", description: "The central idea", complexity_level: "foundational" },
                { concept: "Advanced Application", description: "Using the core idea", complexity_level: "advanced" },
                { concept: "Intermediate Technique", description: "A balanced approach", complexity_level: "intermediate" }
            ],
            dependencies: [
                { concept: "Advanced Application", prerequisites: ["Core Concept"], is_foundational: false },
                { concept: "Intermediate Technique", prerequisites: ["Core Concept"], is_foundational: false }
            ]
        });
    } else {
        // Generic fallback
        mockData = "This is a simulated AI response because all external providers (DeepSeek, Gemini, etc.) are currently rate-limited or unavailable.";
    }

    return { success: true, data: mockData, model: 'offline-mock', cached: false };
}

async function tryHuggingFace(prompt: string, maxTokens: number, temperature: number, taskType: string): Promise<AIResponse | null> {
    const apiKey = getKey('huggingface');
    if (!apiKey) return null;

    const model = HF_MODELS[taskType as keyof typeof HF_MODELS] || HF_MODELS.chat;

    console.log(`[Premium AI] 🔄 Fallback: Trying Hugging Face (${model})...`);

    const baseUrl = typeof window === 'undefined' ? 'https://router.huggingface.co' : '/api/hf';

    try {
        const response = await fetch(
            `${baseUrl}/models/${model}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
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

        if (response.status === 429) {
            markRateLimited('huggingface');
            return tryHuggingFace(prompt, maxTokens, temperature, taskType);
        }

        console.warn(`[Premium AI] Hugging Face error:`, data);
        return null;

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn(`[Premium AI] Hugging Face fetch failed:`, message);
        return null;
    }
}

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
export function parseJSONResponse<T>(response: string): T {
    let cleaned = response.trim();

    // Strip DeepSeek <think>...</think> blocks (multiline)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Also strip generic <think> tags if they appear without closing (truncated)
    cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '').trim();

    // Remove markdown code blocks (json, plain, or implicit)
    // Handle standard blocks
    cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1');
    // Handle unclosed blocks (truncated) - remove the opening tag
    cleaned = cleaned.replace(/```(?:json)?/gi, '');
    // Remove any trailing backticks
    cleaned = cleaned.replace(/```/g, '');

    cleaned = cleaned.trim();

    // Find first valid start character
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');

    if (firstBrace === -1 && firstBracket === -1) {
        // As a last resort, try to find the last closing brace and work backwards? 
        // Or just let it fail.
        throw new Error(`No JSON object or array found in response. Content: ${cleaned.substring(0, 100)}...`);
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
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn('JSON Parse Failed initially. Attempting repair...', errorMessage);

        // Attempt 1: Fix trailing commas
        try {
            return JSON.parse(cleaned.replace(/,\s*([\]}])/g, '$1'));
        } catch (_e2) {
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
            } catch (_e3) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prompt: string | ((prev: any) => string);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parse: (response: string) => any;
        cacheKey?: string;
    }>,
    taskType: string
): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            const result = parseJSONResponse<SyllabusAnalysisResult>(response.data);

            // Cache the result
            return result;
        }
        throw e;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateStressTest(concept: string, currentLevel: number = 1): Promise<any> {
    const response = await callPremiumAI(
        EXAM_ENGINE_PROMPTS.stressTest(concept, currentLevel),
        `stress_test_${concept}_${currentLevel}`,
        { maxTokens: 4096 }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parseJSONResponse<any>(response.data);
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
// ACTIVE LEARNING
// ============================================

import { ACTIVE_LEARNING_PROMPTS } from './prompts';
import type { MicroLessonResult } from './prompts';

export async function generateActiveLesson(
    concept: string,
    context: string,
    previousQuestions: string[] = []
): Promise<MicroLessonResult> {
    const response = await callPremiumAI(
        ACTIVE_LEARNING_PROMPTS.microLesson(concept, context, previousQuestions),
        `active_lesson_${concept}`,
        { maxTokens: 4000, useCache: false } // Always fresh to avoid repeating questions
    );

    const result = parseJSONResponse<MicroLessonResult>(response.data);

    // Sanitize Quiz Data & Resolve Index from Text
    if (result?.quiz?.options && Array.isArray(result.quiz.options)) {
        // Helper to normalize text (strip prefixes like "A.", "1.", whitespace, lowercase)
        const normalize = (str: string) => str.replace(/^[A-D1-4][\.\)]\s*/i, '').trim().toLowerCase();

        // Resolve index if text provided
        if (result.quiz.correct_answer_text) {
            const target = normalize(result.quiz.correct_answer_text);

            // 1. Try Exact Normalized Match
            let textIndex = result.quiz.options.findIndex(opt => normalize(opt) === target);

            // 2. If fail, try substring match (e.g. target is "Blue" and option is "It is Blue")
            if (textIndex === -1) {
                textIndex = result.quiz.options.findIndex(opt => normalize(opt).includes(target) || target.includes(normalize(opt)));
            }

            if (textIndex !== -1) {
                result.quiz.correct_index = textIndex;
                console.log(`[Premium] Resolved answer index ${textIndex} from text match ("${target}")`);
            } else {
                console.warn(`[Premium] Could not match answer text "${result.quiz.correct_answer_text}" to options. Falling back to default.`);
            }
        }

        // Ensure index is within bounds (fallback if text match failed or index provided was bad)
        const maxIdx = result.quiz.options.length - 1;
        if (typeof result.quiz.correct_index !== 'number' || result.quiz.correct_index < 0 || result.quiz.correct_index > maxIdx) {
            console.warn(`[Premium] Fixed out-of-bounds/missing correct_index: ${result.quiz.correct_index} -> 0`);
            result.quiz.correct_index = 0; // Default to A if broken
        }
    }

    return result;
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
    model: 'first_principles' | 'second_order' | 'pareto' | 'inversion' | 'opportunity_cost',
    preferredProvider?: 'auto' | 'deepseek' | 'gemini' | 'huggingface' | 'openrouter'
): Promise<MentalModelResult> {
    let response = await callPremiumAI(
        MENTAL_MODEL_PROMPTS.analysis(content, model),
        `mental_model_${model}`,
        { maxTokens: 4000, preferredProvider }
    );

    try {
        return parseJSONResponse<MentalModelResult>(response.data);
    } catch (e) {
        if (response.cached) {
            console.warn('[Premium] Cached mental model corrupted, refetching...');
            response = await callPremiumAI(
                MENTAL_MODEL_PROMPTS.analysis(content, model),
                `mental_model_${model}`,
                { maxTokens: 4000, useCache: false, preferredProvider }
            );
            return parseJSONResponse<MentalModelResult>(response.data);
        }
        throw e;
    }
}
