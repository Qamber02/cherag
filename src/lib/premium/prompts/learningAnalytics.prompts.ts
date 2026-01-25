// Premium AI Prompts - Learning Analytics
// Handles cognitive monitoring, DNA profiling, and confidence tracking

export const LEARNING_ANALYTICS_PROMPTS = {
    /**
     * Assess cognitive load from session metrics
     */
    cognitiveLoadAssessment: (metrics: {
        sessionMinutes: number;
        errorRateTrend: number[]; // last N answers: 0 = correct, 1 = error
        responseTimesMs: number[];
        contentSwitches: number;
        scrollBehavior: 'steady' | 'erratic' | 'stuck';
    }) => `Analyze study session metrics for cognitive load:

Session Duration: ${metrics.sessionMinutes} minutes
Error Rate Trend (recent first): ${JSON.stringify(metrics.errorRateTrend)}
Response Times (ms, recent first): ${JSON.stringify(metrics.responseTimesMs)}
Content Switches: ${metrics.contentSwitches}
Scroll Behavior: ${metrics.scrollBehavior}

Return as JSON:
{
  "load_level": 1-10,
  "fatigue_signals": ["signal 1", "signal 2"],
  "recommendation": "continue" | "take_break" | "switch_topic" | "stop_for_today",
  "break_duration_minutes": number | null,
  "suggested_next_topic": "easier/different topic" | null,
  "reasoning": "brief explanation"
}

RULES:
- Load 1-3: Fresh, good focus
- Load 4-6: Working hard, manageable
- Load 7-8: Fatigued, efficiency dropping
- Load 9-10: Burnout zone, stop immediately
- Consider time of typical study session (60-90min optimal)
- No markdown, only valid JSON`,

    /**
     * Build learning DNA profile from activity data
     */
    learningDNAProfile: (activityData: {
        sessions: Array<{
            startTime: string; // ISO timestamp
            durationMinutes: number;
            performanceScore: number; // 0-100
            contentTypes: string[];
        }>;
        contentTypePerformance: Record<string, number>;
        topicPreferences: string[];
    }) => `Analyze learning patterns to build a Learning DNA Profile.

Activity Data (last 30 days):
${JSON.stringify(activityData, null, 2)}

Return as JSON:
{
  "learning_style": {
    "visual": 0-100,
    "auditory": 0-100,
    "reading_writing": 0-100,
    "kinesthetic": 0-100
  },
  "peak_performance_hours": [8, 9, 10],
  "optimal_session_length_minutes": number,
  "session_preference": "short_bursts" | "moderate" | "deep_dive",
  "strength_areas": ["topic 1", "topic 2"],
  "growth_areas": ["topic 1", "topic 2"],
  "learning_velocity": "slow_steady" | "moderate" | "fast_adaptive",
  "retention_pattern": "quick_learner_quick_forgetter" | "slow_steady" | "photographic",
  "recommendations": [
    "Study during X hours",
    "Use more Y content types",
    "Take breaks every Z minutes"
  ],
  "confidence": "low" | "medium" | "high"
}

RULES:
- Only claim high confidence with 2+ weeks of data
- Acknowledge when data is insufficient
- Recommendations must be actionable
- No markdown, only valid JSON`,

    /**
     * Calculate concept confidence from performance data
     */
    confidenceCalculation: (performanceData: {
        conceptId: string;
        quizScores: Array<{ score: number; date: string }>;
        flashcardRecalls: Array<{ correct: boolean; timeMs: number; date: string }>;
        chatMentions: number;
        lastReviewed: string | null;
    }) => `Calculate knowledge confidence for concept "${performanceData.conceptId}".

Performance Data:
${JSON.stringify(performanceData, null, 2)}

Return as JSON:
{
  "confidence_score": 0-100,
  "trend": "improving" | "stable" | "declining",
  "data_quality": "strong" | "moderate" | "weak",
  "next_review_days": number,
  "factors": {
    "quiz_performance": 0-100,
    "recall_speed": 0-100,
    "recency": 0-100,
    "consistency": 0-100
  },
  "recommendation": "string"
}

RULES:
- Weight recent data higher (exponential decay)
- Fast correct recalls = higher confidence
- Inconsistent performance = lower confidence
- No activity > 14 days = start decay
- No markdown, only valid JSON`,

    /**
     * Generate memory replay narrative
     */
    memoryReplay: (learningJourney: {
        totalDays: number;
        conceptsLearned: string[];
        breakthroughMoments: Array<{ concept: string; date: string; details: string }>;
        struggles: Array<{ concept: string; resolved: boolean }>;
        milestones: Array<{ achievement: string; date: string }>;
    }) => `Create an encouraging learning journey replay.

Journey Data:
${JSON.stringify(learningJourney, null, 2)}

Return as JSON:
{
  "narrative_title": "Your Learning Journey",
  "chapters": [{
    "title": "chapter name",
    "period": "Week 1-2",
    "highlights": ["what happened"],
    "growth_shown": "how student improved",
    "encouragement": "personalized message"
  }],
  "breakthrough_spotlights": [{
    "concept": "concept name",
    "story": "narrative of the breakthrough moment",
    "why_it_matters": "significance"
  }],
  "overall_progress": {
    "growth_percentage": number,
    "strongest_improvement": "area",
    "resilience_score": 1-10
  },
  "closing_message": "motivational personalized conclusion"
}

RULES:
- Tone: Celebratory, warm, personal
- Focus on growth, not absolute performance
- Acknowledge struggles as part of learning
- Be genuine, not generic
- No markdown, only valid JSON`
};

export type CognitiveLoadResult = {
    load_level: number;
    fatigue_signals: string[];
    recommendation: 'continue' | 'take_break' | 'switch_topic' | 'stop_for_today';
    break_duration_minutes: number | null;
    suggested_next_topic: string | null;
    reasoning: string;
};

export type LearningDNAResult = {
    learning_style: {
        visual: number;
        auditory: number;
        reading_writing: number;
        kinesthetic: number;
    };
    peak_performance_hours: number[];
    optimal_session_length_minutes: number;
    session_preference: 'short_bursts' | 'moderate' | 'deep_dive';
    strength_areas: string[];
    growth_areas: string[];
    learning_velocity: 'slow_steady' | 'moderate' | 'fast_adaptive';
    retention_pattern: string;
    recommendations: string[];
    confidence: 'low' | 'medium' | 'high';
};

export type ConfidenceResult = {
    confidence_score: number;
    trend: 'improving' | 'stable' | 'declining';
    data_quality: 'strong' | 'moderate' | 'weak';
    next_review_days: number;
    factors: {
        quiz_performance: number;
        recall_speed: number;
        recency: number;
        consistency: number;
    };
    recommendation: string;
};
