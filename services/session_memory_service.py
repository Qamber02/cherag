import json
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from config import logger
from services.ai_utils import call_ai_with_fallback, sanitize_input
import services.rag_service as rag_service

SESSION_SUMMARY_PROMPT = (
    "Summarize this study session in 2-3 sentences for future reference by the same AI tutor. "
    "Focus on: what topics were covered, what the student struggled with, what they understood well, "
    "and any notable preferences in how they like concepts explained (e.g. prefers examples over theory, "
    "prefers short answers). Do not include filler or restate the obvious. Write it as notes for your "
    "future self, not as a report to the student.\n\n"
    "SESSION TRANSCRIPT:\n{transcript}"
)


def _require_supabase():
    if not rag_service.supabase_admin:
        raise HTTPException(status_code=503, detail="Database not configured")
    return rag_service.supabase_admin


async def generate_and_save_session_summary(
    student_id: str,
    course_id: str,
    session_transcript: str
) -> Dict[str, Any]:
    """Summarize the study session and save to session_summaries table."""
    sanitized_transcript = sanitize_input(session_transcript, 10000)
    if not sanitized_transcript:
        raise HTTPException(status_code=400, detail="Session transcript cannot be empty")

    prompt = SESSION_SUMMARY_PROMPT.format(transcript=sanitized_transcript)
    summary_text = await call_ai_with_fallback(prompt)
    if not summary_text:
        raise HTTPException(status_code=502, detail="Failed to generate session summary")

    summary_text = summary_text.strip()
    supabase = _require_supabase()

    try:
        res = supabase.table("session_summaries").insert({
            "student_id": student_id,
            "course_id": course_id,
            "summary": summary_text
        }).execute()
        
        inserted_data = getattr(res, "data", [])
        saved_row = inserted_data[0] if isinstance(inserted_data, list) and inserted_data else {}
        return {
            "status": "success",
            "summary": summary_text,
            "id": saved_row.get("id")
        }
    except Exception as e:
        logger.error(f"Error saving session summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save session summary")


def fetch_recent_session_summaries(student_id: str, course_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetch the last 3-5 rows from session_summaries for student_id + course_id."""
    supabase = _require_supabase()
    try:
        res = (
            supabase.table("session_summaries")
            .select("summary, created_at")
            .eq("student_id", student_id)
            .eq("course_id", course_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return getattr(res, "data", []) or []
    except Exception as e:
        logger.warning(f"Failed to fetch session summaries: {e}")
        return []


def fetch_unresolved_beliefs(student_id: str, course_id: str) -> List[Dict[str, Any]]:
    """Fetch belief_nodes for student_id + course_id where correctness is misconception or partially_correct."""
    supabase = _require_supabase()
    try:
        res = (
            supabase.table("belief_nodes")
            .select("concept_label, belief_statement, correctness, confidence")
            .eq("student_id", student_id)
            .eq("course_id", course_id)
            .in_("correctness", ["misconception", "partially_correct"])
            .execute()
        )
        return getattr(res, "data", []) or []
    except Exception as e:
        logger.warning(f"Failed to fetch unresolved belief nodes: {e}")
        return []


def get_session_memory_context(student_id: str, course_id: str) -> str:
    """Build context block combining recent session summaries and unresolved belief nodes."""
    if not student_id or not course_id:
        return ""

    summaries = fetch_recent_session_summaries(student_id, course_id, limit=5)
    unresolved = fetch_unresolved_beliefs(student_id, course_id)

    if not summaries and not unresolved:
        return ""

    lines = []
    if summaries:
        lines.append("Prior session notes:")
        # Reverse summaries to present chronological order (oldest to newest among recents)
        for row in reversed(summaries):
            lines.append(f"- {row.get('summary')}")

    if unresolved:
        if lines:
            lines.append("")
        lines.append("Currently unresolved concepts for this student:")
        for node in unresolved:
            label = node.get("concept_label", "Concept")
            statement = node.get("belief_statement", "Under review")
            confidence = node.get("confidence", 0.0)
            lines.append(f"- {label}: {statement} (confidence: {confidence:.2f})")

    return "\n".join(lines)
