import pytest
from services.belief_service import (
    get_concept_label,
    _normalize_belief_payload,
    _build_extraction_prompt,
    _build_propagation_prompt,
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
