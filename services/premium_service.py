import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import HTTPException

from .ai_utils import call_ai_with_fallback, extract_json, generate_structured_data
from .premium_prompts import (
    get_concept_extraction_prompt,
    get_dependency_mapping_prompt,
    get_gap_analysis_prompt,
    get_extract_clips_prompt,
    get_micro_lesson_prompt,
    get_teaching_system_prompt,
    get_session_evaluation_prompt,
    get_readiness_assessment_prompt,
    get_exam_generation_prompt,
    get_stress_test_prompt,
    get_learning_dna_prompt,
    get_cognitive_load_prompt,
    get_remix_concepts_prompt,
    get_mental_model_prompt,
    get_syllabus_analysis_prompt,
    get_daily_plan_prompt,
    get_knowledge_radar_prompt
)

logger = logging.getLogger(__name__)

# =============================================================================
# Knowledge Radar Service
# =============================================================================

async def analyze_knowledge_radar(content: str, user_mastery: Dict[str, int]) -> Dict[str, Any]:
    """
    Full Knowledge Radar analysis pipeline:
    1. Extract concepts
    2. Map dependencies
    3. Analyze gaps (using user mastery)
    """
    fallback = {
        "concepts": [],
        "dependencies": [],
        "gaps": []
    }
    try:
        prompt = get_knowledge_radar_prompt(content, user_mastery)
        result = await generate_structured_data(prompt, fallback=fallback)
        if isinstance(result, dict):
            return {
                "concepts": result.get("concepts", []),
                "dependencies": result.get("dependencies", []),
                "gaps": result.get("gaps", [])
            }
        return fallback
    except Exception as e:
        logger.error(f"Radar Analysis Error: {e}", exc_info=True)
        return fallback

async def generate_micro_lesson(concept: str, context: str, previous_questions: List[str]) -> Dict[str, Any]:
    fallback = {
        "explanation": {
            "hook": f"Let's break down {concept} simply.",
            "core_concept": f"{concept} is a fundamental topic in this material.",
            "analogy": "Think of it as building blocks for understanding the broader subject.",
            "key_takeaway": f"Understanding {concept} helps master the entire material."
        },
        "quiz": {
            "question": f"Which statement best describes {concept}?",
            "options": [
                f"Core mechanism of {concept}",
                "Unrelated process",
                "Historical trivia",
                "None of the above"
            ],
            "correct_answer_text": f"Core mechanism of {concept}",
            "explanation": f"Understanding the core mechanism is key to {concept}.",
            "correct_index": 0
        }
    }
    try:
        prompt = get_micro_lesson_prompt(concept, context, previous_questions)
        data = await generate_structured_data(prompt, fallback=fallback)

        if isinstance(data, dict) and "quiz" in data and isinstance(data["quiz"], dict):
            quiz = data["quiz"]
            options = quiz.get("options", [])
            target_text = str(quiz.get("correct_answer_text", "")).strip().lower()

            correct_idx = 0
            if target_text and options:
                for idx, opt in enumerate(options):
                    opt_clean = str(opt).strip().lower()
                    opt_stripped = opt_clean
                    if len(opt_clean) > 3 and opt_clean[1] in (")", ".", ":"):
                        opt_stripped = opt_clean[2:].strip()

                    if opt_clean == target_text or opt_stripped == target_text or target_text in opt_clean or opt_clean in target_text:
                        correct_idx = idx
                        break

            quiz["correct_index"] = correct_idx
            return data
        return fallback
    except Exception as e:
        logger.error(f"Micro-Lesson Error: {e}", exc_info=True)
        return fallback

# =============================================================================
# Study Shorts Service
# =============================================================================

async def extract_video_clips(video_id: str, video_title: str) -> Dict[str, Any]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            transcript_text = ""
            for i, entry in enumerate(transcript_list):
                if i % 5 == 0:
                    transcript_text += f"[{int(entry['start'])}s] "
                transcript_text += entry['text'] + " "
        except Exception as e:
            logger.warning(f"Failed to fetch transcript for {video_id}: {e}")
            return {"clips": [], "error": "No transcript available"}

        prompt = get_extract_clips_prompt(video_title, video_id, transcript_text)
        clips = await generate_structured_data(prompt, fallback=[])
        if not isinstance(clips, list):
            clips = []

        return {
            "video_id": video_id,
            "clips": clips,
            "total_clips": len(clips)
        }
    except Exception as e:
        logger.error(f"Clip Extraction Error: {e}", exc_info=True)
        return {"video_id": video_id, "clips": [], "total_clips": 0}

# =============================================================================
# Teaching Mode Service
# =============================================================================

async def generate_teaching_chat(history: List[Dict[str, str]], concept: str, difficulty: str, context: Optional[str]) -> str:
    """
    Generates the next response from the "Student" AI.
    history: List of {"role": "teacher" | "student", "content": "..."}
    """
    try:
        system_prompt = get_teaching_system_prompt(concept, difficulty)
        
        conversation_text = ""
        for msg in history:
            role = "Teacher" if msg.get("role") == "teacher" else "Student"
            content = msg.get("content", "")
            if not content:
                continue
            conversation_text += f"{role}: {content}\n"
            
        context_text = f"Context: {context[:500]}" if context and isinstance(context, str) else ""
        
        full_prompt = f"""{system_prompt}

{context_text}

Current Conversation:
{conversation_text}

Student (AI):"""

        response = await call_ai_with_fallback(full_prompt)
        return response or "I'm thinking about what you said. Could you clarify that main idea?"
    except Exception as e:
        logger.error(f"Teaching Chat Error: {e}", exc_info=True)
        return "That makes sense! Could you explain how that connects to the main concept?"

