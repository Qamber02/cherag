
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# =============================================================================
# Logging Configuration
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# =============================================================================
# API Keys & Secrets
# =============================================================================

# Gemini Keys (Rotation)
GEMINI_KEYS = [k.strip() for k in [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4"),
    os.getenv("GEMINI_API_KEY_5")
] if k and isinstance(k, str) and k.strip()]

# OpenRouter Keys (Rotation)
OPENROUTER_KEYS = [k.strip() for k in [
    os.getenv("OPENROUTER_API_KEY"),
    os.getenv("OPENROUTER_API_KEY_2"),
    os.getenv("OPENROUTER_API_KEY_3"),
    os.getenv("OPENROUTER_API_KEY_4"),
    os.getenv("OPENROUTER_API_KEY_5")
] if k and isinstance(k, str) and k.strip()]

# Groq Keys (Rotation) — optional, but enables Groq model access
GROQ_KEYS = [k.strip() for k in [
    os.getenv("GROQ_API_KEY"),
    os.getenv("GROQ_API_KEY_2"),
    os.getenv("GROQ_API_KEY_3"),
    os.getenv("GROQ_API_KEY_4"),
    os.getenv("GROQ_API_KEY_5")
] if k and isinstance(k, str) and k.strip()]

# Validate required API keys at startup
if not GEMINI_KEYS:
    raise RuntimeError(
        "GEMINI_KEYS is empty. Set at least GEMINI_API_KEY environment variable. "
        "Get a key from https://aistudio.google.com/apikey"
    )

if not OPENROUTER_KEYS:
    raise RuntimeError(
        "OPENROUTER_KEYS is empty. Set at least OPENROUTER_API_KEY environment variable. "
        "Get a key from https://openrouter.ai/keys"
    )

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY").strip() if os.getenv("DEEPSEEK_API_KEY") else None
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY").strip() if os.getenv("YOUTUBE_API_KEY") else None
_hf_key = os.getenv("VITE_HUGGINGFACE_API_KEY") or os.getenv("HUGGINGFACE_API_KEY")
HUGGINGFACE_API_KEY = _hf_key.strip() if _hf_key else None

# Supabase
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# =============================================================================
# App Configuration
# =============================================================================

# Frontend domain for CORS
FRONTEND_ORIGIN = "https://cherag.pages.dev"
PREVIEW_DEPLOYMENT_ORIGINS = [
    FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://localhost:3000"
]
PREVIEW_DEPLOYMENT_REGEX = r"^https://.*\.cherag\.pages\.dev$"

# Models
GEMINI_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
]
OPENROUTER_MODEL = "allenai/molmo-2-8b:free"

# Groq model catalogue — grouped by tier
# Each entry: (model_id, display_label, tier)
GROQ_MODELS = [
    # --- Production Models ---
    ("llama-3.1-8b-instant",      "Llama 3.1 8B (560 t/s)",    "production"),
    ("llama-3.3-70b-versatile",   "Llama 3.3 70B (280 t/s)",   "production"),
    ("openai/gpt-oss-120b",       "GPT-OSS 120B (500 t/s)",    "production"),
    ("openai/gpt-oss-20b",        "GPT-OSS 20B (1000 t/s)",    "production"),
    # --- Production Systems ---
    ("groq/compound",             "Groq Compound (~450 t/s)",  "production"),
    ("groq/compound-mini",        "Groq Compound Mini (~450 t/s)", "production"),
    # --- Preview Models ---
    ("openai/gpt-oss-safeguard-20b", "Safety GPT-OSS 20B",     "preview"),
    ("qwen/qwen3.6-27b",          "Qwen 3.6-27B (500 t/s)",    "preview"),
    ("meta-llama/llama-prompt-guard-2-22m", "Prompt Guard 2 22M", "preview"),
    ("meta-llama/llama-prompt-guard-2-86m", "Prompt Guard 2 86M", "preview"),
    ("canopylabs/orpheus-v1-english", "Orpheus English TTS",    "preview"),
    ("canopylabs/orpheus-arabic-saudi", "Orpheus Arabic TTS",   "preview"),
]

# Default Groq model for the fallback chain (fast production model)
GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile"
