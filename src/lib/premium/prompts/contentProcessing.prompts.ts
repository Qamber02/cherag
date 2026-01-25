// Premium AI Prompts - Content Processing
// Handles concept compression, remix, mental models, and video intelligence

export const CONTENT_PROCESSING_PROMPTS = {
  /**
   * Compress concept into multiple memorable formats
   */
  conceptCompression: (content: string, conceptName: string) => `Compress the concept "${conceptName}" into multiple study-friendly formats.

Full content:
${content.slice(0, 4000)}

Return as JSON:
{
  "analogy": "A relatable analogy to understand the concept (e.g. 'The mitochondriona is like a power plant...')",
  "eli5": "Explain Like I'm 5 (simple explanation using basic language)",
  "tldr": "Too Long, Didn't Read (one concise summary sentence)",
  "mnemonic": "A memorable mnemonic phrase or acronym to help recall",
  "common_mistakes": ["mistake 1 to avoid"]
}

RULES:
- Every format must capture ESSENTIAL information
- No loss of critical meaning in compression
- Mnemonic must be actually memorable
- Analogy should be vivid and easy to grasp
- No markdown, only valid JSON`,

  /**
   * Find connections between concepts (Remix Mode)
   */
  conceptRemix: (concepts: Array<{ name: string; description: string }>) => `Find hidden connections between these concepts.

Concepts:
${JSON.stringify(concepts, null, 2)}

Return as JSON:
{
  "connection": "A creative, metaphorical bridge sentence explaining how these two concepts form a unified idea (e.g. 'The Creative Bridge'). Make it poetic yet functional.",
  "insights": [
    "Key insight 1 about their relationship",
    "Key insight 2 about their relationship"
  ],
  "applications": [
    "Practical application 1 of this combined thinking",
    "Practical application 2 of this combined thinking"
  ]
}

RULES:
- Find genuine connections, not forced ones
- Prioritize pedagogically valuable connections
- Insights should be deep and surprising
- Applications should be concrete/study-related
- No markdown, only valid JSON`,

  /**
   * Build mental model for a concept
   */
  mentalModelBuilder: (
    concept: string,
    preferredDomain?: string
  ) => `Build a mental model framework for understanding "${concept}".
${preferredDomain ? `User prefers analogies from: ${preferredDomain}` : ''}

Return as JSON:
{
  "core_model": {
    "title": "model name",
    "principles": [
      {"name": "principle 1", "explanation": "...", "importance": 1-10}
    ],
    "relationships": [
      {"from": "principle A", "to": "principle B", "type": "causes" | "enables" | "limits"}
    ]
  },
  "analogies": [{
    "source_domain": "cooking, sports, etc",
    "mapping": [{
      "concept_element": "part of concept",
      "analogy_element": "corresponding part in analogy",
      "why_similar": "what makes them similar"
    }],
    "limitations": ["where this analogy breaks down"]
  }],
  "practice_scenarios": [{
    "scenario": "description",
    "correct_application": "how model applies",
    "common_error": "naive mistake without model"
  }],
  "visual_framework": {
    "type": "flowchart" | "hierarchy" | "cycle" | "matrix",
    "description": "how to visualize this model"
  }
}

RULES:
- Max 5 core principles
- At least 2 different analogies
- Include scenarios where naive thinking fails
- No markdown, only valid JSON`,

  /**
   * Extract key segments from video transcript
   */
  smartVideoSegments: (
    transcript: Array<{ text: string; start: number; end: number }>,
    learningGoals?: string[]
  ) => `Analyze this video transcript and identify key learning segments.

Transcript:
${JSON.stringify(transcript.slice(0, 100))}

${learningGoals ? `User's learning goals: ${JSON.stringify(learningGoals)}` : ''}

Return as JSON:
{
  "segments": [{
    "start_seconds": number,
    "end_seconds": number,
    "type": "key_concept" | "example" | "summary" | "tangent" | "skip",
    "label": "brief description",
    "importance": 1-10,
    "concepts_covered": ["concept 1"],
    "reason": "why this segment matters or can be skipped"
  }],
  "must_watch": [{
    "timestamp_seconds": number,
    "reason": "why this moment is critical"
  }],
  "optimal_path": {
    "total_time_seconds": number,
    "segments_to_watch": [indices],
    "time_saved_seconds": number
  },
  "summary": "brief overall video summary"
}

RULES:
- Prioritize segments matching learning goals
- Be aggressive with skip recommendations
- Mark clear examples as important
- Tangents can be valuable context, mark but note
- No markdown, only valid JSON`,

  /**
   * Generate video review schedule (Video Learning Loop)
   */
  videoReviewSchedule: (
    watchedSegments: Array<{
      videoId: string;
      videoTitle: string;
      segmentStart: number;
      segmentEnd: number;
      concept: string;
      lastWatched: string;
      quizScore?: number;
    }>
  ) => `Create spaced repetition video review playlist.

Previously watched segments:
${JSON.stringify(watchedSegments, null, 2)}

Today's date for calculation: ${new Date().toISOString().split('T')[0]}

Return as JSON:
{
  "todays_playlist": [{
    "videoId": "id",
    "videoTitle": "title",
    "segmentStart": seconds,
    "segmentEnd": seconds,
    "concept": "what to recall",
    "reason": "why reviewing today",
    "recall_prompt": "question to answer after watching"
  }],
  "total_review_time_minutes": number,
  "schedule_next_7_days": [{
    "date": "YYYY-MM-DD",
    "segment_count": number,
    "estimated_minutes": number
  }],
  "mastery_progress": {
    "well_retained": number,
    "needs_review": number,
    "at_risk": number
  }
}

RULES:
- Apply spaced repetition intervals (1, 3, 7, 14, 30 days)
- Weight by quiz performance
- Keep daily review under 15 minutes
- Prioritize at-risk concepts
- No markdown, only valid JSON`
};

export type CompressionResult = {
  analogy: string;
  eli5: string;
  tldr: string;
  mnemonic: string;
  common_mistakes: string[];
};

export type RemixResult = {
  connection: string;
  insights: string[];
  applications: string[];
};

export type VideoSegmentResult = {
  segments: Array<{
    start_seconds: number;
    end_seconds: number;
    type: 'key_concept' | 'example' | 'summary' | 'tangent' | 'skip';
    label: string;
    importance: number;
    concepts_covered: string[];
    reason: string;
  }>;
  must_watch: Array<{
    timestamp_seconds: number;
    reason: string;
  }>;
  optimal_path: {
    total_time_seconds: number;
    segments_to_watch: number[];
    time_saved_seconds: number;
  };
  summary: string;
};
