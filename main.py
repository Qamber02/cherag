"""
Cherág AI Study Partner - FastAPI Backend
Secure backend for AI orchestration with multi-model fallback
Now with server-side RAG for 1000+ page PDF processing
"""

import os
import re
import io
import html
import json
import base64
import asyncio
import httpx
import fitz  # PyMuPDF
from typing import Optional, List, Any, AsyncGenerator
from functools import wraps

from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import jwt
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_text_splitters import RecursiveCharacterTextSplitter
from services.pdf_processor import pdf_processor, PDFProcessor

# Load environment variables
load_dotenv()

# =============================================================================
# Configuration
# =============================================================================

# Load all available keys
GEMINI_KEYS = [k for k in [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4"),
    os.getenv("GEMINI_API_KEY_5")
] if k]

OPENROUTER_KEYS = [k for k in [
    os.getenv("OPENROUTER_API_KEY"),
    os.getenv("OPENROUTER_API_KEY_2"),
    os.getenv("OPENROUTER_API_KEY_3"),
    os.getenv("OPENROUTER_API_KEY_4"),
    os.getenv("OPENROUTER_API_KEY_5")
] if k]

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase admin client for server-side operations
supabase_admin: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Frontend domain for CORS
FRONTEND_ORIGIN = "https://cherag.pages.dev"

# Gemini models ordered by priority
GEMINI_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
]

# OpenRouter model
OPENROUTER_MODEL = "allenai/molmo-2-8b:free"

# =============================================================================
# FastAPI App Setup
# =============================================================================

app = FastAPI(
    title="Cherág Study Engine",
    description="AI-powered study assistant backend",
    version="1.0.0"
)

# CORS Configuration - Allow all Cherag Pages subdomains (preview deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_ORIGIN,
        "https://dc61812a.cherag.pages.dev",  # Current preview deployment
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_origin_regex=r"https://.*\.cherag\.pages\.dev",  # Allow all preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# =============================================================================
# Request/Response Models
# =============================================================================

class SummaryRequest(BaseModel):
    context: str
    length: Optional[str] = "medium"  # short, medium, detailed
    style: Optional[str] = "mixed"    # bullet, paragraph, mixed
    focus: Optional[str] = None

class FlashcardsRequest(BaseModel):
    context: str

class QuizzesRequest(BaseModel):
    context: str
    count: Optional[int] = 5
    difficulty: Optional[str] = "medium"  # easy, medium, hard
    force_refresh: Optional[bool] = False

class MindmapRequest(BaseModel):
    context: str

class VideosRequest(BaseModel):
    topic: str
    page_token: Optional[str] = None

class ChatRequest(BaseModel):
    context: str
    query: str

class RoadmapRequest(BaseModel):
    context: str

class NodeExplanationRequest(BaseModel):
    title: str
    description: str

class Flashcard(BaseModel):
    question: str
    answer: str

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class VideoResult(BaseModel):
    id: str
    title: str
    thumbnail: str
    channel: Optional[str] = None
    relevance_score: Optional[float] = None
    duration: Optional[str] = None

class VideosResponse(BaseModel):
    result: List[VideoResult]
    next_page_token: Optional[str] = None

# RAG Document Processing Models
class ProcessDocumentRequest(BaseModel):
    file_id: str       # Document ID in Supabase
    file_url: str      # Signed URL to download from Storage

class DocumentStatusResponse(BaseModel):
    status: str        # 'pending', 'processing', 'completed', 'failed'
    progress: float    # 0-100 percentage
    chunks_count: int  # Number of chunks created
    error: Optional[str] = None

class RAGChatRequest(BaseModel):
    document_id: str   # Reference to document for vector search
    query: str

# =============================================================================
# JWT Authentication
# =============================================================================

