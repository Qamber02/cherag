
import json
from typing import List, Dict, Any, Optional

# =============================================================================
# Knowledge Radar Prompts
# =============================================================================

def get_concept_extraction_prompt(content: str) -> str:
    return f"""Extract all key concepts from this educational content.

Return as JSON array:
[{{
  "concept": "concept name",
  "description": "brief description",
  "complexity_level": "foundational" | "intermediate" | "advanced"
}}]

RULES:
- Maximum 20 concepts
- Focus on main ideas, not trivial details
- Complexity based on prerequisite knowledge needed
- No markdown, only valid JSON

Content:
{content[:8000]}"""

def get_dependency_mapping_prompt(concepts: List[str]) -> str:
    return f"""For each concept, identify prerequisite knowledge required from the provided list.

Concepts to analyze:
{json.dumps(concepts)}

Return as JSON array:
[{{
  "concept": "concept name",
  "prerequisites": ["required concept 1", "required concept 2"],
  "is_foundational": boolean
}}]

RULES:
- Prerequisites MUST be selected ONLY from the provided "Concepts to analyze" list.
- Do NOT invent external prerequisites.
- If a concept has no prerequisites from the list, set is_foundational = true.
- Order matters: list most essential prerequisites first.
- No circular dependencies.
- No markdown, only valid JSON."""

def get_gap_analysis_prompt(concepts: List[Dict], user_mastery: Dict[str, int]) -> str:
    return f"""Identify concepts with unmet prerequisites.

Concept Dependencies:
{json.dumps(concepts)}

User Mastery Levels (0-100):
{json.dumps(user_mastery)}

Return as JSON array:
[{{
  "gap": "concept with gap",
  "blockingConcepts": ["unmastered prerequisite 1"],
  "priority": "critical" | "important" | "minor",
  "recommendation": "what to study first"
}}]

RULES:
- Gap exists if any prerequisite has mastery < 60
- Priority based on how many other concepts are blocked
- No markdown, only valid JSON"""

def get_knowledge_radar_prompt(content: str, user_mastery: Dict[str, int]) -> str:
    return f"""Perform a complete Knowledge Radar analysis on this content.
    
Content:
{content[:8000]}

User Mastery Profile (0-100):
{json.dumps(user_mastery)}

Task:
1. Extract key concepts (max 20).
2. Map dependencies (prerequisites must be from the extracted list).
3. Identify gaps based on User Mastery (gap exists if prerequisite mastery < 60).

Return valid JSON:
{{
  "concepts": [{{
    "concept": "name", 
    "description": "brief desc", 
    "complexity_level": "foundational" | "intermediate" | "advanced"
  }}],
  "dependencies": [{{
    "concept": "name", 
    "prerequisites": ["req name"], 
    "is_foundational": boolean
  }}],
  "gaps": [{{
    "gap": "concept name", 
    "blockingConcepts": ["req name"], 
    "priority": "critical" | "important", 
    "recommendation": "study advice"
  }}]
}}

RULES:
- No markdown, ONLY valid JSON.
- Dependencies must NOT be circular.
- Prerequisites must exist in the extracted concepts list.
"""


# =============================================================================
# Video Intelligence Prompts
# =============================================================================

def get_extract_clips_prompt(video_title: str, video_id: str, transcript: str) -> str:
    return f"""You are an expert educational content analyzer. Your task is to extract SHORT, FOCUSED learning clips from a video transcript.

**VIDEO INFORMATION:**
Title: {video_title}
Video ID: {video_id}

**TRANSCRIPT:**
{transcript}

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

```json
[
  {{
    "concept": "Specific concept name (max 50 chars)",
    "start": 125,
    "end": 210,
    "difficulty": 3,
    "importance": 8,
    "prerequisites": ["prerequisite1", "prerequisite2"]
  }}
]
```

**FIELD DEFINITIONS:**
- `concept`: Clear, specific concept name (e.g., "Gradient Descent Algorithm")
- `start`: Start timestamp in seconds (integer)
- `end`: End timestamp in seconds (integer)
- `difficulty`: 1 (beginner) to 5 (advanced)
- `importance`: 1 (optional) to 10 (critical for understanding)
- `prerequisites`: Array of concepts needed to understand this clip

**CRITICAL:**
- Return ONLY valid JSON, no markdown code blocks
- If no suitable clips found, return empty array []
- Minimum 3 clips, maximum 20 clips
- Ensure timestamps are within video bounds"""

