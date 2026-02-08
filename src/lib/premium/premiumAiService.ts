
// Premium AI Service - Connected to FastAPI Backend
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export type KnowledgeRadarData = {
    concepts: any[];
    dependencies: any[];
    gaps: any[];
};

async function authorizedRequest(endpoint: string, body: any) {
    console.log(`[PremiumAI] Requesting ${endpoint}...`);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
        console.warn('[PremiumAI] No auth token available - Request might fail 401');
    } else {
        console.log('[PremiumAI] Auth token present');
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        console.log(`[PremiumAI] Response from ${endpoint}: status ${response.status}`);

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[PremiumAI] API Error ${response.status}:`, errText);
            let errDetail = 'Unknown error';
            try {
                const errJson = JSON.parse(errText);
                errDetail = errJson.detail || errJson.message || errText;
            } catch (e) {
                errDetail = errText;
            }
            throw new Error(errDetail || `API Error ${response.status}`);
        }

        const data = await response.json();
        console.log(`[PremiumAI] Success data from ${endpoint}:`, data);
        return data;
    } catch (error) {
        console.error(`[PremiumAI] Network/Parsing Error for ${endpoint}:`, error);
        throw error;
    }
}

// ============================================
// Knowledge Radar
// ============================================

export async function analyzeKnowledgeRadar(content: string, userMastery: any = {}) {
    return authorizedRequest('/premium/radar/analyze', {
        content,
        user_mastery: userMastery
    });
}

export async function generateActiveLesson(concept: string, context: string, previousQuestions: string[] = []) {
    return authorizedRequest('/premium/radar/micro-lesson', {
        concept,
        context,
        previous_questions: previousQuestions
    });
}

// ============================================
// Video Intelligence
// ============================================

export async function extractClipsFromVideo(videoId: string, videoTitle: string) {
    return authorizedRequest('/premium/video/extract-clips', {
        video_id: videoId,
        video_title: videoTitle
    });
}

// ============================================
// Teaching Mode
// ============================================

export async function generateTeachingResponse(
    history: any[],
    concept: string,
    difficulty: string,
    context?: string
) {
    const data = await authorizedRequest('/premium/teaching/chat', {
        history,
        concept,
        difficulty,
        context
    });
    return data.response;
}

export async function evaluateTeachingSession(concept: string, conversation: any[]) {
    return authorizedRequest('/premium/teaching/evaluate', {
        concept,
        history: conversation
    });
}

// Only used for initial setup, can now be handled by backend or kept for Type safety if needed.
// We'll keep it returning a simple structure as the backend logic handles the prompt.
export function getTeachingModeSystemPrompt(concept: string, difficulty: string) {
    return { system: `(Backend handled) Teaching ${concept}` };
}

// ============================================
// Exam Engine
// ============================================

export async function calculateExamReadiness(syllabus: any, userMastery: any) {
    return authorizedRequest('/premium/exam/readiness', {
        syllabus,
        user_mastery: userMastery
    });
}

export async function generateExamQuestions(topics: string[], count: number = 10, difficulty: string = 'mixed') {
    const data = await authorizedRequest('/premium/exam/questions', {
        topics,
        count,
        difficulty
    });
    return data.questions;
}

export async function generateStressTest(concept: string, currentLevel: number = 1, failedLevel?: number) {
    const data = await authorizedRequest('/premium/exam/stress-test', {
        concept,
        current_level: currentLevel,
        failed_level: failedLevel
    });
    return data.questions;
}

// ============================================
// Analytics & Tools
// ============================================

export async function generateLearningDNA(activityData: any) {
    return authorizedRequest('/premium/analytics/dna', {
        activity_data: activityData
    });
}

export async function assessCognitiveLoad(metrics: any) {
    return authorizedRequest('/premium/analytics/cognitive-load', {
        metrics
    });
}

export async function compressConcept(content: string, conceptName: string) {
    return authorizedRequest('/premium/tools/compress', {
        content,
        concept_name: conceptName
    });
}

export async function remixConcepts(concepts: any[]) {
    return authorizedRequest('/premium/tools/remix', {
        concepts
    });
}

export async function generateMentalModelAnalysis(content: string, model: string) {
    return authorizedRequest('/premium/tools/mental-model', {
        content,
        model
    });
}

// ============================================
// Stubs / Deprecated
// ============================================

export async function callPremiumAI() {
    console.warn('Direct callPremiumAI is deprecated. Use feature-specific functions.');
    return { success: false, error: 'Deprecated' };
}

export function parseJSONResponse<T>(response: string | any): T {
    if (typeof response === 'string') {
        try { return JSON.parse(response); } catch { return {} as T; }
    }
    return response as T;
}

// Implement missing items to prevent build errors
export async function generateDailyPlan(metrics: any) {
    // Current DashboardHome implementation sends raw metrics.
    // We need to map this to DailyPlanRequest structure or update backend to accept loose metrics.
    // For now, let's map what we can.
    return authorizedRequest('/premium/analytics/daily-plan', {
        goals: metrics.goals || ['General Study'],
        available_minutes: metrics.available_minutes || 60,
        learning_dna: metrics.learning_dna || {},
        current_progress: metrics.current_progress || {},
        current_hour: new Date().getHours()
    });
}

export async function analyzeLivingNotes(notes: string) {
    return { insights: [] };
}

export async function analyzeSyllabus(syllabus: string) {
    return authorizedRequest('/premium/exam/analyze-syllabus', {
        syllabus_text: syllabus
    });
}

// Deprecated stubs to satisfy build
export function getKnowledgeTwinPrompt(concept: string): string {
    return "";
}

export async function executePromptChain<T>(prompts: any[], taskType: string): Promise<T> {
    return {} as T;
}