async def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validate Supabase JWT token."""
    token = credentials.credentials
    
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="Server configuration error")
    
    try:
        # Decode and verify the JWT
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# =============================================================================
# Utility Functions
# =============================================================================

def sanitize_input(text: str, max_length: int = 10000) -> str:
    """Sanitize user input to prevent injection attacks."""
    if not text or not isinstance(text, str):
        return ""
    
    # Remove potential XSS and injection attempts
    sanitized = text
    sanitized = re.sub(r'<[^>]*>', '', sanitized)  # Remove HTML tags
    sanitized = re.sub(r'javascript\s*:', '', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'vbscript\s*:', '', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'data\s*:', '', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'on\w+\s*=', '', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'expression\s*\(', '', sanitized, flags=re.IGNORECASE)
    
    return sanitized[:max_length].strip()

def extract_json(text: str) -> str:
    """Extract JSON from AI response."""
    # Remove markdown code blocks
    cleaned = text.replace('```json', '').replace('```', '').strip()
    
    # Try to find array [...]
    start_array = cleaned.find('[')
    end_array = cleaned.rfind(']')
    
    # Try to find object {...}
    start_object = cleaned.find('{')
    end_object = cleaned.rfind('}')
    
    # Determine which outer structure appears first
    if start_array != -1 and (start_object == -1 or start_array < start_object):
        if end_array != -1 and end_array > start_array:
            return cleaned[start_array:end_array + 1]
    elif start_object != -1:
        if end_object != -1 and end_object > start_object:
            return cleaned[start_object:end_object + 1]
    
    return cleaned

def parse_iso8601_duration(duration: str) -> str:
    """Parse YouTube ISO 8601 duration (PT12M30S) to MM:SS format."""
    if not duration:
        return "0:00"
    
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
    if not match:
        return "0:00"
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    total_minutes = hours * 60 + minutes
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{total_minutes}:{seconds:02d}"

def decode_html_entities(text: str) -> str:
    """Decode HTML entities in text."""
    return html.unescape(text) if text else ""

# =============================================================================
# AI Provider Functions
# =============================================================================

async def call_gemini(prompt: str) -> Optional[str]:
    """Call Gemini API with model and key rotation fallback."""
    if not GEMINI_KEYS:
        return None
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Loop through models AND keys
        for model in GEMINI_MODELS:
            for key in GEMINI_KEYS:
                try:
                    # print(f"Trying Gemini {model} with key ending in ...{key[-4:]}")
                    response = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                        params={"key": key},
                        json={
                            "contents": [{"parts": [{"text": prompt}]}]
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
                        if text:
                            return text
                    
                    # If rate limited (429), try next key/model
                    if response.status_code == 429:
                        continue
                        
                except Exception:
                    continue
    
    return None

async def call_deepseek(prompt: str) -> Optional[str]:
    """Call DeepSeek API."""
    if not DEEPSEEK_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "You are a helpful study assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.5,
                    "stream": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content")
                if content:
                    return content
    except Exception:
        pass
    
    return None

async def call_openrouter(prompt: str) -> Optional[str]:
    """Call OpenRouter API with key rotation."""
    if not OPENROUTER_KEYS:
        return None
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for key in OPENROUTER_KEYS:
            try:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": FRONTEND_ORIGIN,
                        "X-Title": "Cherag Study Assistant"
                    },
                    json={
                        "model": OPENROUTER_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 2000,
                        "temperature": 0.5
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content")
                    if content:
                        return content
                
                # If rate limited (429), rotate key
                if response.status_code == 429:
                    continue
                    
            except Exception:
                continue
    
    return None

async def call_ai_with_fallback(prompt: str) -> str:
    """Call AI with multi-model fallback: Gemini -> DeepSeek -> OpenRouter."""
    sanitized_prompt = sanitize_input(prompt, 15000)
    if not sanitized_prompt:
        raise HTTPException(status_code=400, detail="Invalid input provided")
    
    # 1. Try Gemini first (primary)
    result = await call_gemini(sanitized_prompt)
    if result:
        return result
    
    # 2. Try DeepSeek (fallback)
    result = await call_deepseek(sanitized_prompt)
    if result:
        return result
    
    # 3. Try OpenRouter (final fallback)
    result = await call_openrouter(sanitized_prompt)
    if result:
        return result
    
    raise HTTPException(status_code=503, detail="All AI providers unavailable")

# =============================================================================
# API Endpoints
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
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=503, detail="YouTube API not configured")
    
    topic = request.topic
    search_topic = topic
    
    # Extract main topic using AI if content is long
    if len(topic) > 100:
        try:
            topic_prompt = f"""Extract the main educational topic from this content in 3-5 keywords for a YouTube search. Only output the keywords, nothing else.

Content: {topic[:1000]}

