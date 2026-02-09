
import jwt
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from supabase import create_client, Client

# Config & Auth
from config import (
    logger, PREVIEW_DEPLOYMENT_ORIGINS, PREVIEW_DEPLOYMENT_REGEX,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
)
from auth import verify_jwt

# Schemas
from schemas import (
    SummaryRequest, FlashcardsRequest, QuizzesRequest, MindmapRequest,
    VideosRequest, ChatRequest, RoadmapRequest, NodeExplanationRequest,
    VideosResponse,
    ProcessDocumentRequest, DocumentStatusResponse, RAGChatRequest,
    SyllabusAnalysisRequest, DailyPlanRequest, RadarAnalysisRequest,
    MicroLessonRequest, VideoExtractionRequest, TeachingChatRequest,
    TeachingEvaluationRequest, ExamReadinessRequest, ExamQuestionsRequest,
    StressTestRequest, LearningDNARequest, CognitiveLoadRequest,
    CompressConceptRequest, RemixConceptsRequest, MentalModelRequest
)

# Services
import services.ai_utils as ai_utils
from services.ai_utils import call_ai_with_fallback, sanitize_input, extract_json
import services.video_service as video_service
import services.premium_service as premium_service
import services.rag_service as rag_service

# =============================================================================
# Lifecycle & App Setup
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 60)
    logger.info("Cherág Backend Starting Up (Refactored)")
    await ai_utils.init_http_client()
    rag_service.init_supabase_admin()
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("Cherág Backend Shutting Down")
    await ai_utils.close_http_client()

app = FastAPI(
    title="Cherág Study Engine",
    description="AI-powered study assistant backend",
    version="2.0.0",
    lifespan=lifespan
)

# Supabase Client for Middleware
supabase_client: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Supabase Client: {e}")

# Rate Limiting Middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip OPTIONS requests
    if request.method == "OPTIONS":
        return await call_next(request)

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer ") and supabase_client:
        token = auth_header.split(" ")[1]
        try:
            if SUPABASE_JWT_SECRET:
                # Verify token independently to avoid dependency issues in middleware
                payload = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated",
                    options={"verify_exp": True}
                )
                user_id = payload.get("sub")

                if user_id:
                    # Check rate limit
                    try:
                        # Fetch profile asynchronously
                        profile = await asyncio.to_thread(lambda: supabase_client.table("profiles").select("daily_requests_count, last_request_time").eq("id", user_id).single().execute())

                        if profile.data:
                            count = profile.data.get("daily_requests_count", 0)
                            last_request_time_str = profile.data.get("last_request_time")

                            # Check if reset needed
                            if last_request_time_str:
                                try:
                                    last_request = datetime.fromisoformat(last_request_time_str.replace('Z', '+00:00'))
                                    now = datetime.now(timezone.utc)
                                    if last_request.date() < now.date():
                                        count = 0
                                except ValueError:
                                    # Handle parsing error, maybe reset?
                                    pass

                            # Limit (Default 1000)
                            LIMIT = 1000
                            if count >= LIMIT:
                                logger.warning(f"Rate limit exceeded for user {user_id}")
                                return JSONResponse(
                                    status_code=429,
                                    content={"detail": "Rate limit exceeded. Please try again tomorrow."}
                                )

                            # Increment count
                            # We use asyncio.to_thread to avoid blocking the event loop with sync DB call.
                            # Note: This is still a read-modify-write race condition if not atomic.
                            new_count = count + 1
                            await asyncio.to_thread(lambda: supabase_client.table("profiles").update({
                                "daily_requests_count": new_count,
                                "last_request_time": datetime.now(timezone.utc).isoformat()
                            }).eq("id", user_id).execute())

                    except Exception as e:
                        logger.error(f"Rate limit check failed: {e}")
                        # Fail open to avoid blocking users on DB errors
                        pass

        except Exception:
            # Invalid token or other error, proceed
            pass

    response = await call_next(request)
    return response

# Private Network Access (PNA) Middleware to fix browser warnings
@app.middleware("http")
async def add_private_network_access_header(request: Request, call_next):
    response = await call_next(request)
    # If the browser is requesting private network access (e.g. from HTTPS public site to localhost)
    if request.headers.get("Access-Control-Request-Private-Network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    origin = request.headers.get("origin", "no-origin")
    logger.info(f"[REQUEST] {request.method} {request.url.path} from {origin}")
    response = await call_next(request)
    logger.info(f"[RESPONSE] {request.method} {request.url.path} -> {response.status_code}")
    return response

# CORS Configuration - Added last to be outermost middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=PREVIEW_DEPLOYMENT_ORIGINS,
    allow_origin_regex=PREVIEW_DEPLOYMENT_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Standard Endpoints
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "cherag-backend"}

