// Premium AI Prompts - Study Agent and Knowledge Twin
// Handles autonomous study planning and personalized knowledge representation

export const STUDY_AGENT_PROMPTS = {
    /**
     * Generate daily study plan
     */
    dailyPlan: (context: {
        goals: Array<{ goal: string; deadline: string; priority: number }>;
        availableMinutes: number;
        learningDNA: {
            peakHours: number[];
            sessionLength: 'short' | 'moderate' | 'long';
            strengths: string[];
        };
        currentProgress: Record<string, number>;
        currentHour: number;
    }) => `Create today's optimal study plan.

Context:
${JSON.stringify(context, null, 2)}

Return as JSON:
{
  "greeting": "personalized morning message",
  "todays_focus": "main theme for today",
  "blocks": [{
    "start_time": "HH:MM",
    "end_time": "HH:MM", 
    "topic": "what to study",
    "activity": "review" | "learn" | "practice" | "test",
    "priority": "must" | "should" | "could",
    "energy_level": "high" | "medium" | "low",
    "notes": "specific instructions"
  }],
  "breaks": [{
    "after_block": number,
    "duration_minutes": number,
    "suggestion": "stretch, snack, etc"
  }],
  "flexibility_points": ["what can be moved if needed"],
  "warnings": ["approaching deadlines, at-risk goals"],
  "motivation": "personalized encouragement"
}

RULES:
- Match high-energy work to peak hours
- Include breaks every 45-60 minutes
- Must priorities should be earlier
- End with lighter review, not intense work
- No markdown, only valid JSON`,

    /**
     * End-of-day review and adjustment
     */
    dailyReview: (actual: {
        plannedBlocks: number;
        completedBlocks: number;
        topics: Array<{ topic: string; planned: boolean; completed: boolean }>;
        sessionMinutes: number;
        selfRatedEnergy: 1 | 2 | 3 | 4 | 5;
        notes?: string;
    }) => `Review today's study session and plan adjustments.

What happened:
${JSON.stringify(actual, null, 2)}

Return as JSON:
{
  "summary": "brief day summary",
  "wins": ["what went well"],
  "adjustments_needed": [{
    "issue": "what happened",
    "suggestion": "how to adjust tomorrow",
    "priority": "high" | "medium" | "low"
  }],
  "tomorrow_preview": "brief preview of tomorrow's focus",
  "streak_status": {
    "current": number,
    "message": "encouraging if maintained, supportive if broken"
  },
  "closing": "personalized end-of-day message"
}

RULES:
- Be supportive, not judgmental
- Acknowledge effort even if goals not met
- Specific, actionable adjustments only
- No markdown, only valid JSON`,

    /**
     * Knowledge Twin - simulate learner's understanding
     */
    knowledgeTwinSystem: (profile: {
        knowledgeGraph: Record<string, number>; // concept -> mastery 0-100
        strengths: string[];
        gaps: string[];
        learningStyle: string;
        recentLearning: string[];
    }) => ({
        system: `You are a Knowledge Twin - an AI representation of a specific learner.

LEARNER PROFILE:
Knowledge areas and mastery levels:
${JSON.stringify(profile.knowledgeGraph, null, 2)}

Strengths: ${profile.strengths.join(', ')}
Known gaps: ${profile.gaps.join(', ')}
Learning style: ${profile.learningStyle}
Recently learned: ${profile.recentLearning.join(', ')}

YOUR ROLE:
- Respond AS this learner would, not as an expert
- Show their actual thought process
- Acknowledge what they know and don't know
- Make the same reasoning patterns they would
- Be honest about gaps and uncertainties
- Use their vocabulary level

WHEN ASKED "How would I approach X?":
1. Consider what knowledge is available
2. Show step-by-step reasoning
3. Acknowledge where stuck/uncertain
4. Suggest what additional learning would help

Never:
- Know more than the profile shows
- Be falsely confident about gaps
- Break character to teach`,

        calibrationPrompt: `Respond to this as the learner would, staying in character:
"How confident do you feel about {{topic}}? Walk through your understanding."`
    }),

    /**
     * Living Notes - suggest updates
     */
    livingNotesAnalysis: (context: {
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
    }) => `Analyze notes for potential updates based on recent learning.

Current Notes:
${context.currentNotes.slice(0, 5000)}

Recent Learning Activity:
${JSON.stringify(context.recentActivity, null, 2)}

Related Concept Updates:
${JSON.stringify(context.conceptUpdates, null, 2)}

Return as JSON:
{
  "analysis_summary": "brief overview of findings",
  "suggested_updates": [{
    "type": "correction" | "addition" | "connection" | "clarification",
    "location": "which section/paragraph",
    "current_text": "existing text to change",
    "suggested_text": "new text",
    "reason": "why this update",
    "importance": "critical" | "helpful" | "optional"
  }],
  "missing_topics": [{
    "topic": "what's missing",
    "suggested_content": "what to add",
    "based_on": "which activity revealed this"
  }],
  "connections_to_add": [{
    "from": "existing note section",
    "to": "another section or external concept",
    "relationship": "how they connect"
  }],
  "overall_health": "excellent" | "good" | "needs_attention" | "outdated"
}

RULES:
- Be specific with location references
- Don't suggest trivial changes
- Prioritize accuracy corrections
- Respect user's writing style
- No markdown, only valid JSON`
};

export type DailyPlan = {
    greeting: string;
    todays_focus: string;
    blocks: Array<{
        start_time: string;
        end_time: string;
        topic: string;
        activity: 'review' | 'learn' | 'practice' | 'test';
        priority: 'must' | 'should' | 'could';
        energy_level: 'high' | 'medium' | 'low';
        notes: string;
    }>;
    breaks: Array<{
        after_block: number;
        duration_minutes: number;
        suggestion: string;
    }>;
    flexibility_points: string[];
    warnings: string[];
    motivation: string;
};

export type NotesAnalysis = {
    analysis_summary: string;
    suggested_updates: Array<{
        type: 'correction' | 'addition' | 'connection' | 'clarification';
        location: string;
        current_text: string;
        suggested_text: string;
        reason: string;
        importance: 'critical' | 'helpful' | 'optional';
    }>;
    missing_topics: Array<{
        topic: string;
        suggested_content: string;
        based_on: string;
    }>;
    connections_to_add: Array<{
        from: string;
        to: string;
        relationship: string;
    }>;
    overall_health: 'excellent' | 'good' | 'needs_attention' | 'outdated';
};
