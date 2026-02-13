
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
$Before Loading the env get the api keys
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
GEMINI_KEYS = [k for k in [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4"),
    os.getenv("GEMINI_API_KEY_5")
] if k]

# OpenRouter Keys (Rotation)
OPENROUTER_KEYS = [k for k in [
    os.getenv("OPENROUTER_API_KEY"),
    os.getenv("OPENROUTER_API_KEY_2"),
    os.getenv("OPENROUTER_API_KEY_3"),
    os.getenv("OPENROUTER_API_KEY_4"),
    os.getenv("OPENROUTER_API_KEY_5")
] if k]

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

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

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
PREVIEW_DEPLOYMENT_REGEX = r"https://.*\.cherag\.pages\.dev"

# Models
GEMINI_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
]
OPENROUTER_MODEL = "allenai/molmo-2-8b:free"
