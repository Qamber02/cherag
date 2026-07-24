---
title: Cherag Backend
emoji: 🔥
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 8000
pinned: false
---

<div align="center">
  <h1>Cherág</h1>
  <p><strong>The Ultimate AI Study Partner</strong></p>
  <p><em>Active Recall > Passive Reading</em></p>
</div>

---

Cherág transforms static study materials (PDFs, Notes) into a dynamic, interactive learning ecosystem. It goes beyond simple summarization by acting as a proactive tutor—generating quizzes, curating educational video content, and challenging students to teach concepts back using the Feynman Technique. 

## Key Features

### Document Intelligence
*   **Smart Document Parsing:** Upload complex PDFs and documents. Context-aware vector embeddings allow the AI to deeply understand semantic meaning.
*   **Contextual Chat:** Ask specific questions grounded in your uploaded materials with source citations.
*   **Intelligent Summaries:** Generate concise summaries, key takeaways, and actionable items from dense chapters in one click.

### Interactive Learning Modes
*   **Gamified Quizzes:** Infinite, unique multiple-choice questions with a randomization engine to ensure you never see the exact same question twice. Includes a "Review Mistakes" session.
*   **AI Flashcards:** Automated generation of spaced-repetition term and definition cards.
*   **Study Shorts:** A "TikTok for Learning" interface featuring an infinite vertical scroll of educational short videos relevant to your document's topic.
*   **Mind Maps:** Visual node-based graphs to explore relationships between concepts and visualize the big picture hierarchy.

### Premium AI Tutors (Advanced Learning)
*   **Teach AI (Feynman Technique):** The AI acts as a beginner student. You explain the concept, and the AI grades your explanation for clarity and accuracy.
*   **Exam Engine:** Simulates full-length exams with mixed difficulty levels to prepare for real testing environments.
*   **Knowledge Radar:** Spider-chart visualization of your proficiency across different sub-topics.
*   **Concept Compression & Remix:** Applies the 80/20 rule to drill down to minimum viable knowledge, and generates analogies using lateral thinking.
*   **Mental Models:** Apply famous frameworks (e.g., First Principles, Inversion) to your study material.

## Architecture

*   **Frontend:** React (v19) + Vite + TypeScript. Lightning-fast load times with a custom TailwindCSS "Scholar" design system featuring Glassmorphism and robust Dark Mode support. Deployed on **Cloudflare Pages**.
*   **Backend:** Python FastAPI. Server-side AI orchestration with secure API key management, rate-limit handling, and multi-model fallback. Deployed on **Hugging Face Spaces**.
*   **Database:** Supabase (PostgreSQL + Auth) for relational data and robust Vector Store capabilities.
*   **AI Logic:** Hybrid LLM usage with automatic failover protection (if one API errors out, the system seamlessly retries with another).

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python 3.9+
*   Supabase Account & Project

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/Qamber02/cherag.git
cd cherag

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run dev
```

### Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

## License
This project is proprietary and confidential.

<div align="center">
  <em>Built with love for students who want to learn faster and better.</em>
</div>
