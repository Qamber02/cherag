# Cherág: The Ultimate AI Study Partner
*Presentation & Feature Guide*

## 1. Executive Summary
**Cherág** transforms static study materials (PDFs, Notes) into a dynamic, interactive learning ecosystem. It goes beyond simple summarization by acting as a proactive tutor—generating quizzes, curating video content, and challenging the student to teach concepts back to the AI.

**Core Philosophy:** Active Recall > Passive Reading.

---

## 2. Comprehensive Feature Breakdown

### A. The Foundation (Document Intelligence)
*   **Smart Document Parsing:**
    *   *Function:* Uploads complex PDFs/Docx.
    *   *Tech:* Vector embeddings allow the AI to "read" and "understand" the semantic meaning of the entire text, not just keyword matching.
    *   *UX:* Context-aware sidebar file management.

*   **Contextual Chat:**
    *   *Function:* Ask questions specifically about *your* document.
    *   *Differentiation:* Unlike generic ChatGPT, it cites sources from the uploaded files and refuses to hallucinate facts not present in the text.

*   **Intelligent Summaries:**
    *   *Function:* One-click generation of concise summaries, key takeaways, and action items from dense chapters.

### B. Interactive Learning Modes
*   **Gamified Quizzes:**
    *   *Function:* Generates infinite, unique multiple-choice questions.
    *   *Key Features:*
        *   **Randomization Engine:** Ensures you never see the exact same question twice; seeds are time-based for uniqueness.
        *   **Review Mode:** Automatically tracks wrong answers and offers a "Review Mistakes" session.
        *   **Confetti & Feedback:** Instant positive reinforcement.

*   **AI Flashcards:**
    *   *Function:* Automates the creation of spaced-repetition cards.
    *   *Detail:* Extracts term-definition pairs from the text automatically.

*   **Study Shorts (Video Feed):**
    *   *Function:* A "TikTok for Learning." An infinite vertical scroll of educational short videos relevant to the document topic.
    *   *Tech:*
        *   **Contextual Search:** Uses document keywords to find relevant YouTube content.
        *   **Interaction Tracking:** Tracks watch time, skips, and likes to refine the "relevance score" of future videos.
        *   **Blank Screen Protection:** Robust filtering ensures only valid, playable videos are shown.

*   **Mind Maps:**
    *   *Function:* Visualizes the relationships between concepts in a node-based graph.
    *   *Why:* Perfect for visual learners to see the "big picture" hierarchy.

### D. Premium AI Tutors (Advanced Learning)
*   **Knowledge Radar:**
    *   *Function:* Visualizes student proficiency across different sub-topics.
    *   *Mech:* A spider-chart interface that grows as you answer questions correctly in specifically deficient areas.

*   **Exam Engine:**
    *   *Function:* Simulates full-length exams with mixed difficulty levels (Easy, Medium, Hard).
    *   *Goal:* Prepares students for the pressure of real testing environments.

*   **Teach AI (Feynman Technique):**
    *   *Function:* The AI pretends to be a beginner student, and *you* have to explain the concept to it.
    *   *Goal:* The ultimate test of mastery is teaching. The AI grades your explanation for clarity and accuracy.

*   **Concept Compression:**
    *   *Function:* Applies the 80/20 rule to materials.
    *   *Goal:* Drills down to the absolute minimum viable knowledge needed to pass.

*   **Concept Remix:**
    *   *Function:* Generates analogies and interdisciplinary connections (e.g., "Explain Quantum Mechanics using Football terms").
    *   *Goal:* Deepens understanding through lateral thinking.

*   **Mental Models:**
    *   *Function:* Applies famous frameworks (e.g., First Principles, Inversion) to the study material.

### E. System & Utility
*   **Activity History:**
    *   *Function:* A comprehensive log of every quiz taken, video watched, and summary generated.
    *   *Tech:* Unified database logging ensures progress is never lost.
*   **Responsive Design:**
    *   *Function:* Fully optimized for Mobile and Desktop. Touch-friendly navigation bar on mobile.

---

## 3. Technical Architecture Highlights
*   **Frontend:** React 18 + TypeScript + Vite (Lightning fast load times).
*   **Styling:** TailwindCSS with a custom "Scholar" design system (Glassmorphism, Dark Mode support).
*   **Backend:** Supabase (PostgreSQL) for relational data and Vector Store.
*   **AI Logic:** Hybrid LLM usage (Gemini/DeepSeek) with automatic failover protection (if one API errors out, the system retries with another).
*   **Reliability:** Custom Error Boundaries and Fallback UI components (e.g., standardized empty states for feeds).

---

## 4. The "Perfect Demo" Script (Updated)

1.  **The Hook (Home Tab):** Start on the Dashboard. Show the clean UI and the "Activity History" showing previous progress.
2.  **The Input (Upload):** Upload a file. Point out how quickly the specific context is loaded.
3.  **The Visual (Mind Map):** Immediately go to the Mind Map tab. "Before we read, let's see the structure."
4.  **The Deep Dive (Study Shorts):** "I don't feel like reading yet." Open StudyShorts. Scroll through 2 videos. Explicitly mention the **Interaction Tracking** (it knows if you skipped!).
5.  **The Drill (Teach AI):** "Okay, I think I get it." Open 'Teach AI'. Explain the concept to the bot. Show the bot's grading/feedback.
6.  **The Final Boss (Exam Engine):** Generate a hard mode mock exam. Submit it and show the result screen.

---

## 5. Deployment
*   **Platform:** Vercel / Netlify (Frontend), Supabase (Backend).
*   **Environment:** Production-ready with environment variable isolation for API keys.
