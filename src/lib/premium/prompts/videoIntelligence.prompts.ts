// Learning Reels - AI Prompt Templates
// Prompts for clip extraction and recall generation

import type { ClipExtractionPromptData, RecallGenerationPromptData } from '../../../types/videoIntelligence.types';

// ============================================
// CLIP EXTRACTION PROMPT
// ============================================

export const EXTRACT_CLIPS_PROMPT = (data: ClipExtractionPromptData): string => `
You are an expert educational content analyzer. Your task is to extract SHORT, FOCUSED learning clips from a video transcript.

**VIDEO INFORMATION:**
Title: ${data.video_title}
Video ID: ${data.video_id}

**TRANSCRIPT:**
${data.transcript}

**YOUR TASK:**
Analyze this transcript and extract educational clips that meet these criteria:

**RULES:**
1. Each clip teaches ONE specific concept
2. Duration: 30-120 seconds (minimum 30s, maximum 120s)
3. Remove introductions, outros, repetition, and filler
4. Only extract meaningful educational content
5. Timestamp accuracy is CRITICAL - clips must be playable segments
6. Avoid overlapping clips
7. Skip promotional content, channel plugs, sponsorships
8. Each clip should be self-contained (comprehensible on its own)

**QUALITY CRITERIA:**
- Concept must be clearly explained
- Visual or verbal demonstrations preferred
- Avoid "coming up next" or "in previous video"
- Skip segments with heavy external references

**OUTPUT FORMAT:**
Return a valid JSON array with this structure:

\`\`\`json
[
  {
    "concept": "Specific concept name (max 50 chars)",
    "start": 125,
    "end": 210,
    "difficulty": 3,
    "importance": 8,
    "prerequisites": ["prerequisite1", "prerequisite2"]
  }
]
\`\`\`

**FIELD DEFINITIONS:**
- \`concept\`: Clear, specific concept name (e.g., "Gradient Descent Algorithm")
- \`start\`: Start timestamp in seconds (integer)
- \`end\`: End timestamp in seconds (integer)
- \`difficulty\`: 1 (beginner) to 5 (advanced)
- \`importance\`: 1 (optional) to 10 (critical for understanding)
- \`prerequisites\`: Array of concepts needed to understand this clip

**CRITICAL:**
- Return ONLY valid JSON, no markdown code blocks
- If no suitable clips found, return empty array []
- Minimum 3 clips, maximum 20 clips
- Ensure timestamps are within video bounds
`;

// ============================================
// RECALL QUESTION GENERATION PROMPT
// ============================================

export const GENERATE_RECALL_PROMPT = (data: RecallGenerationPromptData): string => `
You are an expert in learning science. Generate ONE micro-recall question to validate understanding of this educational clip.

**CLIP INFORMATION:**
Concept: ${data.clip.concept}
Difficulty: ${data.clip.difficulty}/5
Duration: ${data.clip.end_time - data.clip.start_time}s

**CLIP CONTENT:**
${data.transcript_segment}

**YOUR TASK:**
Create a single multiple-choice question that tests UNDERSTANDING, not memorization.

**RULES:**
1. Question must be answerable ONLY if the user understood the clip
2. Maximum 15 words for the question
3. 4 options (A, B, C, D)
4. Each option: 5-8 words maximum
5. One correct answer
6. Distractors should be plausible but clearly wrong
7. NO "all of the above" or "none of the above"
8. Focus on WHY and HOW, not just WHAT

**QUESTION TYPES TO USE:**
- Conceptual: "What does X demonstrate?"
- Application: "When would you use X?"
- Causal: "Why does X happen?"
- Comparison: "How is X different from Y?"

**AVOID:**
- Trick questions
- Requiring specific numbers/dates unless critical
- Overly technical jargon
- Multi-part questions

**OUTPUT FORMAT:**
Return ONLY valid JSON:

\`\`\`json
{
  "question": "What principle does backpropagation rely on?",
  "options": [
    "Chain rule from calculus",
    "Gradient ascent optimization",
    "Random weight initialization",
    "Forward pass validation"
  ],
  "correctIndex": 0,
  "explanation": "Backpropagation uses the chain rule to compute gradients by propagating errors backward through the network."
}
\`\`\`

**CRITICAL:**
- Return ONLY valid JSON, no markdown blocks
- correctIndex is 0-indexed (0, 1, 2, or 3)
- explanation should be 1-2 sentences max
- Question should be solvable in 5-10 seconds by someone who understood the clip
`;

// ============================================
// Export prompt configurations
// ============================================

export const VIDEO_INTELLIGENCE_PROMPTS = {
  EXTRACT_CLIPS: EXTRACT_CLIPS_PROMPT,
  GENERATE_RECALL: GENERATE_RECALL_PROMPT,
};

// Default config for AI calls
export const CLIP_EXTRACTION_CONFIG = {
  maxTokens: 4000,
  temperature: 0.3, // Low temp for structured output
  useCache: true,
  cacheTTL: 60 * 24 * 30, // 30 days - clips don't change
  preferredProvider: 'auto' as const,
};

export const RECALL_GENERATION_CONFIG = {
  maxTokens: 500,
  temperature: 0.5, // Slightly higher for question variety
  useCache: true,
  cacheTTL: 60 * 24 * 30, // 30 days
  preferredProvider: 'auto' as const,
};
