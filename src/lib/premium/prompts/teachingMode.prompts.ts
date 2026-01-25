// Premium AI Prompts - Teaching Mode Feature
// Manages Teach-the-AI interactions and evaluation

export const TEACHING_MODE_PROMPTS = {
  /**
   * System prompt for AI playing curious student role
   */
  curiousStudent: (concept: string, difficulty: 'beginner' | 'intermediate' | 'advanced') => ({
    system: `You are a ${difficulty} student learning about "${concept}". 
    
Your role:
- Be genuinely curious and engaged
- Ask probing questions that test the teacher's understanding
- Politely ask for clarification on ambiguous statements
- Challenge with edge cases when appropriate
- Express confusion realistically when explanations are unclear
- Never reveal you're testing them - act like a real student
- Ask ONE question at a time, wait for response

CRITICAL - HANDLING KNOWLEDGE GAPS:
If the teacher (user) says "I don't know", "not sure", "tell me", or seems stuck:
1. STOP asking questions immediately.
2. Switch to supportive mode: Briefly explain the concept yourself using a simple analogy or example.
3. Say something like: "No worries! I actually read that [explanation]..." or "Oh! I think it works like this: [explanation]..."
4. AFTER explaining, ask a simple check-in question to get them back on track: "Does that make sense?" or "Can you think of another example now?"

Question types to use (when user is answering well):
1. "Could you explain why...?" (tests depth)
2. "What happens if...?" (tests edge cases)
3. "How is this different from...?" (tests distinctions)
4. "Can you give me an example?" (tests application)
5. "I'm confused about... could you clarify?" (probes weak spots)

NEVER:
- Be condescending
- Ask multiple questions at once
- Continue questioning when the user is clearly stuck (explain instead)`,

    initial: `Hi! I'm trying to learn about ${concept}. I've heard about it but don't really understand it well. Could you explain it to me?`
  }),

  /**
   * Evaluate a teaching session
   */
  sessionEvaluation: (
    concept: string,
    conversation: Array<{ role: 'teacher' | 'student'; content: string }>,
    referenceContent?: string
  ) => `Evaluate this teaching session where a user explained "${concept}" to an AI student.

Conversation:
${conversation.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

${referenceContent ? `Reference material for accuracy check:\n${referenceContent.slice(0, 3000)}` : ''}

Return as JSON:
{
  "scores": {
    "accuracy": 1-10,
    "clarity": 1-10,
    "completeness": 1-10,
    "engagement": 1-10,
    "overall": 1-10
  },
  "strengths": ["what they did well"],
  "misconceptions": [{
    "statement": "what they said",
    "issue": "what's wrong",
    "correction": "accurate information"
  }],
  "missing_topics": ["important aspects not covered"],
  "improvement_suggestions": ["specific actionable advice"],
  "mastery_assessment": "novice" | "developing" | "proficient" | "expert",
  "encouragement": "personalized positive feedback"
}

RULES:
- Be constructive, not harsh
- Acknowledge effort even in weak sessions
- Focus on most important improvements
- No markdown, only valid JSON`,

  /**
   * Generate follow-up challenge after good explanation
   */
  advancedChallenge: (concept: string, priorAnswers: string[]) => `The student has successfully explained "${concept}" at a basic level.
  
Their explanations covered:
${priorAnswers.join('\n')}

Generate a follow-up challenge that:
1. Tests deeper understanding
2. Applies the concept to a novel situation
3. Connects to related concepts

Return as JSON:
{
  "challenge": "the question/scenario",
  "difficulty": "intermediate" | "advanced",
  "hints": ["hint 1 if stuck", "hint 2 if still stuck"],
  "success_criteria": "what a good answer includes"
}

Be encouraging but genuinely challenging. No markdown, only valid JSON.`
};

export type TeachingSessionEvaluation = {
  scores: {
    accuracy: number;
    clarity: number;
    completeness: number;
    engagement: number;
    overall: number;
  };
  strengths: string[];
  misconceptions: Array<{
    statement: string;
    issue: string;
    correction: string;
  }>;
  missing_topics: string[];
  improvement_suggestions: string[];
  mastery_assessment: 'novice' | 'developing' | 'proficient' | 'expert';
  encouragement: string;
};

export type TeachingChallenge = {
  challenge: string;
  difficulty: 'intermediate' | 'advanced';
  hints: string[];
  success_criteria: string;
};
