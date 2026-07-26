
import re
import json
import random
import httpx
import logging
import time
from typing import Optional, List, AsyncGenerator, Any
from contextlib import asynccontextmanager
from fastapi import HTTPException
from config import (
    GEMINI_KEYS, GEMINI_MODELS,
    OPENROUTER_KEYS, OPENROUTER_MODEL,
    DEEPSEEK_API_KEY, FRONTEND_ORIGIN,
    GROQ_KEYS, GROQ_DEFAULT_MODEL,
    HUGGINGFACE_API_KEY,
    logger
)
from services.prompts import get_deepseek_system_prompt

# Shared HTTP Client
http_client: Optional[httpx.AsyncClient] = None

# Timeout for fallback attempts (shorter to avoid latency trap)
FALLBACK_TIMEOUT = 10.0  # seconds

async def init_http_client():
    """Initialize shared HTTP client."""
    global http_client
    http_client = httpx.AsyncClient(timeout=60.0)

async def close_http_client():
    """Close shared HTTP client."""
    global http_client
    if http_client:
        await http_client.aclose()
        http_client = None

@asynccontextmanager
async def get_client(timeout: float = 60.0):
    """Get shared client or create temporary one as async context manager.
    
    Args:
        timeout: Request timeout in seconds. Use FALLBACK_TIMEOUT for faster failover.
    """
    if http_client:
        yield http_client
    else:
        client = httpx.AsyncClient(timeout=timeout)
        try:
            yield client
        finally:
            await client.aclose()

# =============================================================================
# Utility Functions
# =============================================================================

def sanitize_input(text: str, max_length: int = 10000) -> str:
    """Sanitize user input by limiting length.
    
    Note: We do NOT strip HTML tags or code syntax here.
    LLMs are not vulnerable to XSS - that's a frontend rendering concern.
    Stripping <tags> would break prompts like "Explain the <div> syntax".
    """
    if not text or not isinstance(text, str):
        return ""
    
    # Only limit length and strip whitespace
    # Do NOT remove HTML/code syntax - this is a study assistant that discusses code
    return text[:max_length].strip()

def extract_json(text: str) -> str:
    """Robust JSON extraction from AI response."""
    try:
        # 1. Try finding markdown code blocks first (handles AI explanations before JSON)
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            return match.group(1).strip()
        
        # 2. Check if text is already clean JSON
        stripped = text.strip()
        if (stripped.startswith('{') and stripped.endswith('}')) or \
           (stripped.startswith('[') and stripped.endswith(']')):
            return stripped
        
        # 3. Fallback: find outermost brackets
        start_array = stripped.find('[')
        end_array = stripped.rfind(']')
        start_object = stripped.find('{')
        end_object = stripped.rfind('}')
        
        if start_array != -1 and (start_object == -1 or start_array < start_object):
            if end_array != -1 and end_array > start_array:
                return stripped[start_array:end_array + 1]
        elif start_object != -1:
            if end_object != -1 and end_object > start_object:
                return stripped[start_object:end_object + 1]
        
        return stripped
    except Exception:
        return text

# =============================================================================
# AI Provider Functions
# =============================================================================

async def call_gemini(prompt: str) -> Optional[str]:
    """Call Gemini API with model and key rotation fallback."""
    if not GEMINI_KEYS:
        return None
    
    try:
        async with get_client() as client:
            return await _execute_gemini_request(client, prompt)
    except Exception as e:
        logger.error(f"Gemini call failed: {e}", exc_info=True)
        return None

