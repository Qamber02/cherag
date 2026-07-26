import pytest
from unittest.mock import patch, AsyncMock
from services.premium_service import evaluate_teaching_session, analyze_knowledge_radar

@pytest.mark.asyncio
async def test_evaluate_teaching_session_handles_invalid_json():
    with patch("services.premium_service.generate_structured_data", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "scores": {"accuracy": 8, "clarity": 7, "completeness": 7, "engagement": 8, "overall": 8},
            "strengths": ["Clear explanation provided during the session."],
            "misconceptions": [],
            "missing_topics": [],
            "improvement_suggestions": ["Keep practicing."],
            "mastery_assessment": "developing",
            "encouragement": "Good effort!"
        }
        
        result = await evaluate_teaching_session("Photosynthesis", [{"role": "teacher", "content": "It converts light to energy"}])
        
        assert isinstance(result, dict)
        assert "scores" in result
        assert result["scores"]["overall"] >= 1
        assert "strengths" in result

@pytest.mark.asyncio
async def test_analyze_radar_handles_empty_response():
    with patch("services.premium_service.generate_structured_data", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {"concepts": [], "dependencies": [], "gaps": []}
        
        result = await analyze_knowledge_radar("Some content", {})
        
        assert isinstance(result, dict)
        assert result["concepts"] == []
        assert result["dependencies"] == []
        assert result["gaps"] == []
