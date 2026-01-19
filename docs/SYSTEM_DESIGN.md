# Cherág - System Design Document

## 1. Executive Summary

**Cherág** is an AI-powered study companion that transforms uploaded course materials (PDFs, DOCX, TXT, Markdown) into personalized study aids. The system leverages multiple AI models with automatic fallback, providing students with intelligent flashcards, quizzes, summaries, mind maps, diagrams, and curated video recommendations.

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React SPA]
    end
    
    subgraph "Service Layer"
        AI[AI Service Multi-Model]
        FP[File Parser]
        RL[Rate Limiter]
        AS[Activity Service]
    end
    
    subgraph "Data Layer"
        SB[(Supabase)]
        ST[Storage Buckets]
    end
    
    subgraph "External APIs"
        GEM[Google Gemini]
        OR[OpenRouter]
        HF[Hugging Face]
        YT[YouTube Data API]
    end
    
    UI --> AI
    UI --> FP
    UI --> SB
    AI --> RL
    AI --> GEM
    AI --> OR
    AI --> HF
    AI --> YT
    FP --> UI
    AS --> SB
    UI --> AS
    UI --> ST
```

---

## 2. System Architecture

### 2.1 High-Level Architecture

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 19 + TypeScript + Vite | Single Page Application with modern hooks |
| **Styling** | TailwindCSS 4 + Framer Motion | Responsive UI with smooth animations |
| **Backend** | Supabase (PostgreSQL) | Authentication, Database, Storage |
| **AI Primary** | Google Gemini 2.0/2.5 Flash | Content generation (summaries, flashcards, quizzes) |
| **AI Fallback** | OpenRouter (Molmo) / Hugging Face | Reliability through multi-model fallback |
| **Visualization** | Mermaid.js | Flowcharts and diagrams |

### 2.2 Component Architecture

```mermaid
graph TD
    subgraph "App.tsx - Root"
        Router[React Router]
    end

    subgraph "Pages"
        Auth[AuthPage]
        Reset[ResetPasswordPage]
        Dash[Dashboard]
    end

    subgraph "Dashboard Tabs"
        Home[DashboardHome]
        Chat[ChatTab]
        Summary[SummaryTab]
        FC[FlashcardsTab]
        Quiz[QuizzesTab]
        Diag[DiagramsTab]
        Mind[MindMapTab]
        Vids[StudyShortsTab]
        Hist[HistoryTab]
    end

    subgraph "Core Hooks"
        useFiles
        useChat
        useFlashcards
        useStudyShorts
        useToast
    end

    subgraph "Library Services"
        aiService
        gemini
        openRouter
        rateLimiter
        fileParser
        activityService
        supabaseClient
    end

    Router --> Auth
    Router --> Reset
    Router --> Dash
    Dash --> Home
    Dash --> Chat
    Dash --> Summary
    Dash --> FC
    Dash --> Quiz
    Dash --> Diag
    Dash --> Mind
    Dash --> Vids
    Dash --> Hist
    Dash --> useFiles
    Chat --> useChat
    FC --> useFlashcards
    Vids --> useStudyShorts
