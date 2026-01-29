// Premium AI Prompts - Active Learning Mode
// Generates micro-lessons and assessments for the Knowledge Radar

export const ACTIVE_LEARNING_PROMPTS = {
  /**
   * Generate a micro-lesson for a specific concept
   */
  microLesson: (concept: string, context: string, previousQuestions: string[] = []) => `Create a short, engaging micro-lesson for the concept: "${concept}".

Context from material:
${context.slice(0, 1000)}

${previousQuestions.length > 0 ? `PREVIOUSLY ASKED QUESTIONS (DO NOT REUSE):
${previousQuestions.map(q => `- ${q}`).join('\n')}
` : ''}

Return as JSON:
{
  "explanation": {
    "hook": "A short, catchy sentence to grab attention",
    "core_concept": "Simple text explanation of what this is",
    "analogy": "A relatable analogy (e.g. 'Think of it like...')",
    "key_takeaway": "One sentence summary to remember"
  },
  "quiz": {
    "question": "A multiple-choice question to test understanding of the MAIN concept above. MUST BE DIFFERENT from previous questions.",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer_text": "The exact text content of the correct option (copy-paste only the text, NO prefixes like 'A.')",
    "explanation": "Why the correct answer is right"
  }
}

RULES:
- Keep it concise! Total reading time under 1 minute.
- Tone: Encouraging, like a smart tutor.
- VITAL: Do NOT reuse any question from the 'PREVIOUSLY ASKED' list.
- VITAL: Focus on a DIFFERENT angle or sub-topic if previous questions exist.
- VITAL: Vary the QUESTION TYPE (e.g. detailed application scenario, conceptual understanding, analyze a quote, identification).
- Quiz Options: Return ONLY the text (e.g. 'Blue'), do NOT add 'A.' or '1.' prefixes.
- copy the correct option text EXACTLY to correct_answer_text.
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
    correct_answer_text: string; // Changed from index to text for stability
    correct_index?: number; // Calculated on client
    explanation: string;
  };
};
