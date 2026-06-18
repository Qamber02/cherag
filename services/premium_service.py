
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import HTTPException

from .ai_utils import call_ai_with_fallback, extract_json
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
    get_compress_concept_prompt,
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
    try:
        # Optimized: Single AI call for all steps (reduces latency by ~60%)
        prompt = get_knowledge_radar_prompt(content, user_mastery)
        response = await call_ai_with_fallback(prompt)
        result = json.loads(extract_json(response))
        
        return {
            "concepts": result.get("concepts", []),
            "dependencies": result.get("dependencies", []),
            "gaps": result.get("gaps", [])
        }
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error in Radar Analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Radar Analysis Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

async def generate_micro_lesson(concept: str, context: str, previous_questions: List[str]) -> Dict[str, Any]:
    try:
        prompt = get_micro_lesson_prompt(concept, context, previous_questions)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Micro-Lesson Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# =============================================================================
# Study Shorts Service
# =============================================================================

async def extract_video_clips(video_id: str, video_title: str) -> Dict[str, Any]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        # Fetch transcript
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            # Combine transcript into a single string with timestamps roughly every minute
            # For the AI prompt, a raw text block is often better, but strict timestamps are needed
            # We'll pass the full text for extraction, but the AI won't know exact seconds unless we provide them
            # Let's provide a text block with timestamp markers
            
            transcript_text = ""
            for i, entry in enumerate(transcript_list):
                 # Add timestamp every ~30 seconds of text or 10 entries to keep it readable but actionable
                if i % 5 == 0:
                    transcript_text += f"[{int(entry['start'])}s] "
                transcript_text += entry['text'] + " "
                
        except Exception as e:
            logger.warning(f"Failed to fetch transcript for {video_id}: {e}")
            # Fallback for no transcript? Or error?
            # For now, return empty or specific error
            return {"clips": [], "error": "No transcript available"}

        prompt = get_extract_clips_prompt(video_title, video_id, transcript_text)
        response = await call_ai_with_fallback(prompt)
        clips = json.loads(extract_json(response))
        
        return {
            "video_id": video_id,
            "clips": clips,
            "total_clips": len(clips)
        }
    except Exception as e:
        logger.error(f"Clip Extraction Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# =============================================================================
# Teaching Mode Service
# =============================================================================

async def generate_teaching_chat(history: List[Dict[str, str]], concept: str, difficulty: str, context: Optional[str]) -> str:
    """
    Generates the next response from the "Student" AI.
    history: List of {"role": "teacher" | "student", "content": "..."}
    """
    try:
        
        # Construct the full prompt
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
        return response
    except Exception as e:
        logger.error(f"Teaching Chat Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def evaluate_teaching_session(concept: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    try:
        prompt = get_session_evaluation_prompt(concept, history)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Teaching Evaluation Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Exam Engine Service
# =============================================================================

async def calculate_exam_readiness(syllabus: Dict, user_mastery: Dict[str, int]) -> Dict[str, Any]:
    try:
        prompt = get_readiness_assessment_prompt(syllabus, user_mastery)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Readiness Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def generate_exam_questions(topics: List[str], count: int, difficulty: str) -> List[Dict[str, Any]]:
    try:
        prompt = get_exam_generation_prompt(topics, count, difficulty)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Exam Generation Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def generate_stress_test(concept: str, current_level: int, failed_level: Optional[int] = None) -> List[Dict[str, Any]]:
    try:
        prompt = get_stress_test_prompt(concept, current_level, failed_level)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Stress Test Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def analyze_syllabus(syllabus_text: str) -> Dict[str, Any]:
    try:
        prompt = get_syllabus_analysis_prompt(syllabus_text)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Syllabus Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Analytics & Tools Service
# =============================================================================

async def analyze_learning_dna(activity_data: Dict) -> Dict[str, Any]:
    try:
        prompt = get_learning_dna_prompt(activity_data)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Learning DNA Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def generate_daily_plan(goals: List[str], available_minutes: int, learning_dna: Dict, current_progress: Dict, current_hour: int) -> Dict[str, Any]:
    try:
        prompt = get_daily_plan_prompt(goals, available_minutes, learning_dna, current_progress, current_hour)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Daily Plan Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))        

async def assess_cognitive_load(metrics: Dict) -> Dict[str, Any]:
    try:
        prompt = get_cognitive_load_prompt(metrics)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Cognitive Load Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def compress_concept(content: str, concept_name: str) -> Dict[str, Any]:
    try:
        prompt = get_compress_concept_prompt(content, concept_name)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Compress Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def remix_concepts(concepts: List[Dict]) -> Dict[str, Any]:
    try:
        prompt = get_remix_concepts_prompt(concepts)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Remix Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def analyze_mental_model(content: str, model: str) -> Dict[str, Any]:
    try:
        prompt = get_mental_model_prompt(content, model)
        response = await call_ai_with_fallback(prompt)
        return json.loads(extract_json(response))
    except Exception as e:
        logger.error(f"Mental Model Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

