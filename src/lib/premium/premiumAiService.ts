// Advanced AI Service - Thin Client Stub
// Premium features are temporarily disabled during migration to FastAPI backend.
// This prevents legacy server-side code from leaking into the client bundle.

// Security: Input sanitization
function sanitizeInput(text: string, maxLength: number = 10000): string {
    if (!text || typeof text !== 'string') {
        return '';
    }
    return text.substring(0, maxLength);
}

// Stubbed Interfaces
interface AIResponse {
    success: boolean;
    data: string;
    model: string;
    cached: boolean;
}

// Stubbed Function
export async function callPremiumAI(
    prompt: string,
    taskType: string,
    options: any = {}
): Promise<AIResponse> {
    console.warn('[Premium AI] Calls are currently stubbed awaiting backend migration.');

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
        success: true,
        data: "This feature is temporarily unavailable while we migrate to our new, faster backend. Please try again soon!",
        model: "offline-stub",
        cached: false
    };
}

// Stubbed Exports for Analysis
export async function analyzeKnowledgeRadar(content: string, userMastery: any = {}): Promise<any> {
    return {
        concepts: [],
        dependencies: [],
        gaps: []
    }
}

export async function analyzeSyllabus(syllabus: string): Promise<any> {
    return {
        topics: [],
        complexity: "unknown"
    }
}

export async function generateStressTest(concept: string, currentLevel: number = 1): Promise<any> {
    return {
        scenario: "Stubbed Scenario",
        questions: []
    }
}

export async function calculateExamReadiness(syllabus: any, userMastery: any): Promise<any> {
    return {
        score: 0,
        readiness: "low",
        recommendations: []
    }
}

export async function generateExamQuestions(topics: string[], count: number = 10, difficulty: string = 'mixed'): Promise<any[]> {
    return [];
}

export async function assessCognitiveLoad(metrics: any): Promise<any> {
    return {
        load: "low",
        recommendation: "continue"
    }
}

export async function generateLearningDNA(activityData: any): Promise<any> {
    return {
        profile: "unknown",
        traits: []
    }
}

// Duplicate removed - see updated version below

export async function evaluateTeachingSession(concept: string, conversation: any[], referenceContent?: string): Promise<any> {
    return {
        score: 0,
        feedback: "Stubbed evaluation"
    }
}

export async function generateTeachingResponse(prompt: string): Promise<string> {
    return "Teaching mode is currently undergoing maintenance.";
}

export async function compressConcept(content: string, conceptName: string): Promise<any> {
    return {
        original: content,
        compressed: "Stubbed compression",
        ratio: 0
    }
}

export async function remixConcepts(concepts: any[]): Promise<any> {
    return {
        remix: "Stubbed remix",
        analogy: "Stubbed analogy"
    }
}

export async function generateActiveLesson(concept: string, context: string, previousQuestions: string[] = []): Promise<any> {
    return {
        explanation: {
            hook: "Feature updating...",
            core_concept: "We are updating this feature.",
            analogy: "Please check back later.",
            key_takeaway: "Under construction."
        },
        quiz: {
            question: "Is this feature available?",
            options: ["No", "Not yet", "Soon", "Maybe"],
            correct_index: 2,
            explanation: "We are migrating to a new backend."
        }
    }
}

export function parseJSONResponse<T>(response: string): T {
    try {
        return JSON.parse(response);
    } catch (e) {
        return {} as T;
    }
}

export async function executePromptChain<T>(prompts: any[], taskType: string): Promise<T> {
    return {} as T;
}

// Missing Stubs for Index Exports
export async function generateDailyPlan(metrics: any): Promise<any> {
    return {
        schedule: [],
        focus: "stub"
    }
}

export async function analyzeLivingNotes(notes: string): Promise<any> {
    return {
        insights: [],
        connections: []
    }
}


export function getKnowledgeTwinPrompt(concept: string): string {
    return "Knowledge Twin Stub";
}

// Fix Signature: Accept more args
export async function generateMentalModelAnalysis(concept: string, model?: any, options?: any): Promise<any> {
    return {
        model: "stub",
        analogy: "stub"
    }
}

export type KnowledgeRadarData = {
    concepts: any[];
    dependencies: any[];
    gaps: any[];
};

// Fix Return Type: usage expects object with .system
export function getTeachingModeSystemPrompt(concept: string, difficulty: string = 'intermediate') {
    return {
        system: `Teaching ${concept} at ${difficulty} level (Stubbed)`
    };
}
