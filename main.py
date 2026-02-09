
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Config & Auth
from config import (
    logger, FRONTEND_ORIGIN, PREVIEW_DEPLOYMENT_ORIGINS, PREVIEW_DEPLOYMENT_REGEX,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
)
from auth import verify_jwt

# Schemas
from schemas import (
    SummaryRequest, FlashcardsRequest, QuizzesRequest, MindmapRequest,
    VideosRequest, ChatRequest, RoadmapRequest, NodeExplanationRequest,
    VideoResult, VideosResponse,
    ProcessDocumentRequest, DocumentStatusResponse, RAGChatRequest,
    SyllabusAnalysisRequest, DailyPlanRequest, RadarAnalysisRequest,
    MicroLessonRequest, VideoExtractionRequest, TeachingChatRequest,
    TeachingEvaluationRequest, ExamReadinessRequest, ExamQuestionsRequest,
    StressTestRequest, LearningDNARequest, CognitiveLoadRequest,
    CompressConceptRequest, RemixConceptsRequest, MentalModelRequest
)

# Services
import services.ai_utils as ai_utils
from services.ai_utils import (
    call_ai_with_fallback, sanitize_input, extract_json,
    stream_ai_with_fallback, generate_structured_data
)
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

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=PREVIEW_DEPLOYMENT_ORIGINS,
    allow_origin_regex=PREVIEW_DEPLOYMENT_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    from services.prompts import get_summary_prompt
    
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
    
    prompt = get_summary_prompt(length_instruction, style_instruction, focus_instruction, sanitized)
    result = await call_ai_with_fallback(prompt)
    return {"summary": result}

@app.post("/generate-flashcards")
async def generate_flashcards(
    request: FlashcardsRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate flashcards from content."""
    from services.prompts import get_flashcards_prompt
    
    sanitized = sanitize_input(request.context)
    prompt = get_flashcards_prompt(sanitized)
    
    fallback = [{"question": "What are the main topics?", "answer": sanitized[:200] + "..."}]
    parsed = await generate_structured_data(prompt, fallback)
    
    # Ensure we have a list
    if not isinstance(parsed, list):
        parsed = fallback
    
    return {"flashcards": parsed}

@app.post("/generate-quizzes")
async def generate_quizzes(
    request: QuizzesRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate quiz questions from content."""
    from services.prompts import get_quizzes_prompt, get_difficulty_prompt
    import time
    
    sanitized = sanitize_input(request.context)
    count = request.count or 5
    difficulty = request.difficulty or "medium"
    
    difficulty_prompt = get_difficulty_prompt(difficulty)
    
    variance_instruction = ""
    if request.force_refresh:
        seed = int(time.time())
        variance_instruction = f"Ensure questions are COMPLETELY different. Random seed: {seed}."
    
    prompt = get_quizzes_prompt(count, difficulty, difficulty_prompt, variance_instruction, sanitized)
    
    # Use empty list as fallback - will trigger HTTPException below
    parsed = await generate_structured_data(prompt, None)
    
    if not isinstance(parsed, list) or not parsed:
        raise HTTPException(status_code=500, detail="Failed to generate quizzes")
    
    return {"quizzes": parsed}

@app.post("/generate-mindmap")
async def generate_mindmap(
    request: MindmapRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate mindmap structure from content."""
    from services.prompts import get_mindmap_prompt
    
    sanitized = sanitize_input(request.context, 5000)
    prompt = get_mindmap_prompt(sanitized)
    
    fallback = {"title": "Study Content", "children": [{"title": "Topic 1"}, {"title": "Topic 2"}]}
    parsed = await generate_structured_data(prompt, fallback)
    
    return {"mindmap": parsed}

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
    from services.prompts import get_chat_prompt
    
    sanitized_context = sanitize_input(request.context)
    sanitized_query = sanitize_input(request.query, 1000)
    
    prompt = get_chat_prompt(sanitized_context, sanitized_query)
    result = await call_ai_with_fallback(prompt)
    return {"response": result}

@app.post("/generate-roadmap")
async def generate_roadmap(
    request: RoadmapRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Generate a learning roadmap from content."""
    from services.prompts import get_roadmap_prompt
    
    sanitized = sanitize_input(request.context, 3000)
    prompt = get_roadmap_prompt(sanitized)
    
    fallback = {
        "id": "main",
        "title": "Study Roadmap",
        "type": "main",
        "description": "Your learning path",
        "children": [
            {"id": "t1", "title": "Topic 1", "type": "topic", "description": "First concept", "children": []},
            {"id": "t2", "title": "Topic 2", "type": "topic", "description": "Second concept", "children": []}
        ]
    }
    
    parsed = await generate_structured_data(prompt, fallback)
    return {"roadmap": parsed}

@app.post("/get-node-explanation")
async def get_node_explanation(
    request: NodeExplanationRequest,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Explain a specific node in the roadmap."""
    from services.prompts import get_node_explanation_prompt
    
    sanitized_title = sanitize_input(request.title, 200)
    sanitized_desc = sanitize_input(request.description, 500)
    
    prompt = get_node_explanation_prompt(sanitized_title, sanitized_desc)
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
    except Exception as e:
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
        logger.error(f"Error getting document status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/rag-chat")
async def rag_chat(
    request: RAGChatRequest,
    user: dict = Depends(verify_jwt)
) -> StreamingResponse:
    """Chat with AI using RAG with real streaming."""
    sanitized_query = sanitize_input(request.query, 1000)
    
    # Verify document ownership
    doc_result = rag_service.supabase_admin.table('documents').select('user_id').eq('id', str(request.document_id)).single().execute()
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc_result.data.get('user_id') != user.get('sub'):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Search for relevant chunks
    chunks = await rag_service.search_similar_chunks(request.document_id, sanitized_query, limit=5)
    
    if not chunks:
        async def fallback_stream():
            yield "I couldn't find relevant content in the document. Please make sure the document has finished processing."
        return StreamingResponse(fallback_stream(), media_type="text/plain")
    
    # Build context and prompt
    context = "\n\n---\n\n".join(chunks)
    
    # Import and use the prompt function
    from services.prompts import get_rag_chat_prompt
    prompt = get_rag_chat_prompt(context, sanitized_query)
    
    # Real streaming - yields chunks as they arrive from AI provider
    return StreamingResponse(stream_ai_with_fallback(prompt), media_type="text/plain")

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
        raise HTTPException(status_code=500, detail="Internal server error")

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