async def _execute_gemini_request(client: httpx.AsyncClient, prompt: str) -> Optional[str]:
    # Shuffle keys to prevent one bad key from blocking all requests
    shuffled_keys = GEMINI_KEYS.copy()
    random.shuffle(shuffled_keys)
    
    # Loop through models AND shuffled keys (with shorter timeout for fallbacks)
    for model in GEMINI_MODELS:
        for key in shuffled_keys:
            try:
                logger.info(f"Trying Gemini Model: {model}")
                start_t = time.time()
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
                        duration = time.time() - start_t
                        logger.info(f"Gemini Success: {model} in {duration:.2f}s")
                        return text
                
                # If rate limited (429), try next key/model
                if response.status_code == 429:
                    logger.warning(f"Gemini 429 Rate Limit: {model}")
                    continue
                else:
                    logger.warning(f"Gemini Error {response.status_code} for {model}: {response.text[:100]}")
                    
            except Exception as e:
                logger.error(f"Gemini Exception: {e}")
                continue
    return None


async def call_deepseek(prompt: str) -> Optional[str]:
    """Call DeepSeek API."""
    if not DEEPSEEK_API_KEY:
        return None
    
    try:
        async with get_client() as client:
            return await _execute_deepseek_request(client, prompt)
    except Exception as e:
        logger.error(f"DeepSeek call failed: {e}", exc_info=True)
        return None

