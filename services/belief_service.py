import json
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from config import logger
from services.ai_utils import call_ai_with_fallback, extract_json, sanitize_input
import services.rag_service as rag_service

CORRECTNESS_VALUES = {"correct", "partially_correct", "misconception", "unknown"}

RECURSION_CONCEPTS: Dict[str, str] = {
    "recursion.base_case": "Base case as termination requirement",
    "recursion.recursive_call": "Recursive call structure",
    "recursion.call_stack": "Call stack and stack depth",
    "recursion.stack_overflow": "Stack overflow causes",
    "recursion.mutual_recursion": "Mutual recursion",
    "recursion.tail_recursion": "Tail recursion optimization",
}


def get_concept_label(concept_id: str) -> str:
    return RECURSION_CONCEPTS.get(concept_id, concept_id.replace(".", " ").replace("_", " ").title())


def _require_supabase():
    if not rag_service.supabase_admin:
        raise HTTPException(status_code=503, detail="Database not configured")
    return rag_service.supabase_admin


def _normalize_belief_payload(payload: Dict[str, Any], fallback_statement: str) -> Dict[str, Any]:
    correctness = payload.get("correctness", "unknown")
    if correctness not in CORRECTNESS_VALUES:
        correctness = "unknown"

    try:
        confidence = float(payload.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0

    return {
        "relevant": bool(payload.get("relevant", True)),
        "belief_statement": str(payload.get("belief_statement") or fallback_statement).strip()[:1200],
        "correctness": correctness,
        "confidence": max(0.0, min(1.0, confidence)),
        "changed_from_previous": bool(payload.get("changed_from_previous", True)),
        "reasoning": str(payload.get("reasoning") or "").strip()[:800],
    }


async def _call_belief_llm(prompt: str, fallback_statement: str) -> Dict[str, Any]:
    try:
        raw = await call_ai_with_fallback(prompt)
        parsed = json.loads(extract_json(raw))
        if not isinstance(parsed, dict):
            raise ValueError("Belief LLM returned non-object JSON")
        return _normalize_belief_payload(parsed, fallback_statement)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Belief LLM parsing failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=502, detail="Belief model returned invalid data")


def _extract_existing_node(result: Any) -> Optional[Dict[str, Any]]:
    data = getattr(result, "data", None)
    if isinstance(data, list):
        return data[0] if data else None
    if isinstance(data, dict):
        return data
    return None


def _fetch_belief_node(student_id: str, course_id: str, concept_id: str) -> Optional[Dict[str, Any]]:
    supabase = _require_supabase()
    result = (
        supabase.table("belief_nodes")
        .select("*")
        .eq("student_id", student_id)
        .eq("course_id", course_id)
        .eq("concept_id", concept_id)
        .limit(1)
        .execute()
    )
    return _extract_existing_node(result)


def _upsert_belief_node(
    student_id: str,
    course_id: str,
    concept_id: str,
    concept_label: str,
    belief: Dict[str, Any],
) -> Dict[str, Any]:
    supabase = _require_supabase()
    payload = {
        "student_id": student_id,
        "course_id": course_id,
        "concept_id": concept_id,
        "concept_label": concept_label,
        "belief_statement": belief["belief_statement"],
        "correctness": belief["correctness"],
        "confidence": belief["confidence"],
    }
    result = (
        supabase.table("belief_nodes")
        .upsert(payload, on_conflict="student_id,course_id,concept_id")
        .execute()
    )
    return _extract_existing_node(result) or payload


def _insert_history(
    student_id: str,
    concept_id: str,
    belief: Dict[str, Any],
    triggering_answer: str,
) -> None:
    supabase = _require_supabase()
    supabase.table("belief_history").insert(
        {
            "student_id": student_id,
            "concept_id": concept_id,
            "belief_statement": belief["belief_statement"],
            "correctness": belief["correctness"],
            "confidence": belief["confidence"],
            "triggering_answer": triggering_answer[:8000],
        }
    ).execute()


def _fetch_neighbors(course_id: str, concept_id: str) -> List[Dict[str, Any]]:
    supabase = _require_supabase()
    result = (
        supabase.table("belief_edges")
        .select("*")
        .eq("course_id", course_id)
        .execute()
    )
    edges = getattr(result, "data", []) or []
    return [
        edge
        for edge in edges
        if edge.get("from_concept") == concept_id or edge.get("to_concept") == concept_id
    ]


def _build_extraction_prompt(
    concept_label: str,
    previous_belief_statement: str,
    student_answer: str,
) -> str:
    return f"""You are a cognitive modeling engine, not a grader. Your job is to infer what
a student genuinely believes about a specific target concept based on their answer, including
incorrect or partially-formed beliefs.

Given:
- Target concept being evaluated: {concept_label}
- The student's previous belief (if any): {previous_belief_statement}
- The student's new answer/input: {student_answer}

CRITICAL RELEVANCE RULE:
- First, evaluate if the student's answer provides GENUINE, DIRECT evidence about the target concept "{concept_label}".
- If the student's answer is about a completely DIFFERENT or UNRELATED topic (for instance, discussing ALU flags or databases when evaluating "recursive call structure"), set `"relevant": false`.
- Set `"relevant": false` whenever the answer does NOT provide evidence about "{concept_label}", regardless of whether the answer itself was correct or intelligent for whatever unrelated topic it addressed.
- Set `"relevant": true` ONLY if the answer genuinely addresses or provides evidence regarding "{concept_label}".

Return JSON:
{{
  "relevant": true,
  "belief_statement": "a plain-language description of what the student currently seems to think is true about {concept_label}",
  "correctness": "correct | partially_correct | misconception | unknown",
  "confidence": 0.0,
  "changed_from_previous": true,
  "reasoning": "brief note on why you updated it this way or why it is irrelevant"
}}

Be specific. Vague statements like "student doesn't understand recursion" are
not useful. Specific statements like "student believes the base case is a
performance optimization rather than a termination requirement" are useful."""


