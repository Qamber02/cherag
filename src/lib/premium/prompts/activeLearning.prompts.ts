// Premium AI Prompts - Active Learning Mode
// Generates micro-lessons and assessments for the Knowledge Radar

export const ACTIVE_LEARNING_PROMPTS = {
    /**
     * Generate a micro-lesson for a specific concept
     */
    microLesson: (concept: string, context: string) => `Create a short, engaging micro-lesson for the concept: "${concept}".

Context from material:
${context.slice(0, 1000)}

Return as JSON:
{
  "explanation": {
    "hook": "A short, catchy sentence to grab attention",
    "core_concept": "Simple text explanation of what this is",
    "analogy": "A relatable analogy (e.g. 'Think of it like...')",
    "key_takeaway": "One sentence summary to remember"
  },
  "quiz": {
    "question": "A multiple-choice question to test understanding of the MAIN concept above",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": number (0-3),
    "explanation": "Why the correct answer is right"
  }
}

RULES:
- Keep it concisc! Total reading time under 1 minute.
- Tone: Encouraging, like a smart tutor.
- The quiz question should check if they understood the explanation.
- No markdown in values, only valid JSON.`,
};

export type MicroLessonResult = {
    explanation: {
        hook: string;
        core_concept: string;
        analogy: string;
        key_takeaway: string;
    };
    quiz: {
        question: string;
        options: string[];
        correct_index: number;
        explanation: string;
    };
};