# =============================================================================
# Active Learning Prompts (Micro-Lessons)
# =============================================================================

def get_micro_lesson_prompt(concept: str, context: str, previous_questions: List[str] = []) -> str:
    prev_q_text = ""
    if previous_questions:
        prev_q_text = "PREVIOUSLY ASKED QUESTIONS (DO NOT REUSE):\n" + "\n".join([f"- {q}" for q in previous_questions])

    return f"""Create a short, engaging micro-lesson for the concept: "{concept}".

Context from material:
{context[:1000]}

{prev_q_text}

Return as JSON:
{{
  "explanation": {{
    "hook": "A short, catchy sentence to grab attention",
    "core_concept": "Simple text explanation of what this is",
    "analogy": "A relatable analogy (e.g. 'Think of it like...')",
    "key_takeaway": "One sentence summary to remember"
  }},
  "quiz": {{
    "question": "A multiple-choice question to test understanding of the MAIN concept above. MUST BE DIFFERENT from previous questions.",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer_text": "The exact text content of the correct option (copy-paste only the text, NO prefixes like 'A.')",
    "explanation": "Why the correct answer is right"
  }}
}}

RULES:
- Keep it concise! Total reading time under 1 minute.
- Tone: Encouraging, like a smart tutor.
- VITAL: Do NOT reuse any question from the 'PREVIOUSLY ASKED' list.
- VITAL: Focus on a DIFFERENT angle or sub-topic if previous questions exist.
- VITAL: Vary the QUESTION TYPE (e.g. detailed application scenario, conceptual understanding, analyze a quote, identification).
- Quiz Options: Return ONLY the text (e.g. 'Blue'), do NOT add 'A.' or '1.' prefixes.
- copy the correct option text EXACTLY to correct_answer_text.
- No markdown in values, only valid JSON."""

# =============================================================================
# Teaching Mode Prompts
# =============================================================================

def get_teaching_system_prompt(concept: str, difficulty: str) -> str:
    return f"""You are a {difficulty} student learning about "{concept}". 
    
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
- Continue questioning when the user is clearly stuck (explain instead)

Initial greeting: "Hi! I'm trying to learn about {concept}. I've heard about it but don't really understand it well. Could you explain it to me?"""

def get_session_evaluation_prompt(concept: str, conversation: List[Dict], reference_content: Optional[str] = None) -> str:
    conv_text = "\n\n".join([f"{m['role'].upper()}: {m['content']}" for m in conversation])
    ref_text = ""
    if reference_content:
        ref_text = f"Reference material for accuracy check:\n{reference_content[:3000]}"

    return f"""Evaluate this teaching session where a user explained "{concept}" to an AI student.

Conversation:
{conv_text}

{ref_text}

Return as JSON:
{{
  "scores": {{
    "accuracy": 1-10,
    "clarity": 1-10,
    "completeness": 1-10,
    "engagement": 1-10,
    "overall": 1-10
  }},
  "strengths": ["what they did well"],
  "misconceptions": [{{
    "statement": "what they said",
    "issue": "what's wrong",
    "correction": "accurate information"
  }}],
  "missing_topics": ["important aspects not covered"],
  "improvement_suggestions": ["specific actionable advice"],
  "mastery_assessment": "novice" | "developing" | "proficient" | "expert",
  "encouragement": "personalized positive feedback"
}}

RULES:
- Be constructive, not harsh
- Acknowledge effort even in weak sessions
- Focus on most important improvements
- No markdown, only valid JSON"""

# =============================================================================
# Exam Engine Prompts
# =============================================================================

