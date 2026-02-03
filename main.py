"""
Cherág AI Study Partner - FastAPI Backend
Secure backend for AI orchestration with multi-model fallback
"""

import os
import re
import html
import httpx
from typing import Optional, List, Any
from functools import wraps

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# =============================================================================
# Configuration
# =============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")

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

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
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
    """Call Gemini API with model fallback."""
    if not GEMINI_API_KEY:
        return None
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in GEMINI_MODELS:
            try:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": GEMINI_API_KEY},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}]
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
                    if text:
                        return text
                
                # Rate limit - try next model
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
    """Call OpenRouter API."""
    if not OPENROUTER_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
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
    except Exception:
        pass
    
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

# =============================================================================
# Run Server
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