@app.post("/generate-summary")
async def generate_summary(
    request: SummaryRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate AI summary of content."""
    sanitized = sanitize_input(request.context)
    
    # Build customized instructions
    length_instruction = "medium length (4-5 paragraphs)"
    style_instruction = "Use a balanced mix of bullet points for lists and paragraphs for explanations."
    focus_instruction = ""
    
    if request.length == "short":
        length_instruction = "very brief and concise (2-3 paragraphs max)"
    elif request.length == "detailed":
        length_instruction = "comprehensive, detailed, and in-depth"
    
    if request.style == "bullet":
        style_instruction = "STRICT FORMATTING RULE: Use BULLET POINTS ONLY. Do NOT use paragraphs."
    elif request.style == "paragraph":
        style_instruction = "STRICT FORMATTING RULE: Use PARAGRAPHS ONLY. Do NOT use bullet points."
    
    if request.focus:
        focus_instruction = f"Focus specifically on: {request.focus}."
    
    prompt = f"""Create a {length_instruction} summary of this text for a student.

**CRITICAL FORMATTING RULES:**
1. {style_instruction}
2. Use **bold** for key terms and important concepts.
3. Include section headers using ## for organization.
4. Highlight definitions and core concepts.

{focus_instruction}

Text:
{sanitized}"""

    result = await call_ai_with_fallback(prompt)
    return {"summary": result}

@app.post("/generate-flashcards")
async def generate_flashcards(
    request: FlashcardsRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate flashcards from content."""
    sanitized = sanitize_input(request.context)
    
    prompt = f"""Generate 5 study flashcards as a JSON array. Format: [{{"question": "...", "answer": "..."}}]. No markdown, ONLY valid JSON.

Text:
{sanitized}"""

    result = await call_ai_with_fallback(prompt)
    cleaned = extract_json(result)
    
    try:
        import json
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            raise ValueError("Not an array")
        return {"flashcards": parsed}
    except Exception:
        # Fallback
        return {"flashcards": [{"question": "What are the main topics?", "answer": sanitized[:200] + "..."}]}

@app.post("/generate-quizzes")
async def generate_quizzes(
    request: QuizzesRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate quiz questions from content."""
    sanitized = sanitize_input(request.context)
    count = request.count or 5
    difficulty = request.difficulty or "medium"
    
    difficulty_prompt = {
        "hard": "Make questions challenging, focusing on analysis, synthesis, and deep understanding.",
        "easy": "Make questions straightforward, focusing on basic definitions and core concepts.",
        "medium": "Make questions of medium difficulty, focusing on application and understanding."
    }.get(difficulty, "")
    
    variance_instruction = ""
    if request.force_refresh:
        import time
        seed = int(time.time())
        variance_instruction = f"Ensure questions are COMPLETELY different. Random seed: {seed}."
    
    prompt = f"""Generate {count} multiple choice questions as a JSON array. 
Format: [{{"question": "...", "options": ["A) text", "B) text", "C) text", "D) text"], "correct_answer": "A", "explanation": "..."}}]

CRITICAL RULES:
1. correct_answer must be just the letter (A, B, C, or D)
2. VARY the correct answers - do NOT make all answers the same letter!
3. Each option should start with its letter like "A) answer text"
4. Difficulty Level: {difficulty}. {difficulty_prompt}
5. No markdown, ONLY valid JSON array
{variance_instruction}

Text:
{sanitized}"""

    result = await call_ai_with_fallback(prompt)
    cleaned = extract_json(result)
    
    try:
        import json
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            raise ValueError("Not an array")
        return {"quizzes": parsed}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate quizzes")

@app.post("/generate-mindmap")
async def generate_mindmap(
    request: MindmapRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate mindmap structure from content."""
    sanitized = sanitize_input(request.context, 5000)
    
    prompt = f"""Create a simple mind map as JSON.
Format: {{"title": "Main Topic", "children": [{{"title": "Subtopic 1"}}, {{"title": "Subtopic 2"}}]}}
Max 2 levels deep. No markdown, ONLY valid JSON.

Text:
{sanitized}"""

    result = await call_ai_with_fallback(prompt)
    cleaned = extract_json(result)
    
    try:
        import json
        parsed = json.loads(cleaned)
        return {"mindmap": parsed}
    except Exception:
        return {"mindmap": {"title": "Study Content", "children": [{"title": "Topic 1"}, {"title": "Topic 2"}]}}

@app.post("/generate-videos")
async def generate_videos(
    request: VideosRequest,
    user: dict = Depends(verify_jwt)
) -> VideosResponse:
    """Search for educational YouTube videos."""
    # Delegate to video service
    return await video_service.search_youtube_videos(request.topic, request.page_token)

@app.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Chat with AI about study content."""
    sanitized_context = sanitize_input(request.context)
    sanitized_query = sanitize_input(request.query, 1000)
    
    prompt = f"""You are Cherág, an AI study assistant. You help students understand their study materials. Be helpful, clear, and educational.

Based on this context, answer the question.

Context:
{sanitized_context or 'No context provided'}

Question: {sanitized_query}"""

    result = await call_ai_with_fallback(prompt)
    return {"response": result}

@app.post("/generate-roadmap")
async def generate_roadmap(
    request: RoadmapRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate a learning roadmap from content."""
    sanitized = sanitize_input(request.context, 3000)
    
    prompt = f"""Create a learning roadmap from this content as JSON.

CONTENT:
{sanitized}

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

    result = await call_ai_with_fallback(prompt)
    cleaned = extract_json(result)
    
    try:
        import json
        parsed = json.loads(cleaned)
        return {"roadmap": parsed}
    except Exception:
        # Fallback structure
        return {"roadmap": {
            "id": "main",
            "title": "Study Roadmap",
            "type": "main",
            "description": "Your learning path",
            "children": [
                {"id": "t1", "title": "Topic 1", "type": "topic", "description": "First concept", "children": []},
                {"id": "t2", "title": "Topic 2", "type": "topic", "description": "Second concept", "children": []}
            ]
        }}

@app.post("/get-node-explanation")
async def get_node_explanation(
    request: NodeExplanationRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Explain a specific node in the roadmap."""
    sanitized_title = sanitize_input(request.title, 200)
    sanitized_desc = sanitize_input(request.description, 500)
    
    prompt = f"""Explain "{sanitized_title}" for a student learning this topic.

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

    result = await call_ai_with_fallback(prompt)
    return {"explanation": result}

# =============================================================================
# RAG Endpoints
# =============================================================================

@app.post("/process-document", status_code=202)
async def process_document(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Start background document processing."""
    # Delegate to RAG service logic
    # We need to do the ownership check here efficiently.
    # rag_service doesn't expose a "check_ownership" function yet, 
    # but process_document in main.py did it using supabase_admin.
    # We can add a check logic here directly using rag_service.supabase_admin 
    # OR better, stick to the pattern that process_document endpoint logic resides here 
    # but calls low level functions.
    
    if not rag_service.supabase_admin:
         raise HTTPException(status_code=503, detail="Database not configured")

    try:
        result = rag_service.supabase_admin.table('documents').select('user_id').eq('id', request.file_id).single().execute()
        if not result.data or result.data.get('user_id') != user.get('sub'):
            raise HTTPException(status_code=403, detail="Document access denied")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")
        
    background_tasks.add_task(rag_service.process_document_background, request.file_id, request.file_url)
    
    return {
        "status": "accepted",
        "document_id": request.file_id,
        "message": "Document processing started"
    }

@app.get("/document-status/{document_id}")
async def get_document_status(
    document_id: str,
    user: dict = Depends(verify_jwt)
) -> DocumentStatusResponse:
    """Get the processing status of a document."""
    if not rag_service.supabase_admin:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        result = rag_service.supabase_admin.table('documents').select(
            'processing_status, processing_progress, error_message, user_id'
        ).eq('id', document_id).single().execute()
        
        if not result.data:
             raise HTTPException(status_code=404, detail="Document not found")
        
        if result.data.get('user_id') != user.get('sub'):
             raise HTTPException(status_code=403, detail="Document access denied")
        
        # Count chunks
        chunks_result = rag_service.supabase_admin.table('document_chunks').select('id', count='exact').eq('document_id', document_id).execute()
        chunks_count = chunks_result.count if chunks_result.count else 0
        
        return DocumentStatusResponse(
            status=result.data.get('processing_status', 'pending'),
            progress=result.data.get('processing_progress', 0),
            chunks_count=chunks_count,
            error=result.data.get('error_message')
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rag-chat")
async def rag_chat(
    request: RAGChatRequest,
    user: dict = Depends(verify_jwt)
) -> StreamingResponse:
    """Chat with AI using RAG."""
    sanitized_query = sanitize_input(request.query, 1000)
    
    # Search for relevant chunks
    chunks = await rag_service.search_similar_chunks(request.document_id, sanitized_query, limit=5)
    
    if not chunks:
        async def fallback_stream():
            yield "I couldn't find relevant content in the document. Please make sure the document has finished processing."
        return StreamingResponse(fallback_stream(), media_type="text/plain")
    
    # Build context
    context = "\n\n---\n\n".join(chunks)
    
    prompt = f"""You are Cherág, an AI study assistant. Answer the student's question based ONLY on the following document excerpts.

DOCUMENT EXCERPTS:
{context}

STUDENT QUESTION: {sanitized_query}

Provide a helpful, accurate answer. If the excerpts don't contain enough information, say so."""

    # Get AI response and stream it
    async def stream_response():
        result = await call_ai_with_fallback(prompt)
        words = result.split(' ')
        for i in range(0, len(words), 5):
            chunk = ' '.join(words[i:i+5]) + ' '
            yield chunk
            import asyncio
            await asyncio.sleep(0.05)
    
    return StreamingResponse(stream_response(), media_type="text/plain")

# =============================================================================
# Premium Feature Endpoints
# =============================================================================

@app.post("/premium/exam/analyze-syllabus")
async def api_analyze_syllabus(request: SyllabusAnalysisRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.analyze_syllabus(request.syllabus_text)

@app.post("/premium/analytics/daily-plan")
async def api_daily_plan(request: DailyPlanRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.generate_daily_plan(request.goals, request.available_minutes, request.learning_dna, request.current_progress, request.current_hour)

@app.post("/premium/radar/analyze")
async def api_analyze_radar(request: RadarAnalysisRequest, user: dict = Depends(verify_jwt)):
    try:
        logger.info(f"Analyzing content for user {user.get('sub')}")
        return await premium_service.analyze_knowledge_radar(request.content, request.user_mastery)
    except Exception as e:
        logger.error(f"Radar Analysis Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/premium/radar/micro-lesson")
async def api_micro_lesson(request: MicroLessonRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.generate_micro_lesson(request.concept, request.context, request.previous_questions)

@app.post("/premium/video/extract-clips")
async def api_extract_clips(request: VideoExtractionRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.extract_video_clips(request.video_id, request.video_title)

@app.post("/premium/teaching/chat")
async def api_teaching_chat(request: TeachingChatRequest, user: dict = Depends(verify_jwt)):
    response_text = await premium_service.generate_teaching_chat(request.history, request.concept, request.difficulty, request.context)
    return {"response": response_text}

@app.post("/premium/teaching/evaluate")
async def api_teaching_eval(request: TeachingEvaluationRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.evaluate_teaching_session(request.concept, request.history)

@app.post("/premium/exam/readiness")
async def api_exam_readiness(request: ExamReadinessRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.calculate_exam_readiness(request.syllabus, request.user_mastery)

@app.post("/premium/exam/questions")
async def api_exam_questions(request: ExamQuestionsRequest, user: dict = Depends(verify_jwt)):
    return {"questions": await premium_service.generate_exam_questions(request.topics, request.count, request.difficulty)}

@app.post("/premium/exam/stress-test")
async def api_stress_test(request: StressTestRequest, user: dict = Depends(verify_jwt)):
    return {"questions": await premium_service.generate_stress_test(request.concept, request.current_level, request.failed_level)}

@app.post("/premium/analytics/dna")
async def api_learning_dna(request: LearningDNARequest, user: dict = Depends(verify_jwt)):
    return await premium_service.analyze_learning_dna(request.activity_data)

@app.post("/premium/analytics/cognitive-load")
async def api_cognitive_load(request: CognitiveLoadRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.assess_cognitive_load(request.metrics)

@app.post("/premium/tools/compress")
async def api_compress(request: CompressConceptRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.compress_concept(request.content, request.concept_name)

@app.post("/premium/tools/remix")
async def api_remix(request: RemixConceptsRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.remix_concepts(request.concepts)

@app.post("/premium/tools/mental-model")
async def api_mental_model(request: MentalModelRequest, user: dict = Depends(verify_jwt)):
    return await premium_service.analyze_mental_model(request.content, request.model)

if __name__ == "__main__":
    import uvicorn
    import os
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
