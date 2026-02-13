# Cherág - AI Study Partner

Cherág is an advanced AI-powered study companion designed to help students learn more effectively. It uses a **FastAPI backend** to orchestrate multiple AI models (Gemini, DeepSeek, OpenRouter) and a **React frontend** for a premium user experience.

---

##  Architecture

*   **Frontend**: React (v19) + Vite + TailwindCSS (Deployed on **Cloudflare Pages**)
*   **Backend**: Python FastAPI (Deployed on **Railway**)
*   **Database**: Supabase (PostgreSQL + Auth)
*   **AI Orchestration**: Server-side processing with secure API key management, rate-limit handling, and multi-model fallback.

---

##  Quick Start (Local Development)

### Prerequisites
*   Node.js (v18+)
*   Python 3.10+
*   Supabase Project

### 1. Setup Backend (FastAPI)

The backend handles all AI logic and protects your API keys.

```powershell
# Navigate to project root
cd cherag

# Create and activate a Python virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
# venv\Scripts\activate.bat
# On macOS/Linux:
# source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create .env file with your keys
# (See .env.example for template)
# Add: GEMINI_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY, SUPABASE_JWT_SECRET, etc.

# Run the server
uvicorn main:app --reload
```
*Backend runs at `http://localhost:8000`*

### 2. Setup Frontend (React)

The frontend communicates with the local backend during development.

```powershell
# Open a new terminal
cd cherag

# Install dependencies
npm install

# Create .env file for frontend with these variables:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
# VITE_API_BASE_URL=http://localhost:8000  (for local dev, points to the FastAPI backend)

# Run the dev server
npm run dev
```
*Frontend runs at `http://localhost:5173`*

---

## 🌍 Deployment

We use a split deployment strategy for maximum performance and security.

### 1. Backend Deployment (Railway)
Hosting the FastAPI server.
👉 **[Read the Railway Setup Guide](docs/RAILWAY_SETUP.md)**

### 2. Frontend Deployment (Cloudflare Pages)
Hosting the React SPA.
👉 **[Read the Cloudflare Setup Guide](docs/CLOUDFLARE_SETUP.md)**

---

## 🔑 Key Features

### Knowledge Intelligence
*   **Knowledge Radar**: Visualizes concept dependencies and tracks mastery.
*   **Multi-Model AI**: Automatically switches between Gemini, DeepSeek, and OpenRouter based on availability and task complexity.
*   **Smart Fallback**: If one AI provider is rate-limited, the system seamlessly tries another.

### Active Learning Modes
*   **Teach-AI (Feynman Mode)**: You learn by teaching the AI.
*   **Exam Simulator**: Realistic exam generation based on your weak spots.
*   **Video Intelligence**: Finds and analyzes relevant YouTube videos; ad display is controlled by YouTube/Google and may still appear.

---

## 📂 Project Structure

```
├── main.py                  # FastAPI Backend Entry Point
├── requirements.txt         # Backend Dependencies
├── Procfile                 # Deployment Command
├── src/
│   ├── components/          # React UI Components
│   ├── lib/
│   │   ├── aiService.ts     # Client proxy to Backend API
│   │   └── ...
│   └── ...
├── docs/                    # Deployment Guides
└── public/                  # Static Assets & _redirects
```

## 📜 License
MIT License