async def _execute_deepseek_request(client: httpx.AsyncClient, prompt: str) -> Optional[str]:
    response = await client.post(
        "https://api.deepseek.com/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        },
        json={
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": get_deepseek_system_prompt()},
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
    return None

async def call_openrouter(prompt: str) -> Optional[str]:
    """Call OpenRouter API with key rotation."""
    if not OPENROUTER_KEYS:
        return None
    
    # Use the context manager with shorter timeout for faster failover
    try:
        async with get_client(FALLBACK_TIMEOUT) as client:
            return await _execute_openrouter_request(client, prompt)
    except Exception as e:
        logger.error(f"OpenRouter call failed: {e}", exc_info=True)
        return None

async def _execute_openrouter_request(client: httpx.AsyncClient, prompt: str) -> Optional[str]:
    # Shuffle keys to prevent one bad key from blocking all requests
    shuffled_keys = OPENROUTER_KEYS.copy()
    random.shuffle(shuffled_keys)
    
    for key in shuffled_keys:
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


async def call_groq(prompt: str, model: Optional[str] = None) -> Optional[str]:
    """Call Groq API with key rotation. Model defaults to GROQ_DEFAULT_MODEL."""
    if not GROQ_KEYS:
        return None

    groq_model = model or GROQ_DEFAULT_MODEL

    try:
        async with get_client(FALLBACK_TIMEOUT) as client:
            return await _execute_groq_request(client, prompt, groq_model)
    except Exception as e:
        logger.error(f"Groq call failed: {e}", exc_info=True)
        return None

async def _execute_groq_request(
    client: httpx.AsyncClient, prompt: str, model: str
) -> Optional[str]:
    shuffled_keys = GROQ_KEYS.copy()
    random.shuffle(shuffled_keys)

    for key in shuffled_keys:
        try:
            logger.info(f"Trying Groq model: {model}")
            start_t = time.time()
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 2000,
                    "temperature": 0.5,
                    "stream": False,
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content")
                if content:
                    duration = time.time() - start_t
                    logger.info(f"Groq Success: {model} in {duration:.2f}s")
                    return content

            if response.status_code == 429:
                logger.warning(f"Groq 429 Rate Limit: {model}")
                continue
            else:
                logger.warning(f"Groq Error {response.status_code} for {model}: {response.text[:100]}")

        except Exception as e:
            logger.error(f"Groq Exception: {e}")
            continue
    return None


async def call_huggingface(prompt: str) -> Optional[str]:
    """Call Hugging Face Serverless API."""
    if not HUGGINGFACE_API_KEY:
        return None
    
    # We use a default fast model for inference fallback
    model = "meta-llama/Llama-3.2-3B-Instruct"
    api_url = f"https://api-inference.huggingface.co/models/{model}/v1/chat/completions"
    
    try:
        async with get_client() as client:
            response = await client.post(
                api_url,
                headers={
                    "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1500
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content")
                if content:
                    return content
    except Exception as e:
        logger.error(f"Hugging Face call failed: {e}")
    
    return None


async def call_ai_with_fallback(prompt: str, preferred_provider: Optional[str] = None) -> str:
    """Call AI with multi-model fallback: Gemini -> DeepSeek -> Groq -> HuggingFace -> OpenRouter.
    
    Args:
        prompt: The prompt text.
        preferred_provider: One of 'gemini', 'deepseek', 'groq', 'openrouter', 'huggingface',
                            or a specific Groq model ID (e.g. 'llama-3.3-70b-versatile').
                            If None/'auto', uses the default cascade.
    """
    sanitized_prompt = sanitize_input(prompt, 15000)
    if not sanitized_prompt:
        raise HTTPException(status_code=400, detail="Invalid input provided")

    # --- Explicit model preference ---
    if preferred_provider and preferred_provider not in ("auto", "gemini", "deepseek", "openrouter", "huggingface"):
        # Treat as a specific Groq model ID
        result = await call_groq(sanitized_prompt, model=preferred_provider)
        if result:
            return result
        # Fall through to default cascade on failure
        logger.warning(f"Preferred Groq model '{preferred_provider}' failed, falling back to cascade")

    elif preferred_provider == "deepseek":
        result = await call_deepseek(sanitized_prompt)
        if result:
            return result
        logger.warning("Preferred DeepSeek failed, falling back to cascade")

    elif preferred_provider == "groq":
        result = await call_groq(sanitized_prompt)
        if result:
            return result
        logger.warning("Preferred Groq failed, falling back to cascade")

    elif preferred_provider == "openrouter":
        result = await call_openrouter(sanitized_prompt)
        if result:
            return result
        logger.warning("Preferred OpenRouter failed, falling back to cascade")

    elif preferred_provider == "huggingface":
        result = await call_huggingface(sanitized_prompt)
        if result:
            return result
        logger.warning("Preferred HuggingFace failed, falling back to cascade")

    # --- Default cascade ---
    # 1. Try Gemini first (primary)
    result = await call_gemini(sanitized_prompt)
    if result:
        return result
    
    # 2. Try DeepSeek (fallback)
    result = await call_deepseek(sanitized_prompt)
    if result:
        return result
    
    # 3. Try Groq (fallback)
    result = await call_groq(sanitized_prompt)
    if result:
        return result

    # 4. Try Hugging Face (tertiary fallback)
    result = await call_huggingface(sanitized_prompt)
    if result:
        return result

    # 5. Try OpenRouter (final fallback)
    result = await call_openrouter(sanitized_prompt)
    if result:
        return result
    
    raise HTTPException(status_code=503, detail="All AI providers unavailable")


# =============================================================================
# Streaming Functions (Real-time response)
# =============================================================================

async def stream_gemini(prompt: str) -> AsyncGenerator[str, None]:
    """Stream response from Gemini API using SSE."""
    if not GEMINI_KEYS:
        return
    
    shuffled_keys = GEMINI_KEYS.copy()
    random.shuffle(shuffled_keys)
    
    # Use the first available model for streaming
    model = GEMINI_MODELS[0] if GEMINI_MODELS else "gemini-2.0-flash-lite"
    
    for key in shuffled_keys:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent",
                    params={"key": key, "alt": "sse"},
                    json={"contents": [{"parts": [{"text": prompt}]}]}
                ) as response:
                    if response.status_code != 200:
                        continue
                    
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        
                        try:
                            data = json.loads(line[6:])  # Remove "data: " prefix
                            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if text:
                                yield text
                        except json.JSONDecodeError:
                            continue
                    
                    # If we got here, streaming succeeded
                    return
                    
        except Exception as e:
            logger.warning(f"Gemini streaming failed: {e}")
            continue


async def stream_deepseek(prompt: str) -> AsyncGenerator[str, None]:
    """Stream response from DeepSeek API."""
    if not DEEPSEEK_API_KEY:
        return
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": get_deepseek_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.5,
                    "stream": True
                }
            ) as response:
                if response.status_code != 200:
                    return
                
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    
                    data_str = line[6:]  # Remove "data: " prefix
                    if data_str == "[DONE]":
                        break
                    
                    try:
                        data = json.loads(data_str)
                        delta = data.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
                        
    except Exception as e:
        logger.warning(f"DeepSeek streaming failed: {e}")


async def stream_groq(prompt: str, model: Optional[str] = None) -> AsyncGenerator[str, None]:
    """Stream response from Groq API."""
    if not GROQ_KEYS:
        return

    groq_model = model or GROQ_DEFAULT_MODEL
    shuffled_keys = GROQ_KEYS.copy()
    random.shuffle(shuffled_keys)

    for key in shuffled_keys:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": groq_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 2000,
                        "temperature": 0.5,
                        "stream": True,
                    },
                ) as response:
                    if response.status_code != 200:
                        continue

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue

                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str == "[DONE]":
                            return

                        try:
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

                    return  # Success
        except Exception as e:
            logger.warning(f"Groq streaming failed: {e}")
            continue