def get_readiness_assessment_prompt(syllabus: Dict, user_mastery: Dict[str, int]) -> str:
    return f"""Calculate exam success probability based on syllabus requirements and user mastery.

Syllabus Requirements:
{json.dumps(syllabus)}

User Mastery by Concept (0-100):
{json.dumps(user_mastery)}

Return as JSON:
{{
  "overall_probability": 0-100,
  "confidence_interval": [low, high],
  "topic_readiness": [{{
    "topic": "name",
    "readiness": 0-100,
    "weight": 0.0-1.0,
    "weak_concepts": ["concept 1"],
    "status": "ready" | "needs_work" | "at_risk"
  }}],
  "critical_gaps": ["concept 1", "concept 2"],
  "time_recommendation": "X hours more study recommended"
}}

RULES:
- Weight topic readiness by exam weight
- Account for partial knowledge
- Be realistic, not optimistic
- No markdown, only valid JSON"""

def get_exam_generation_prompt(topics: List[str], count: int, difficulty: str) -> str:
    return f"""Generate {count} realistic exam questions for these topics.

Topics: {json.dumps(topics)}
Difficulty: {difficulty}

Return as JSON array:
[{{
  "question": "full question text",
  "type": "mcq" | "short_answer" | "long_answer",
  "difficulty": "easy" | "medium" | "hard",
  "time_estimate_minutes": number,
  "topic": "which topic",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],  // only for MCQ
  "correct_answer": "A" | "full answer text",
  "rubric": "grading criteria",  // for non-MCQ
  "explanation": "why this answer is correct"
}}]

RULES:
- Mix question types realistically
- vary correct answers (not all same letter)
- Include edge cases and tricky questions
- Time estimates should be realistic
- No markdown, only valid JSON"""

def get_stress_test_prompt(concept: str, current_level: int, failed_level: Optional[int] = None) -> str:
    failed_text = f"User previously failed at level: {failed_level}" if failed_level else ""
    return f"""Generate stress test questions for concept "{concept}" at mastery level {current_level}/100.
{failed_text}

Return as JSON array:
[{{
  "question": "text",
  "level": "basic" | "applied" | "edge_case" | "synthesis",
  "hint": "subtle hint if stuck",
  "answer": "correct answer",
  "common_mistake": "what students often get wrong"
}}]

RULES:
- Start from {failed_level or 'basic'} level
- Each question harder than previous
- Include 1-2 "aha moment" questions
- Final question should be challenging but achievable
- 5 questions total
- No markdown, only valid JSON"""

# =============================================================================
# Analytics & Tools Prompts
# =============================================================================

def get_learning_dna_prompt(activity_data: Dict) -> str:
    return f"""Analyze learning patterns to build a Learning DNA Profile.

Activity Data (last 30 days):
{json.dumps(activity_data, indent=2)}

Return as JSON:
{{
  "learning_style": {{
    "visual": 0-100,
    "auditory": 0-100,
    "reading_writing": 0-100,
    "kinesthetic": 0-100
  }},
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
}}

RULES:
- Only claim high confidence with 2+ weeks of data
- Acknowledge when data is insufficient
- Recommendations must be actionable
- No markdown, only valid JSON"""

def get_cognitive_load_prompt(metrics: Dict) -> str:
    return f"""Analyze study session metrics for cognitive load:

Session Duration: {metrics.get('sessionMinutes')} minutes
Error Rate Trend (recent first): {metrics.get('errorRateTrend')}
Response Times (ms, recent first): {metrics.get('responseTimesMs')}
Content Switches: {metrics.get('contentSwitches')}
Scroll Behavior: {metrics.get('scrollBehavior')}

Return as JSON:
{{
  "load_level": 1-10,
  "fatigue_signals": ["signal 1", "signal 2"],
  "recommendation": "continue" | "take_break" | "switch_topic" | "stop_for_today",
  "break_duration_minutes": number | null,
  "suggested_next_topic": "easier/different topic" | null,
  "reasoning": "brief explanation"
}}

RULES:
- Load 1-3: Fresh, good focus
- Load 4-6: Working hard, manageable
- Load 7-8: Fatigued, efficiency dropping
- Load 9-10: Burnout zone, stop immediately
- No markdown, only valid JSON"""

