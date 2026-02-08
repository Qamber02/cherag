
import os
import re
import httpx
import logging
from typing import Optional, List
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

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