def _build_propagation_prompt(
    neighbor_label: str,
    relationship_type: str,
    updated_concept_label: str,
    summary_of_change: str,
    neighbor_belief_statement: str,
) -> str:
    return f"""A related concept's belief was just updated. Related concept: {neighbor_label}.
Relationship: {relationship_type} to {updated_concept_label}. What just changed
there: {summary_of_change}. Given the neighbor's current belief:
{neighbor_belief_statement}, should this neighbor's belief or confidence change?
Return JSON in this format:
{{
  "belief_statement": "a plain-language description of what the student currently seems to think is true",
  "correctness": "correct | partially_correct | misconception | unknown",
  "confidence": 0.0,
  "changed_from_previous": true,
  "reasoning": "brief note on why you updated it this way",
  "unchanged": false
}}

If nothing should update, return {{"unchanged": true}}."""


async def update_belief(
    student_id: str,
    course_id: str,
    concept_id: str,
    student_answer: str,
) -> Dict[str, Any]:
    concept_label = get_concept_label(concept_id)
    sanitized_answer = sanitize_input(student_answer, 8000)
    existing = _fetch_belief_node(student_id, course_id, concept_id)
    previous_statement = existing.get("belief_statement") if existing else None
    previous_statement = previous_statement or "unknown, no prior data"

    prompt = _build_extraction_prompt(concept_label, previous_statement, sanitized_answer)
    fallback_statement = f"Student gave new evidence about {concept_label}, but the belief could not be modeled."
    belief = await _call_belief_llm(prompt, fallback_statement)

    # RELEVANCE GATE: If the answer is irrelevant to the target concept, skip updates entirely
    if not belief.get("relevant", True):
        logger.info(
            "Belief update skipped for concept '%s': answer is irrelevant (reasoning: %s)",
            concept_id,
            belief.get("reasoning", "Unrelated answer"),
        )
        return {
            "status": "skipped",
            "reason": "irrelevant",
            "message": f"Answer is not relevant to concept '{concept_label}'",
            "concept_id": concept_id,
            "concept_label": concept_label,
            "student_id": student_id,
            "course_id": course_id,
            "belief_node": existing,
        }

    updated_node = _upsert_belief_node(student_id, course_id, concept_id, concept_label, belief)
    _insert_history(student_id, concept_id, belief, sanitized_answer)

    await _propagate_to_neighbors(
        student_id=student_id,
        course_id=course_id,
        updated_concept_id=concept_id,
        updated_concept_label=concept_label,
        updated_belief=belief,
        triggering_answer=sanitized_answer,
    )

    return updated_node


async def _propagate_to_neighbors(
    student_id: str,
    course_id: str,
    updated_concept_id: str,
    updated_concept_label: str,
    updated_belief: Dict[str, Any],
    triggering_answer: str,
) -> None:
    edges = _fetch_neighbors(course_id, updated_concept_id)
    summary = (
        f"{updated_belief['belief_statement']} "
        f"Correctness: {updated_belief['correctness']}; confidence: {updated_belief['confidence']:.2f}."
    )

    for edge in edges:
        neighbor_id = (
            edge.get("to_concept")
            if edge.get("from_concept") == updated_concept_id
            else edge.get("from_concept")
        )
        if not neighbor_id:
            continue

        neighbor_label = get_concept_label(neighbor_id)
        neighbor_node = _fetch_belief_node(student_id, course_id, neighbor_id)
        neighbor_statement = (
            neighbor_node.get("belief_statement")
            if neighbor_node
            else "unknown, no prior data"
        )
        prompt = _build_propagation_prompt(
            neighbor_label=neighbor_label,
            relationship_type=edge.get("relationship", "related"),
            updated_concept_label=updated_concept_label,
            summary_of_change=summary,
            neighbor_belief_statement=neighbor_statement or "unknown, no prior data",
        )

        try:
            raw = await call_ai_with_fallback(prompt)
            parsed = json.loads(extract_json(raw))
            if not isinstance(parsed, dict) or parsed.get("unchanged") is True:
                continue
            belief = _normalize_belief_payload(parsed, neighbor_statement or "unknown")
        except Exception as exc:
            logger.warning("Belief propagation skipped for %s: %s", neighbor_id, exc)
            continue

        if not belief["changed_from_previous"]:
            continue

        _upsert_belief_node(student_id, course_id, neighbor_id, neighbor_label, belief)
        _insert_history(
            student_id,
            neighbor_id,
            belief,
            f"Propagation from {updated_concept_id}: {triggering_answer[:1000]}",
        )
