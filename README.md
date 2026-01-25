# Cherág - AI Study Partner (Premium Edition)

Cherág is an advanced AI-powered study companion designed to help students learn more effectively. By analyzing uploaded course materials (PDFs, docs, notes), it generates personalized study aids, tracks your mastery, and uses cognitive frameworks to deepen understanding.

##  Key Features

### 🧠 Knowledge Intelligence
*   **Knowledge Radar**: Visualizes concept dependencies and identifies "knowledge gaps" preventing you from understanding advanced topics.
*   **Confidence Meter**: Tracks your mastery over time using Spaced Repetition algorithms (SRS).
*   **Mental Models**: Applies genius-level thinking frameworks (First Principles, Second Order Thinking, Pareto Principle) to your study topics.

### 🎓 Active Learning Modes
*   **Teach-AI (Feynman Mode)**: The AI acts as a "curious student" that asks you questions. You learn by teaching it, exposing your own blind spots.
*   **Exam Simulator**: Generates realistic exam challenges based on your weak areas.
*   **Concept Compression**: Simplified explanations for complex topics (ELI5, Analogy, Tweet-style).
*   **Concept Remix**: Connects unrelated concepts to foster creative learning.

### 🛠 Core Essentials
*   **Intelligent Dashboard**: Upload lecture notes and documents. Supports PDF, DOCX, TXT, MD.
*   **AI Chat Assistant**: Ask questions about your materials with context-aware answers.
*   **Smart Flashcards**: Auto-generated flashcards.
*   **Quiz Generator**: Multiple-choice quizzes with detailed explanations.
*   **Visual Learning**: Interactive Mind Maps and Flowcharts (Mermaid.js).
*   **Study Shorts**: Curated, verified YouTube video recommendations.
*   **Activity History**: Tracks your summaries, roadmaps, and learning progress.

---

##  Tech Stack

*   **Frontend**: React (v19), TypeScript, Vite
*   **Styling**: TailwindCSS, Lucide React (Icons), Framer Motion
*   **Backend / Database**: Supabase (PostgreSQL, Edge Functions, Auth, Realtime)
*   **AI Services**:
    *   **Google Gemini 2.0 Flash** (Primary Intelligence)
    *   **OpenRouter** (Diagram Generation via Molmo)
    *   **Hugging Face** (Fallback inference)
*   **Visualization**: React Flow, Mermaid.js, Recharts

---

##  Prerequisites

*   Node.js (v18 or higher)
*   npm
*   A Supabase project
*   Google Gemini API Key
*   (Optional) YouTube Data API Keys, OpenRouter Key, Hugging Face Key

##  Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/cherag.git
    cd cherag
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory:

    ```env
    # Supabase (Required)
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

    # AI Keys (Required)
    VITE_GEMINI_API_KEY=your_gemini_api_key

    # Optional Features
    VITE_YOUTUBE_API_KEY=your_youtube_key   # For "Study Shorts"
    VITE_OPENROUTER_API_KEY=your_openrouter # For complex diagrams
    VITE_HUGGINGFACE_API_KEY=your_hf_key    # For redundant fallbacks
    ```

4.  **Database Setup**
    Run the migration scripts in your Supabase SQL Editor:
    - `supabase/migrations/20260124_premium_schema.sql` (Premium Features)
    - `supabase/migrations/20260125_activity_history.sql` (History Tracking)

5.  **Run the development server**
    ```bash
    npm run dev
    ```

##  Project Structure

```
src/
├── components/          # UI Components
│   ├── premium/         # New Premium Features (Radar, Mental Models, etc.)
│   ├── Dashboard.tsx    # Main App Layout
│   └── ...
├── lib/
│   ├── premium/         # Premium Logic (Graph algorithms, Analytics)
│   ├── aiService.ts     # Core AI Gateway
│   └── activityService.ts # History & Persistence
├── hooks/               # Custom Hooks (usePremiumFeatures, useFiles)
└── supabase/
    ├── functions/       # Deno Edge Functions (ai-gateway, process-doc)
    └── migrations/      # SQL Schema definitions
```

##  Authentication

Authentication is handled via Supabase Auth. The app supports email/password login and sign-up with session persistence.

##  License

MIT License

## Project URL
https://cherag.pages.dev/auth
