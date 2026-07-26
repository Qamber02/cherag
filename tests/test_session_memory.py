import pytest
from unittest.mock import patch, MagicMock
from services.session_memory_service import (
    get_session_memory_context,
    generate_and_save_session_summary,
)


def test_get_session_memory_context_formatting():
    mock_summaries = [
        {"summary": "Student struggled with call stack limits.", "created_at": "2026-07-26T10:00:00Z"},
        {"summary": "Covered base cases in depth. Student prefers diagrammatic explanations.", "created_at": "2026-07-26T09:00:00Z"}
    ]
    mock_unresolved_beliefs = [
        {
            "concept_label": "Call Stack",
            "belief_statement": "Thinks call stack holds unlimited frames",
            "correctness": "misconception",
            "confidence": 0.85
        },
        {
            "concept_label": "Tail Recursion",
            "belief_statement": "Partially understands optimization",
            "correctness": "partially_correct",
            "confidence": 0.50
        }
    ]

    with patch("services.session_memory_service.fetch_recent_session_summaries", return_value=mock_summaries), \
         patch("services.session_memory_service.fetch_unresolved_beliefs", return_value=mock_unresolved_beliefs):

        context = get_session_memory_context("student-123", "computer_arch")

        assert "Prior session notes:" in context
        assert "Student prefers diagrammatic explanations." in context
        assert "Student struggled with call stack limits." in context
        assert "Currently unresolved concepts for this student:" in context
        assert "Call Stack: Thinks call stack holds unlimited frames (confidence: 0.85)" in context
        assert "Tail Recursion: Partially understands optimization (confidence: 0.50)" in context


def test_get_session_memory_context_empty():
    with patch("services.session_memory_service.fetch_recent_session_summaries", return_value=[]), \
         patch("services.session_memory_service.fetch_unresolved_beliefs", return_value=[]):

        context = get_session_memory_context("student-123", "computer_arch")
        assert context == ""


@pytest.mark.asyncio
async def test_generate_and_save_session_summary():
    mock_llm_response = "Student covered virtual memory. Struggled with page tables. Prefers concrete OS examples."
    mock_insert_res = MagicMock()
    mock_insert_res.data = [{"id": "sum-999"}]

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = mock_insert_res

    with patch("services.session_memory_service.call_ai_with_fallback", return_value=mock_llm_response), \
         patch("services.session_memory_service._require_supabase", return_value=mock_supabase):

        result = await generate_and_save_session_summary(
            student_id="student-123",
            course_id="os_basics",
            session_transcript="Teacher: Explain page tables.\nStudent: Page tables store memory directly on disk."
        )

        assert result["status"] == "success"
        assert result["summary"] == mock_llm_response
        assert result["id"] == "sum-999"
