# System Design Document

![System Design Architecture Diagram](./system_design_diagram.png)

## Architecture Overview

The Cherag application follows a modern **Client-Server-AI** architecture, leveraging **React** for the frontend, **Supabase** for the backend (BaaS), and **Google Gemini** for AI intelligence.

```mermaid
graph TD
    subgraph Client [Client Side "React + Vite"]
        UI[User Interface]
        Auth[Auth Provider]
        State[State Management]
        
        subgraph Features
            Quiz[Quizzes Tab]
            Flash[Flashcards]
            Sum[Summary]
            Chat[Chat Assistant]
            Mind[Mind Maps]
        end
        
        UI --> Features
    end

    subgraph Backend [Backend "Supabase"]
        DB[(PostgreSQL Database)]
        AuthService[Authentication Service]
        Realtime[Realtime Subscriptions]
        Storage[File Storage]
        
        DB --> AuthService
    end

    subgraph AI_Layer [AI Intelligence "Google Gemini API"]
        GenModel[Generative Model]
        Vision[Vision/OCR]
    end

    %% Data Flow
    Client -- "HTTP/WebSocket" --> Backend
    Client -- "REST API" --> AI_Layer
    
    %% Feature Connections
    Quiz -- "Fetch/Save" --> DB
    Quiz -- "Generate Questions" --> GenModel
    Flash -- "Generate Decks" --> GenModel
    Sum -- "Extract Text" --> GenModel
```

## Core Components

### 1. Frontend Layer
*   **Framework:** React 19 + Vite
*   **Styling:** TailwindCSS 4
*   **Routing:** React Router 7
*   **State Management:** React Hooks (useState, useEffect, Custom Hooks)
*   **Icons:** Lucide React

### 2. Backend Layer (Supabase)
*   **Database:** PostgreSQL
*   **Authentication:** Supabase Auth
*   **Tables:**
    *   `quizzes`: Stores generated quizzes and user results.
    *   `activity_history`: Logs all user activities (summaries, quizzes, etc.).
    *   `users`: User profiles.
    *   `flashcards`: Flashcard decks.

### 3. AI Service Layer
*   **Provider:** Google Gemini
*   **Functions:**
    *   `generateQuizzes`: Creates context-aware questions.
    *   `generateSummary`: Summarizes documents.
    *   `generateFlashcards`: Creates study decks.

## Data Flow (Quiz Generation)
1.  **Input:** User provides a topic or uploads a document (Text/PDF).
2.  **Processing:** Frontend extracts text (using `pdfjs`, `mammoth`, or `tesseract` if needed).
3.  **AI Request:** Text context is sent to Google Gemini with a prompt to generate JSON-structured questions.
4.  **Response:** Gemini returns JSON array of questions.
5.  **Storage:** Questions are saved to Supabase `quizzes` table.
6.  **Interaction:** User answers questions; results are updated in Supabase.