```

---

## 3. Data Architecture

### 3.1 Database Schema (Supabase PostgreSQL)

```mermaid
erDiagram
    auth_users ||--o{ profiles : has
    auth_users ||--o{ documents : uploads
    auth_users ||--o{ chats : creates
    auth_users ||--o{ flashcards : generates
    auth_users ||--o{ quizzes : generates
    auth_users ||--o{ videos : saves
    auth_users ||--o{ activity_history : logs
    auth_users ||--o{ summaries : generates
    
    documents ||--o{ document_chunks : contains
    documents ||--o{ flashcards : "linked to"
    documents ||--o{ quizzes : "linked to"
    documents ||--o{ summaries : "linked to"
    
    chats ||--o{ messages : contains
    
    channel_trust ||--o{ verified_videos : verifies

    profiles {
        uuid id PK
        text email
        int daily_requests_count
        timestamp last_request_time
    }
    
    documents {
        uuid id PK
        uuid user_id FK
        text filename
        text file_type
        text file_path
        int file_size
        text content
    }
    
    document_chunks {
        uuid id PK
        uuid document_id FK
        text content
        vector embedding
        int chunk_index
    }
    
    chats {
        uuid id PK
        uuid user_id FK
        text title
    }
    
    messages {
        uuid id PK
        uuid chat_id FK
        text role
        text content
    }
    
    flashcards {
        uuid id PK
        uuid user_id FK
        uuid document_id FK
        text front
        text back
        text status
    }
    
    quizzes {
        uuid id PK
        uuid user_id FK
        uuid document_id FK
        text question
        jsonb options
        text correct_answer
        text explanation
        text difficulty
        boolean answered
        text user_answer
    }
    
    videos {
        uuid id PK
        uuid user_id FK
        uuid document_id FK
        text youtube_id
        text title
        text description
        text thumbnail_url
    }
    
    activity_history {
        uuid id PK
        uuid user_id FK
        text activity_type
        text title
        text content_preview
        jsonb metadata
    }
    
    summaries {
        uuid id PK
        uuid user_id FK
        uuid document_id FK
        text title
        text content
        jsonb key_points
    }
```

### 3.2 Table Descriptions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User settings & rate limits | `daily_requests_count`, `last_request_time` |
| `documents` | Uploaded file metadata + full content | `filename`, `content`, `file_type` |
| `document_chunks` | RAG chunks with vector embeddings | `embedding` (vector 768), `chunk_index` |
| `chats` | Chat session containers | `title`, `user_id` |
| `messages` | Chat messages (user/assistant) | `role`, `content` |
| `flashcards` | Generated study flashcards | `front`, `back`, `status` |
| `quizzes` | Multiple choice questions | `options` (JSONB), `correct_answer` |
| `videos` | YouTube video recommendations | `youtube_id`, `thumbnail_url` |
| `activity_history` | User activity log | `activity_type`, `content_preview` |
| `summaries` | Generated document summaries | `content`, `key_points` |
| `channel_trust` | YouTube channel reliability | `trust_score`, `videos_verified` |
| `verified_videos` | Cached verified educational videos | `relevance_score`, `semantic_score` |

### 3.3 Row Level Security (RLS)

All user-facing tables implement RLS policies ensuring users can only access their own data:

```sql
-- Example: Documents table
CREATE POLICY "Users can crud own documents" 
ON documents FOR ALL 
USING (auth.uid() = user_id);
```

---

## 4. AI Service Architecture

### 4.1 Multi-Model Fallback Strategy

```mermaid
flowchart TD
    Request[AI Request] --> RL{Rate Limiter}
    RL -->|Allowed| Gemini[Gemini 2.0 Flash-Lite]
    RL -->|Rate Limited| Wait[Wait for Token]
    Wait --> Gemini
    
    Gemini -->|Success| Response[Return Response]
    Gemini -->|429/500| Fallback1[Try Next Gemini Model]
    
    Fallback1 -->|Success| Response
    Fallback1 -->|All Failed| OpenRouter[OpenRouter Molmo]
    
    OpenRouter -->|Success| Response
    OpenRouter -->|Failed| HuggingFace[Hugging Face]
    
    HuggingFace -->|Success| Response
    HuggingFace -->|Failed| Error[Throw Error]
```

### 4.2 Available AI Models

| Priority | Provider | Model | Use Case |
|----------|----------|-------|----------|
| 1 | Google Gemini | gemini-2.0-flash-lite | Fastest, most efficient |
| 2 | Google Gemini | gemini-2.0-flash | Fast and capable |
| 3 | Google Gemini | gemini-1.5-flash | Reliable fallback |
| 4 | Google Gemini | gemini-1.5-flash-8b | Lightweight |
| 5 | Google Gemini | gemini-2.5-flash | Latest capabilities |
| 6 | OpenRouter | allenai/molmo-2-8b:free | Free alternative for chat |
| 7 | Hugging Face | Various task-specific models | Ultimate fallback |

### 4.3 AI Service Functions

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `generateSummary()` | Document text + options | Markdown summary | Concise document summaries |
| `generateFlashcards()` | Document text | JSON array [{question, answer}] | Study flashcards |
| `generateQuizzes()` | Document text | JSON array [{question, options, correct_answer, explanation}] | MCQ generation |
| `generateDiagram()` | Document text | Mermaid.js code | Flowchart visualization |
| `generateMindMap()` | Document text | JSON tree {title, children[]} | Hierarchical concept map |
| `chatWithAI()` | Context + query | Text response | Context-aware Q&A |
| `generateVideos()` | Topic | Video results + pagination | YouTube recommendations |

### 4.4 Rate Limiting (Token Bucket Algorithm)

```mermaid
graph LR
    subgraph "Token Bucket"
        Bucket[tokens: N]
    end
    
    Request --> Check{tokens >= 1?}
    Check -->|Yes| Consume[tokens -= 1]
    Check -->|No| Wait[Wait 500ms]
    Wait --> Check
    Consume --> Process[Process Request]
    
    Refill[Refill Timer] -->|Every second| Add[tokens += refillRate]
    Add --> Cap{tokens > max?}
    Cap -->|Yes| SetMax[tokens = max]
    Cap -->|No| Keep[Keep tokens]
```

**Rate Limits per Feature:**

| Feature | Max Tokens | Refill Rate |
|---------|------------|-------------|
| Summary | 10/min | 10 tokens/min |
| Flashcards | 8/min | 8 tokens/min |
| Quizzes | 8/min | 8 tokens/min |
| Diagrams | 5/min | 5 tokens/min |
| Mind Maps | 5/min | 5 tokens/min |
| Chat | 15/min | 15 tokens/min |
| Videos | 10/min | 10 tokens/min |

---

## 5. File Processing Pipeline

### 5.1 Supported File Types

| Extension | MIME Type | Parser Used |
|-----------|-----------|-------------|
| `.pdf` | application/pdf | pdfjs-dist |
| `.docx` | application/vnd.openxmlformats-officedocument.wordprocessingml.document | mammoth |
| `.doc` | application/msword | mammoth |
| `.txt` | text/plain | FileReader |
| `.md` | text/markdown | FileReader |

### 5.2 File Upload Flow

```mermaid
sequenceDiagram
    participant U as User
    participant S as Sidebar
    participant H as useFiles Hook
    participant FP as fileParser
    participant DB as Supabase DB
    participant ST as Storage
    participant EF as Edge Function

    U->>S: Select file
    S->>H: uploadFile(file)
    H->>FP: parseFile(file)
    FP->>FP: Detect type & parse
    FP-->>H: Return text content
    
    H->>ST: Upload original file
    H->>DB: Insert document record
    DB-->>H: Return document ID
    
    H->>EF: process-document (async)
    EF->>EF: Generate embeddings
    EF->>DB: Store chunks with vectors
    
    H-->>S: Update file list
    S-->>U: Show uploaded file
```

---

## 6. Authentication & Security

### 6.1 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as AuthPage
    participant SB as Supabase Auth
    participant App as App.tsx
    participant D as Dashboard

    U->>A: Enter credentials
    A->>SB: signInWithPassword() / signUp()
    SB-->>A: Session / Error
    
    alt Success
        A-->>App: Navigate to /
        App->>SB: getSession()
        SB-->>App: Valid session
        App->>D: Render Dashboard
    else Error
        A->>A: Show error message
    end
    
    Note over App,SB: onAuthStateChange listener active
```

### 6.2 Security Measures

| Layer | Protection |
|-------|------------|
| **Authentication** | Supabase Auth with email verification |
| **Authorization** | Row Level Security (RLS) on all tables |
| **API Keys** | Environment variables (VITE_*) |
| **Input Sanitization** | `sanitizeInput()` in aiService.ts |
| **Rate Limiting** | Client-side token bucket per feature |
| **Storage** | Private buckets with owner-only policies |

---

## 7. Frontend Architecture

### 7.1 Component Hierarchy

```
App.tsx (Router + Auth State)
├── AuthPage.tsx (Login/Signup/Forgot Password)
├── ResetPasswordPage.tsx (Password Reset)
└── Dashboard.tsx (Main Application)
    ├── Sidebar.tsx (Navigation + File Management)
    │   └── Document List
    ├── DashboardHome.tsx (Welcome + Quick Actions)
    ├── ChatTab.tsx (AI Chat Interface)
    ├── SummaryTab.tsx (Document Summaries)
    ├── FlashcardsTab.tsx (Interactive Flashcards)
    ├── QuizzesTab.tsx (MCQ Quiz Interface)
    ├── DiagramsTab.tsx (Mermaid Flowcharts)
    ├── MindMapTab.tsx (Learning Roadmaps)
    ├── StudyShortsTab.tsx (YouTube Videos)
    ├── HistoryTab.tsx (Activity Log)
    ├── SettingsTab.tsx (User Preferences)
    └── ToastContainer.tsx (Notifications)
```

### 7.2 State Management

| Hook | Purpose | State Managed |
|------|---------|---------------|
| `useFiles` | File CRUD operations | `files[]`, `isParsing`, `isLoading` |
| `useChat` | Chat history management | `messages[]`, `isLoading` |
| `useFlashcards` | Flashcard generation & storage | `flashcards[]`, `isLoading` |
| `useStudyShorts` | Video recommendations | `videos[]`, `pageToken` |
| `useToast` | Notification system | `toasts[]` |

### 7.3 Navigation Structure

| Tab ID | Icon | Label | Component |
|--------|------|-------|-----------|
| `dashboard` | LayoutDashboard | Dashboard | DashboardHome |
| `chat` | MessageCircle | Chat | ChatTab |
| `summary` | FileCheck | Summary | SummaryTab |
| `flashcards` | Layers | Flashcards | FlashcardsTab |
| `quizzes` | FileQuestion | Quizzes | QuizzesTab |
| `diagrams` | GitBranch | Diagrams | DiagramsTab |
| `mindmap` | Map | Roadmap | MindMapTab |
| `videos` | Play | Study Shorts | StudyShortsTab |
| `history` | Clock | History | HistoryTab |

---

## 8. Deployment Architecture

### 8.1 Build & Deployment

```mermaid
flowchart LR
    subgraph "Development"
        Code[Source Code]
        Vite[Vite Dev Server]
    end
    
    subgraph "Build"
        TSC[TypeScript Compiler]
        Bundle[Vite Build]
    end
    
    subgraph "Production"
        Dist[dist/]
        CDN[Static Hosting]
    end
    
    Code --> Vite
    Code --> TSC --> Bundle --> Dist --> CDN
```

### 8.2 Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `VITE_GEMINI_API_KEY` | ✅ | Google Gemini API access |
| `VITE_YOUTUBE_API_KEY` | ⚪ | YouTube video recommendations |
| `VITE_OPENROUTER_API_KEY` | ⚪ | OpenRouter fallback |
| `VITE_HUGGINGFACE_API_KEY` | ⚪ | Hugging Face fallback |

---

## 9. Data Flow Diagrams

### 9.1 Document Processing & AI Generation

```mermaid
flowchart TD
    subgraph "User Actions"
        Upload[Upload Document]
        Generate[Generate Content]
    end
    
    subgraph "Processing"
        Parse[Parse Document]
        Store[Store in DB]
        Context[Build Context]
    end
    
    subgraph "AI Generation"
        Summary[Generate Summary]
        Flash[Generate Flashcards]
        Quiz[Generate Quizzes]
        Diagram[Generate Diagram]
        Mind[Generate Mind Map]
    end
    
    subgraph "Output"
        Display[Display Results]
        Save[Save to DB]
        Activity[Log Activity]
    end
    
    Upload --> Parse --> Store
    Store --> Context
    Generate --> Context
    Context --> Summary --> Display
    Context --> Flash --> Display
    Context --> Quiz --> Display
    Context --> Diagram --> Display
    Context --> Mind --> Display
    Display --> Save
    Display --> Activity
```

### 9.2 Chat Interaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant CT as ChatTab
    participant UC as useChat
    participant AI as aiService
    participant DB as Supabase

    U->>CT: Send question
    CT->>UC: sendMessage(query)
    UC->>UC: Build context from documents
    UC->>AI: chatWithAI(context, query)
    AI->>AI: Rate limit check
    AI->>AI: Call Gemini API
    AI-->>UC: Response text
    UC->>DB: Save message to chat
    UC-->>CT: Update messages state
    CT-->>U: Display AI response
```

---

## 10. Performance Considerations

### 10.1 Optimization Strategies

| Area | Strategy | Implementation |
|------|----------|----------------|
| **File Parsing** | Client-side processing | pdfjs-dist, mammoth run in browser |
| **API Calls** | Rate limiting | Token bucket prevents quota exhaustion |
| **UI Updates** | Optimistic updates | File list updates before server confirms |
| **State** | Local state | Component-level useState for responsiveness |
| **Theme** | Instant apply | localStorage + CSS class on documentElement |

### 10.2 Caching Strategy

| Data | Cache Location | TTL |
|------|----------------|-----|
| Session | Supabase Auth | Until logout |
| Documents | React state + DB | Persistent |
| Chat history | React state + DB | Persistent |
| Theme preference | localStorage | Persistent |
| Rate limit tokens | Memory (RateLimiter class) | Session |

---

## 11. Error Handling

### 11.1 Error Boundaries

```tsx
// ErrorBoundary.tsx wraps main content
<ErrorBoundary fallback={<ErrorUI />}>
  <Dashboard />
</ErrorBoundary>
```

### 11.2 AI Service Error Handling

```mermaid
flowchart TD
    Call[API Call] --> Check{Response OK?}
    Check -->|Yes| Parse[Parse Response]
    Check -->|No| Classify{Error Type}
    
    Classify -->|429 Rate Limit| Retry[Wait & Retry Next Model]
    Classify -->|500 Server Error| Retry
    Classify -->|400 Bad Request| Log[Log & Throw]
    Classify -->|Network Error| Fallback[Try Fallback Provider]
    
    Parse --> Validate{Valid JSON?}
    Validate -->|Yes| Return[Return Data]
    Validate -->|No| Clean[Clean & Retry Parse]
    Clean --> Return
```

---

## 12. Future Enhancements

### 12.1 Planned Features

1. **RAG Enhancement** - Full vector similarity search using pgvector
2. **Spaced Repetition** - SM-2 algorithm for flashcard scheduling
3. **Collaborative Spaces** - Shared study groups
4. **Export Options** - PDF/Anki deck export
5. **Mobile App** - React Native companion

### 12.2 Scalability Path

| Current | Future |
|---------|--------|
| Client-side AI calls | Edge Functions for security |
| Single user focus | Multi-tenant with quotas |
| Browser storage | CDN for assets |
| Manual file upload | Automatic sync from cloud storage |

---

## 13. Technology Dependencies

### 13.1 Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI Framework |
| react-dom | ^19.2.0 | DOM Rendering |
| react-router-dom | ^7.10.1 | Client-side routing |
| @supabase/supabase-js | ^2.87.1 | Backend SDK |
| framer-motion | ^12.23.26 | Animations |
| lucide-react | ^0.561.0 | Icons |
| mammoth | ^1.11.0 | DOCX parsing |
| mermaid | ^11.12.2 | Diagram rendering |
| pdfjs-dist | ^5.4.449 | PDF parsing |
| react-markdown | ^10.1.0 | Markdown rendering |

### 13.2 Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^5.4.11 | Build tool |
| typescript | ~5.9.3 | Type safety |
| tailwindcss | ^4.1.18 | CSS framework |
| eslint | ^9.39.1 | Code linting |

---

*Document generated on: January 19, 2026*
