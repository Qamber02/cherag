
from typing import List, Dict, Optional

# =============================================================================
# Standard Study Assistant Prompts
# =============================================================================

def get_summary_prompt(length_instruction: str, style_instruction: str, focus_instruction: str, sanitized_content: str) -> str:
    return f"""Create a {length_instruction} summary of this text for a student.

**CRITICAL FORMATTING RULES:**
1. {style_instruction}
2. Use **bold** for key terms and important concepts.
3. Include section headers using ## for organization.
4. Highlight definitions and core concepts.

{focus_instruction}

Text:
{sanitized_content}"""

def get_flashcards_prompt(sanitized_content: str) -> str:
    return f"""Generate 5 study flashcards as a JSON array. Format: [{{"question": "...", "answer": "..."}}]. No markdown, ONLY valid JSON.

Text:
{sanitized_content}"""

def get_difficulty_prompt(difficulty: str) -> str:
    return {
        "hard": "Make questions challenging, focusing on analysis, synthesis, and deep understanding.",
        "easy": "Make questions straightforward, focusing on basic definitions and core concepts.",
        "medium": "Make questions of medium difficulty, focusing on application and understanding."
    }.get(difficulty, "")

def get_quizzes_prompt(count: int, difficulty: str, difficulty_prompt: str, variance_instruction: str, sanitized_content: str) -> str:
    return f"""Generate {count} multiple choice questions as a JSON array.
Format: [{{"question": "...", "options": ["A) text", "B) text", "C) text", "D) text"], "correct_answer": "A", "explanation": "..."}}]

CRITICAL RULES:
1. correct_answer must be just the letter (A, B, C, or D)
2. VARY the correct answers - do NOT make all answers the same letter!
3. Each option should start with its letter like "A) answer text"
4. Difficulty Level: {difficulty}. {difficulty_prompt}
5. No markdown, ONLY valid JSON array
{variance_instruction}

Text:
{sanitized_content}"""

def get_mindmap_prompt(sanitized_content: str) -> str:
    return f"""Create a simple mind map as JSON.
Format: {{"title": "Main Topic", "children": [{{"title": "Subtopic 1"}}, {{"title": "Subtopic 2"}}]}}
Max 2 levels deep. No markdown, ONLY valid JSON.

Text:
{sanitized_content}"""

def get_chat_prompt(sanitized_context: str, sanitized_query: str) -> str:
    return f"""You are Cherág, an AI study assistant. You help students understand their study materials. Be helpful, clear, and educational.

Based on this context, answer the question.

Context:
{sanitized_context or 'No context provided'}

Question: {sanitized_query}"""

def get_roadmap_prompt(sanitized_content: str) -> str:
    return f"""Create a learning roadmap from this content as JSON.

CONTENT:
{sanitized_content}

OUTPUT FORMAT (JSON only):
{{
  "id": "main",
  "title": "Main Topic",
  "type": "main",
  "description": "Brief overview",
  "children": [
    {{
      "id": "t1",
      "title": "Topic 1",
      "type": "topic",
      "description": "Description",
      "children": [
        {{"id": "s1", "title": "Subtopic", "type": "subtopic", "description": "Detail"}}
      ]
    }}
  ]
}}

RULES:
- 3-5 main topics
- 2-3 subtopics each
- Short titles (2-4 words)
- Brief descriptions

OUTPUT ONLY JSON:"""

def get_node_explanation_prompt(sanitized_title: str, sanitized_desc: str) -> str:
    return f"""Explain "{sanitized_title}" for a student learning this topic.

Context: {sanitized_desc}

Provide a clear, well-structured explanation with:

## Overview
A clear 2-paragraph explanation of what this is and why it matters.

## Key Points
- First important point about this topic
- Second key concept to understand
- Third essential aspect

## Why It Matters
Brief explanation of practical importance.

Use proper formatting with headers and bullet points."""

def get_rag_chat_prompt(context: str, sanitized_query: str) -> str:
    return f"""You are Cherág, an AI study assistant. Answer the student's question based ONLY on the following document excerpts.

DOCUMENT EXCERPTS:
{context}

STUDENT QUESTION: {sanitized_query}

Provide a helpful, accurate answer. If the excerpts don't contain enough information, say so."""

# =============================================================================
# Service Prompts
# =============================================================================

def get_video_topic_prompt(topic: str) -> str:
    return f"""Extract the main educational topic from this content in 3-5 keywords for a YouTube search. Only output the keywords, nothing else.

Content: {topic[:1000]}

Keywords:"""

def get_ocr_prompt() -> str:
    return "Extract all text from this image. Return only the extracted text, nothing else."

def get_deepseek_system_prompt() -> str:
    return "You are a helpful study assistant."