Keywords:"""
            extracted = await call_ai_with_fallback(topic_prompt)
            if extracted and 3 < len(extracted) < 100:
                search_topic = extracted.strip()
        except Exception:
            search_topic = topic[:50]
    
    # Clean search topic
    search_topic = re.sub(r'[^\w\s]', ' ', search_topic)
    search_topic = re.sub(r'\s+', ' ', search_topic).strip()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Search YouTube
        search_params = {
            "part": "snippet",
            "q": f"{search_topic} explained tutorial",
            "type": "video",
            "maxResults": "15",
            "videoDuration": "medium",
            "relevanceLanguage": "en",
            "safeSearch": "strict",
            "videoEmbeddable": "true",
            "key": YOUTUBE_API_KEY
        }
        if request.page_token:
            search_params["pageToken"] = request.page_token
        
        search_response = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params=search_params
        )
        
        if search_response.status_code != 200:
            raise HTTPException(status_code=503, detail="YouTube API error")
        
        search_data = search_response.json()
        items = search_data.get("items", [])
        video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
        
        # Get video details (duration)
        durations = {}
        if video_ids:
            details_response = await client.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "part": "contentDetails",
                    "id": ",".join(video_ids),
                    "key": YOUTUBE_API_KEY
                }
            )
            if details_response.status_code == 200:
                details_data = details_response.json()
                for item in details_data.get("items", []):
                    vid = item.get("id")
                    dur = item.get("contentDetails", {}).get("duration")
                    if vid and dur:
                        durations[vid] = parse_iso8601_duration(dur)
        
        # Build results
        topic_words = [w.lower() for w in search_topic.split() if len(w) > 2]
        videos = []
        
        for item in items:
            video_id = item.get("id", {}).get("videoId")
            if not video_id:
                continue
            
            snippet = item.get("snippet", {})
            title = decode_html_entities(snippet.get("title", ""))
            channel = snippet.get("channelTitle", "")
            
            # Calculate relevance
            relevance = calculate_relevance(title, channel, topic_words)
            
            # Filter clickbait
            if is_clickbait(title):
                continue
            
            if relevance < 0.35:
                continue
            
            videos.append(VideoResult(
                id=video_id,
                title=title,
                thumbnail=snippet.get("thumbnails", {}).get("high", {}).get("url") or 
                         snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
                channel=channel,
                relevance_score=round(relevance, 2),
                duration=durations.get(video_id)
            ))
        
        # Sort by relevance and limit
        videos.sort(key=lambda v: v.relevance_score or 0, reverse=True)
        videos = videos[:10]
        
        return VideosResponse(
            result=videos,
            next_page_token=search_data.get("nextPageToken")
        )

def calculate_relevance(title: str, channel: str, topic_words: List[str]) -> float:
    """Calculate relevance score based on topic match."""
    title_lower = title.lower()
    channel_lower = (channel or "").lower()
    matches = 0
    
    # Check topic word matches
    for word in topic_words:
        if word in title_lower:
            matches += 1
    
    # Boost for educational keywords
    edu_keywords = ['tutorial', 'explained', 'learn', 'course', 'lesson', 'guide', 
                   'how to', 'introduction', 'basics', 'beginner', 'complete', 
                   'crash course', 'fundamentals']
    for kw in edu_keywords:
        if kw in title_lower:
            matches += 0.5
    
    # Boost for educational channels
    edu_channel_keywords = ['academy', 'school', 'university', 'edu', 'learn', 
                           'course', 'tutor', 'class', 'professor', 'khan', 'codecademy']
    for kw in edu_channel_keywords:
        if kw in channel_lower:
            matches += 0.3
            break
    
    # Penalty for entertainment
    entertainment_keywords = ['funny', 'crazy', 'insane', 'epic', 'amazing', 'incredible']
    for kw in entertainment_keywords:
        if kw in title_lower:
            matches -= 0.2
    
    return max(0, matches / len(topic_words)) if topic_words else 0.5

def is_clickbait(title: str) -> bool:
    """Check if title suggests clickbait/entertainment content."""
    title_lower = title.lower()
    negative_patterns = [
        'challenge', 'prank', 'vlog', 'reaction', 'mukbang', 'asmr',
        'gameplay', 'gaming', 'live stream', 'giveaway', 'unboxing',
        "you won't believe", 'shocking', 'gone wrong', 'try not to',
        'tiktok', 'shorts compilation', 'memes', 'roast', 'drama',
        'exposed', 'cancelled', 'dating', 'relationship', 'gossip'
    ]
    return any(pattern in title_lower for pattern in negative_patterns)

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
# RAG Document Processing
# =============================================================================

# Text splitter for chunking (1000 chars, 100 overlap)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""]
)

async def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding using Gemini text-embedding-004."""
    if not GEMINI_KEYS:
        return None
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for key in GEMINI_KEYS:
            try:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
                    params={"key": key},
                    json={
                        "model": "models/text-embedding-004",
                        "content": {"parts": [{"text": text[:2000]}]}  # Limit text length
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("embedding", {}).get("values")
            except Exception:
                continue
    return None

async def ocr_with_gemini(page_image_bytes: bytes) -> str:
    """Use Gemini-2.5-Flash for OCR on image-based pages."""
    if not GEMINI_KEYS:
        return ""
    
    base64_image = base64.b64encode(page_image_bytes).decode('utf-8')
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for key in GEMINI_KEYS:
            try:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
                    params={"key": key},
                    json={
                        "contents": [{
                            "parts": [
                                {"text": "Extract all text from this image. Return only the extracted text, nothing else."},
                                {"inline_data": {"mime_type": "image/png", "data": base64_image}}
                            ]
                        }]
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            except Exception:
                continue
    return ""

async def embed_and_store_chunks(document_id: str, chunks: List[str], chunk_offset: int) -> int:
    """Generate embeddings and store chunks in Supabase."""
    if not supabase_admin or not chunks:
        return 0
    
    stored_count = 0
    for i, chunk_text in enumerate(chunks):
        if not chunk_text.strip():
            continue
        
        embedding = await generate_embedding(chunk_text)
        if embedding:
            try:
                supabase_admin.table('document_chunks').insert({
                    'document_id': document_id,
                    'content': chunk_text,
                    'embedding': embedding,
                    'chunk_index': chunk_offset + i
                }).execute()
                stored_count += 1
            except Exception as e:
                print(f"[RAG] Failed to store chunk: {e}")
    
    return stored_count

async def update_document_status(document_id: str, status: str, progress: float = 0, error: str = None):
    """Update document processing status in Supabase."""
    if not supabase_admin:
        return
    
    try:
        update_data = {'processing_status': status, 'processing_progress': progress}
        if error:
            update_data['error_message'] = error
        supabase_admin.table('documents').update(update_data).eq('id', document_id).execute()
    except Exception as e:
        print(f"[RAG] Failed to update status: {e}")

async def process_document_background(document_id: str, file_url: str):
    """Background task: Extract text from PDF using slide-aware processor, chunk, embed, and store."""
    try:
        await update_document_status(document_id, 'processing', 0)
        
        # Download file from Supabase Storage
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.get(file_url)
            if response.status_code != 200:
                raise Exception(f"Failed to download file: {response.status_code}")
            pdf_bytes = response.content
        
        # Process PDF using slide-aware processor (handles low-text slides, removes artifacts)
        pages = pdf_processor.process_pdf_bytes(pdf_bytes)
        total_pages = len(pages)
        
        if total_pages == 0:
            raise Exception("PDF has no pages or could not be read")
        
        pending_chunks = []
        chunk_offset = 0
        total_chunks_stored = 0
        
        for i, page_data in enumerate(pages):
            page_num = page_data['page']
            page_text = page_data['text']
            page_type = page_data['type']
            
            # For visual slides with minimal text, try Gemini OCR
            if page_type == 'visual' and page_data['char_count'] < 20:
                try:
                    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                    page = doc[page_num - 1]  # 0-indexed
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    image_bytes = pix.tobytes("png")
                    doc.close()
                    
                    ocr_text = await ocr_with_gemini(image_bytes)
                    if ocr_text and len(ocr_text.strip()) > 50:
                        page_text = pdf_processor.clean_text(ocr_text)
                except Exception as ocr_err:
                    print(f"[RAG] OCR fallback failed for page {page_num}: {ocr_err}")
            
            # Chunk the text (including placeholders for visual slides)
            if page_text.strip():
                chunks = text_splitter.split_text(page_text)
                pending_chunks.extend(chunks)
            
            # Persist every 5 pages to keep memory low
            if (i + 1) % 5 == 0 and pending_chunks:
                stored = await embed_and_store_chunks(document_id, pending_chunks, chunk_offset)
                chunk_offset += len(pending_chunks)
                total_chunks_stored += stored
                pending_chunks = []
                
                # Update progress
                progress = ((i + 1) / total_pages) * 100
                await update_document_status(document_id, 'processing', progress)
        
        # Final batch
        if pending_chunks:
            stored = await embed_and_store_chunks(document_id, pending_chunks, chunk_offset)
            total_chunks_stored += stored
        
        # Mark as completed
        await update_document_status(document_id, 'completed', 100)
        
        # Log stats
        stats = pdf_processor.get_stats(pages)
        print(f"[RAG] Document {document_id} processed: {total_chunks_stored} chunks stored")
        print(f"[RAG] Stats: {stats['text_pages']} text, {stats['slide_pages']} slide, {stats['visual_pages']} visual pages")
        
    except Exception as e:
        error_msg = str(e)[:500]
        print(f"[RAG] Processing failed for {document_id}: {error_msg}")
        await update_document_status(document_id, 'failed', 0, error_msg)

async def search_similar_chunks(document_id: str, query: str, limit: int = 5) -> List[str]:
    """Search for similar chunks using vector similarity."""
    if not supabase_admin:
        return []
    
    # Generate embedding for query
    query_embedding = await generate_embedding(query)
    if not query_embedding:
        return []
    
    try:
        # Call the RPC function for similarity search
        result = supabase_admin.rpc('search_similar_chunks', {
            'query_embedding': query_embedding,
            'doc_id': document_id,
            'match_count': limit
        }).execute()
        
        if result.data:
            return [chunk['content'] for chunk in result.data]
    except Exception as e:
        print(f"[RAG] Similarity search failed: {e}")
        # Fallback: get latest chunks without vector search
        try:
            fallback = supabase_admin.table('document_chunks').select('content').eq('document_id', document_id).limit(limit).execute()
            if fallback.data:
                return [chunk['content'] for chunk in fallback.data]
        except Exception:
            pass
    
    return []

# =============================================================================
# RAG Endpoints
# =============================================================================

@app.post("/process-document", status_code=202)
async def process_document(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_jwt)
) -> dict:
    """Start background document processing. Returns 202 Accepted immediately."""
    if not supabase_admin:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    # Verify document ownership
    try:
        result = supabase_admin.table('documents').select('user_id').eq('id', request.file_id).single().execute()
        if not result.data or result.data.get('user_id') != user.get('sub'):
            raise HTTPException(status_code=403, detail="Document access denied")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Queue background processing
    background_tasks.add_task(process_document_background, request.file_id, request.file_url)
    
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
    if not supabase_admin:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        result = supabase_admin.table('documents').select(
            'processing_status, processing_progress, error_message, user_id'
        ).eq('id', document_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if result.data.get('user_id') != user.get('sub'):
            raise HTTPException(status_code=403, detail="Document access denied")
        
        # Count chunks
        chunks_result = supabase_admin.table('document_chunks').select('id', count='exact').eq('document_id', document_id).execute()
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
    """Chat with AI using RAG - retrieves relevant chunks and streams response."""
    sanitized_query = sanitize_input(request.query, 1000)
    
    # Search for relevant chunks
    chunks = await search_similar_chunks(request.document_id, sanitized_query, limit=5)
    
    if not chunks:
        # Fallback to regular chat if no chunks found
        async def fallback_stream():
            yield "I couldn't find relevant content in the document. Please make sure the document has finished processing."
        return StreamingResponse(fallback_stream(), media_type="text/plain")
    
    # Build context from chunks
    context = "\n\n---\n\n".join(chunks)
    
    prompt = f"""You are Cherág, an AI study assistant. Answer the student's question based ONLY on the following document excerpts.

DOCUMENT EXCERPTS:
{context}

STUDENT QUESTION: {sanitized_query}

Provide a helpful, accurate answer. If the excerpts don't contain enough information, say so."""

    # Get AI response and stream it
    async def stream_response():
        result = await call_ai_with_fallback(prompt)
        # Simulate streaming by yielding chunks
        words = result.split(' ')
        for i in range(0, len(words), 5):
            chunk = ' '.join(words[i:i+5]) + ' '
            yield chunk
            await asyncio.sleep(0.05)
    
    return StreamingResponse(stream_response(), media_type="text/plain")

# =============================================================================
# Run Server
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