async def stream_ai_with_fallback(
    prompt: str, preferred_provider: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """Stream AI response with fallback: Gemini -> Groq -> DeepSeek.

    Yields chunks as they arrive from the AI provider.
    Falls back to next provider if streaming fails.

    Args:
        prompt: The prompt text.
        preferred_provider: A specific Groq model ID or 'groq'/'gemini'/'deepseek'.
                            If None/'auto', uses the default streaming cascade.
    """
    sanitized_prompt = sanitize_input(prompt, 15000)
    if not sanitized_prompt:
        yield "Error: Invalid input provided"
        return

    got_content = False

    # --- Explicit Groq model preference ---
    if preferred_provider and preferred_provider not in ("auto", "gemini", "deepseek", "openrouter"):
        try:
            async for chunk in stream_groq(sanitized_prompt, model=preferred_provider):
                got_content = True
                yield chunk
            if got_content:
                return
        except Exception as e:
            logger.warning(f"Groq preferred stream fallback triggered: {e}")

    elif preferred_provider == "groq":
        try:
            async for chunk in stream_groq(sanitized_prompt):
                got_content = True
                yield chunk
            if got_content:
                return
        except Exception as e:
            logger.warning(f"Groq stream fallback triggered: {e}")

    # 1. Try Gemini streaming first
    try:
        async for chunk in stream_gemini(sanitized_prompt):
            got_content = True
            yield chunk

        if got_content:
            return
    except Exception as e:
        logger.warning(f"Gemini stream fallback triggered: {e}")

    # 2. Try Groq streaming (fast fallback)
    try:
        async for chunk in stream_groq(sanitized_prompt):
            got_content = True
            yield chunk

        if got_content:
            return
    except Exception as e:
        logger.warning(f"Groq stream fallback triggered: {e}")

    # 3. Fall back to DeepSeek streaming
    try:
        async for chunk in stream_deepseek(sanitized_prompt):
            got_content = True
            yield chunk

        if got_content:
            return
    except Exception as e:
        logger.warning(f"DeepSeek stream fallback triggered: {e}")
    
    # 3. Final fallback: non-streaming call
    if not got_content:
        try:
            result = await call_ai_with_fallback(sanitized_prompt)
            yield result
        except Exception:
            yield "I'm having trouble generating a response. Please try again."


# =============================================================================
# Structured Data Helper
# =============================================================================

async def generate_structured_data(prompt: str, fallback: Any) -> Any:
    """Call AI, extract JSON, parse it, return fallback on failure.
    
    This centralizes the common pattern of:
    1. Call AI
    2. Extract JSON from response
    3. Parse JSON
    4. Return fallback if parsing fails
    
    Args:
        prompt: The prompt to send to the AI
        fallback: Value to return if AI call or JSON parsing fails
        
    Returns:
        Parsed JSON data or fallback value
    """
    try:
        result = await call_ai_with_fallback(prompt)
        cleaned = extract_json(result)
        parsed = json.loads(cleaned)
        return parsed
    except Exception as e:
        logger.warning(f"generate_structured_data failed: {e}")
        return fallback

