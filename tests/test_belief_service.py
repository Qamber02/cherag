import pytest
from services.belief_service import (
    get_concept_label,
    _normalize_belief_payload,
    _build_extraction_prompt,
    _build_propagation_prompt,
    update_belief,
    CORRECTNESS_VALUES,
)


def test_get_concept_label_known():
    label = get_concept_label("recursion.base_case")
    assert label == "Base case as termination requirement"


def test_get_concept_label_fallback():
    label = get_concept_label("recursion.custom_topic_id")
    assert label == "Recursion Custom Topic Id"


def test_normalize_belief_payload_valid():
    raw = {
        "belief_statement": "Student understands base case",
        "correctness": "correct",
        "confidence": 0.85,
        "changed_from_previous": True,
        "reasoning": "Clear explanation given",
    }
    normalized = _normalize_belief_payload(raw, "fallback")
    assert normalized["belief_statement"] == "Student understands base case"
    assert normalized["correctness"] == "correct"
    assert normalized["confidence"] == 0.85
    assert normalized["changed_from_previous"] is True


def test_normalize_belief_payload_invalid_correctness():
    raw = {
        "belief_statement": "Invalid state test",
        "correctness": "invalid_value",
        "confidence": "high",
    }
    normalized = _normalize_belief_payload(raw, "fallback")
    assert normalized["correctness"] == "unknown"
    assert normalized["confidence"] == 0.0


def test_build_extraction_prompt():
    prompt = _build_extraction_prompt(
        concept_label="Base case",
        previous_belief_statement="No prior data",
        student_answer="A base case stops the loop.",
    )
    assert "Base case" in prompt
    assert "A base case stops the loop." in prompt
    assert "correctness" in prompt


def test_build_propagation_prompt():
    prompt = _build_propagation_prompt(
        neighbor_label="Recursive call",
        relationship_type="depends_on",
        updated_concept_label="Base case",
        summary_of_change="Base case belief was corrected",
        neighbor_belief_statement="Recursive call requires a condition",
    )
    assert "Recursive call" in prompt
    assert "Base case" in prompt
    assert "depends_on" in prompt


def test_normalize_belief_payload_relevance():
    raw = {
        "relevant": False,
        "belief_statement": "Irrelevant answer test",
        "reasoning": "Answer is about ALU flags, not recursion.",
    }
    normalized = _normalize_belief_payload(raw, "fallback")
    assert normalized["relevant"] is False
    assert normalized["reasoning"] == "Answer is about ALU flags, not recursion."


from unittest.mock import patch

@pytest.mark.asyncio
async def test_update_belief_irrelevant_answer():
    mock_llm_payload = {
        "relevant": False,
        "belief_statement": "Unrelated answer",
        "correctness": "unknown",
        "confidence": 0.0,
        "changed_from_previous": False,
        "reasoning": "Student answered about ALU flags, not recursion.",
    }
    with patch("services.belief_service._call_belief_llm", return_value=mock_llm_payload), \
         patch("services.belief_service._fetch_belief_node", return_value=None), \
         patch("services.belief_service._upsert_belief_node") as mock_upsert, \
         patch("services.belief_service._insert_history") as mock_history:

        res = await update_belief(
            student_id="test_student",
            course_id="recursion",
            concept_id="recursion.recursive_call",
            student_answer="The ALU flag indicates overflow in signed operations.",
        )

        assert res["status"] == "skipped"
        assert res["reason"] == "irrelevant"
        assert "not relevant" in res["message"]
        mock_upsert.assert_not_called()
        mock_history.assert_not_called()