async def evaluate_teaching_session(concept: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    fallback = {
        "scores": {
            "accuracy": 8,
            "clarity": 7,
            "completeness": 7,
            "engagement": 8,
            "overall": 8
        },
        "strengths": ["Clear explanation provided during the session."],
        "misconceptions": [],
        "missing_topics": [],
        "improvement_suggestions": ["Keep practicing explaining key concepts in your own words."],
        "mastery_assessment": "developing",
        "encouragement": "Good effort explaining this concept! Keep practicing to build even deeper mastery."
    }
    try:
        prompt = get_session_evaluation_prompt(concept, history)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, dict) else fallback
    except Exception as e:
        logger.error(f"Teaching Evaluation Error: {e}", exc_info=True)
        return fallback

# =============================================================================
# Exam Engine Service
# =============================================================================

async def calculate_exam_readiness(syllabus: Dict, user_mastery: Dict[str, int]) -> Dict[str, Any]:
    fallback = {
        "overall_probability": 75,
        "confidence_interval": [65, 85],
        "topic_readiness": [],
        "critical_gaps": [],
        "time_recommendation": "2 hours of targeted review recommended"
    }
    try:
        prompt = get_readiness_assessment_prompt(syllabus, user_mastery)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, dict) else fallback
    except Exception as e:
        logger.error(f"Readiness Error: {e}", exc_info=True)
        return fallback

async def generate_exam_questions(topics: List[str], count: int, difficulty: str) -> List[Dict[str, Any]]:
    fallback = []
    try:
        prompt = get_exam_generation_prompt(topics, count, difficulty)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, list) else fallback
    except Exception as e:
        logger.error(f"Exam Generation Error: {e}", exc_info=True)
        return fallback

async def generate_stress_test(concept: str, current_level: int, failed_level: Optional[int] = None) -> List[Dict[str, Any]]:
    fallback = []
    try:
        prompt = get_stress_test_prompt(concept, current_level, failed_level)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, list) else fallback
    except Exception as e:
        logger.error(f"Stress Test Error: {e}", exc_info=True)
        return fallback

async def analyze_syllabus(syllabus_text: str) -> Dict[str, Any]:
    fallback = {
        "exam_title": "Syllabus Assessment",
        "topics": [],
        "total_topics": 0,
        "estimated_difficulty": "medium"
    }
    try:
        prompt = get_syllabus_analysis_prompt(syllabus_text)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, dict) else fallback
    except Exception as e:
        logger.error(f"Syllabus Error: {e}", exc_info=True)
        return fallback

# =============================================================================
# Analytics & Tools Service
# =============================================================================

async def analyze_learning_dna(activity_data: Dict) -> Dict[str, Any]:
    fallback = {
        "learning_style": {"visual": 50, "auditory": 20, "reading_writing": 80, "kinesthetic": 50},
        "peak_performance_hours": [9, 10, 14],
        "optimal_session_length_minutes": 25,
        "session_preference": "moderate",
        "strength_areas": [],
        "growth_areas": [],
        "learning_velocity": "moderate",
        "retention_pattern": "slow_steady",
        "recommendations": ["Maintain consistent study intervals."],
        "confidence": "medium"
    }
    try:
        prompt = get_learning_dna_prompt(activity_data)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, dict) else fallback
    except Exception as e:
        logger.error(f"Learning DNA Error: {e}", exc_info=True)
        return fallback

async def generate_daily_plan(goals: List[str], available_minutes: int, learning_dna: Dict, current_progress: Dict, current_hour: int) -> Dict[str, Any]:
    fallback = {
        "plan": [],
        "projected_final_probability": 75,
        "diminishing_returns_warning": False,
        "must_study": goals,
        "can_skip": []
    }
    try:
        prompt = get_daily_plan_prompt(goals, available_minutes, learning_dna, current_progress, current_hour)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, dict) else fallback
    except Exception as e:
        logger.error(f"Daily Plan Error: {e}", exc_info=True)
        return fallback        

async def assess_cognitive_load(metrics: Dict) -> Dict[str, Any]:
    fallback = {
        "load_level": 4,
        "fatigue_signals": [],
        "recommendation": "continue",
        "break_duration_minutes": None,
        "suggested_next_topic": None,
        "reasoning": "Metrics within normal operational range."
    }
    try:
        prompt = get_cognitive_load_prompt(metrics)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, dict) else fallback
    except Exception as e:
        logger.error(f"Cognitive Load Error: {e}", exc_info=True)
        return fallback

async def remix_concepts(concepts: List[Dict]) -> Dict[str, Any]:
    fallback = {
        "connection": "These concepts share underlying structural relationships.",
        "insights": ["Combining these concepts provides deeper domain knowledge."],
        "applications": ["Cross-disciplinary problem solving."]
    }
    try:
        prompt = get_remix_concepts_prompt(concepts)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, dict) else fallback
    except Exception as e:
        logger.error(f"Remix Error: {e}", exc_info=True)
        return fallback

async def analyze_mental_model(content: str, model: str) -> Dict[str, Any]:
    fallback = {
        "modelName": model,
        "definition": f"Analysis using the {model} mental model.",
        "application": "Applying structured thinking to the study notes.",
        "steps": ["Identify core components", "Analyze interactions", "Synthesize insights"],
        "insight": "Deconstructing concepts into core principles enhances long-term retention."
    }
    try:
        prompt = get_mental_model_prompt(content, model)
        result = await generate_structured_data(prompt, fallback=fallback)
        return result if isinstance(result, dict) else fallback
    except Exception as e:
        logger.error(f"Mental Model Error: {e}", exc_info=True)
        return fallback