def get_compress_concept_prompt(content: str, concept_name: str) -> str:
    return f"""Compress the concept "{concept_name}" into multiple study-friendly formats.

Full content:
{content[:4000]}

Return as JSON:
{{
  "analogy": "A relatable analogy to understand the concept (e.g. 'The mitochondriona is like a power plant...')",
  "eli5": "Explain Like I'm 5 (simple explanation using basic language)",
  "tldr": "Too Long, Didn't Read (one concise summary sentence)",
  "mnemonic": "A memorable mnemonic phrase or acronym to help recall",
  "common_mistakes": ["mistake 1 to avoid"]
}}

RULES:
- Every format must capture ESSENTIAL information
- No loss of critical meaning in compression
- Mnemonic must be actually memorable
- Analogy should be vivid and easy to grasp
- No markdown, only valid JSON"""

def get_remix_concepts_prompt(concepts: List[Dict]) -> str:
    return f"""Find hidden connections between these concepts.

Concepts:
{json.dumps(concepts, indent=2)}

Return as JSON:
{{
  "connection": "A creative, metaphorical bridge sentence explaining how these two concepts form a unified idea.",
  "insights": [
    "Key insight 1 about their relationship",
    "Key insight 2 about their relationship"
  ],
  "applications": [
    "Practical application 1 of this combined thinking",
    "Practical application 2 of this combined thinking"
  ]
}}

RULES:
- Find genuine connections, not forced ones
- Prioritize pedagogically valuable connections
- Insights should be deep and surprising
- No markdown, only valid JSON"""

def get_mental_model_prompt(content: str, model: str) -> str:
    return f"""You are a master of critical thinking tools. Analyze the provided content using the "{model.replace('_', ' ')}" mental model.

Content:
"{content[:4000]}"

Definitions for context:
- First Principles: Break down a problem into its basic elements and reassemble them from the ground up.
- Second Order Thinking: Consider not just the immediate consequences, but the subsequent effects.
- Pareto Principle (80/20): Identify the 20% of inputs/causes that produce 80% of the outputs/results.
- Inversion: Thinking forward and backward. Instead of asking how to do something, ask how to NOT do it.
- Opportunity Cost: Consider what is lost by choosing one option over another.

Response Format (JSON only):
{{
  "modelName": "{model}",
  "definition": "Brief, one-sentence definition of the model in context of this content",
  "application": "How this model applies specifically to this topic",
  "steps": [
    "Step 1 of applying the thinking...",
    "Step 2...",
    "Step 3..."
  ],
  "insight": "A profound realization or 'aha moment' derived from this specific lens"
}}

Ensure the analysis is specific to the content, not generic."""

def get_daily_plan_prompt(goals: List[str], available_minutes: int, learning_dna: Dict, current_progress: Dict, current_hour: int) -> str:
    return f"""Create optimal study plan to maximize exam success probability.

Goals: {json.dumps(goals)}
Available Minutes: {available_minutes}
Learning DNA: {json.dumps(learning_dna)}
Current Progress: {json.dumps(current_progress)}
Current Hour: {current_hour}

Return as JSON:
{{
  "plan": [{{
    "day": 1,
    "topics": [{{
      "topic": "name",
      "hours": 2,
      "focus": "practice problems" | "review" | "deep study"
    }}],
    "expected_improvement": 5
  }}],
  "projected_final_probability": 0-100,
  "diminishing_returns_warning": boolean,
  "must_study": ["critical topic 1"],
  "can_skip": ["already mastered topic"]
}}

RULES:
- Prioritize high-weight, low-readiness topics
- Include breaks and review days
- Account for forgetting curve
- No markdown, only valid JSON"""

def get_syllabus_analysis_prompt(syllabus_text: str) -> str:
    return f"""Parse this exam syllabus/study guide and extract structured requirements.

Syllabus:
{syllabus_text[:6000]}

Return as JSON:
{{
  "exam_title": "string",
  "topics": [{{
    "name": "topic name",
    "weight": 0.0-1.0,
    "concepts": ["key concept 1", "key concept 2"],
    "question_types": ["MCQ", "short_answer", "essay"]
  }}],
  "total_topics": number,
  "estimated_difficulty": "easy" | "medium" | "hard"
}}

RULES:
- Weights must sum to 1.0
- Infer weights from emphasis/page count if not explicit
- Include all testable topics
- No markdown, only valid JSON"""
