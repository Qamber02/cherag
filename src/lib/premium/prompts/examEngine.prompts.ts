// Premium AI Prompts - Exam Engine Feature
// Handles exam probability, simulation, and stress testing

export const EXAM_ENGINE_PROMPTS = {
    /**
     * Parse syllabus and extract exam requirements
     */
    syllabusAnalysis: (syllabus: string) => `Parse this exam syllabus/study guide and extract structured requirements.

Syllabus:
${syllabus.slice(0, 6000)}

Return as JSON:
{
  "exam_title": "string",
  "topics": [{
    "name": "topic name",
    "weight": 0.0-1.0,
    "concepts": ["key concept 1", "key concept 2"],
    "question_types": ["MCQ", "short_answer", "essay"]
  }],
  "total_topics": number,
  "estimated_difficulty": "easy" | "medium" | "hard"
}

RULES:
- Weights must sum to 1.0
- Infer weights from emphasis/page count if not explicit
- Include all testable topics
- No markdown, only valid JSON`,

    /**
     * Calculate exam readiness probability
     */
    readinessAssessment: (
        syllabus: { topics: Array<{ name: string; weight: number; concepts: string[] }> },
        userMastery: Record<string, number>
    ) => `Calculate exam success probability based on syllabus requirements and user mastery.

Syllabus Requirements:
${JSON.stringify(syllabus)}

User Mastery by Concept (0-100):
${JSON.stringify(userMastery)}

Return as JSON:
{
  "overall_probability": 0-100,
  "confidence_interval": [low, high],
  "topic_readiness": [{
    "topic": "name",
    "readiness": 0-100,
    "weight": 0.0-1.0,
    "weak_concepts": ["concept 1"],
    "status": "ready" | "needs_work" | "at_risk"
  }],
  "critical_gaps": ["concept 1", "concept 2"],
  "time_recommendation": "X hours more study recommended"
}

RULES:
- Weight topic readiness by exam weight
- Account for partial knowledge
- Be realistic, not optimistic
- No markdown, only valid JSON`,

    /**
     * Generate study optimization plan
     */
    studyPlan: (
        daysRemaining: number,
        topicReadiness: Array<{ topic: string; readiness: number; weight: number }>,
        hoursPerDay: number
    ) => `Create optimal study plan to maximize exam success probability.

Days Until Exam: ${daysRemaining}
Available Hours Per Day: ${hoursPerDay}
Topic Readiness:
${JSON.stringify(topicReadiness)}

Return as JSON:
{
  "plan": [{
    "day": 1,
    "topics": [{
      "topic": "name",
      "hours": 2,
      "focus": "practice problems" | "review" | "deep study"
    }],
    "expected_improvement": 5
  }],
  "projected_final_probability": 0-100,
  "diminishing_returns_warning": boolean,
  "must_study": ["critical topic 1"],
  "can_skip": ["already mastered topic"]
}

RULES:
- Prioritize high-weight, low-readiness topics
- Include breaks and review days
- Account for forgetting curve
- Last 2 days should be review only
- No markdown, only valid JSON`,

    /**
     * Generate exam simulation questions
     */
    examGeneration: (
        topics: string[],
        count: number,
        difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
    ) => `Generate ${count} realistic exam questions for these topics.

Topics: ${JSON.stringify(topics)}
Difficulty: ${difficulty}

Return as JSON array:
[{
  "question": "full question text",
  "type": "mcq" | "short_answer" | "long_answer",
  "difficulty": "easy" | "medium" | "hard",
  "time_estimate_minutes": number,
  "topic": "which topic",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],  // only for MCQ
  "correct_answer": "A" | "full answer text",
  "rubric": "grading criteria",  // for non-MCQ
  "explanation": "why this answer is correct"
}]

RULES:
- Mix question types realistically
- vary correct answers (not all same letter)
- Include edge cases and tricky questions
- Time estimates should be realistic
- No markdown, only valid JSON`,

    /**
     * Stress test a specific concept
     */
    stressTest: (
        concept: string,
        currentLevel: number,
        failedLevel?: number
    ) => `Generate stress test questions for concept "${concept}" at mastery level ${currentLevel}/100.
${failedLevel ? `User previously failed at level: ${failedLevel}` : ''}

Return as JSON array:
[{
  "question": "text",
  "level": "basic" | "applied" | "edge_case" | "synthesis",
  "hint": "subtle hint if stuck",
  "answer": "correct answer",
  "common_mistake": "what students often get wrong"
}]

RULES:
- Start from ${failedLevel || 'basic'} level
- Each question harder than previous
- Include 1-2 "aha moment" questions
- Final question should be challenging but achievable
- 5 questions total
- No markdown, only valid JSON`
};

export type SyllabusAnalysisResult = {
    exam_title: string;
    topics: Array<{
        name: string;
        weight: number;
        concepts: string[];
        question_types: string[];
    }>;
    total_topics: number;
    estimated_difficulty: 'easy' | 'medium' | 'hard';
};

export type ReadinessResult = {
    overall_probability: number;
    confidence_interval: [number, number];
    topic_readiness: Array<{
        topic: string;
        readiness: number;
        weight: number;
        weak_concepts: string[];
        status: 'ready' | 'needs_work' | 'at_risk';
    }>;
    critical_gaps: string[];
    time_recommendation: string;
};

export type ExamQuestion = {
    question: string;
    type: 'mcq' | 'short_answer' | 'long_answer';
    difficulty: 'easy' | 'medium' | 'hard';
    time_estimate_minutes: number;
    topic: string;
    options?: string[];
    correct_answer: string;
    rubric?: string;
    explanation: string;
};
