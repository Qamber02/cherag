# Cherág - AI Study Partner
## Software Engineering Documentation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Design](#3-architecture-design)
4. [Technology Stack](#4-technology-stack)
5. [Component Specifications](#5-component-specifications)
6. [Data Layer](#6-data-layer)
7. [AI Services](#7-ai-services)
8. [Security & Authentication](#8-security--authentication)
9. [API Reference](#9-api-reference)
10. [Deployment Guide](#10-deployment-guide)
11. [Testing Strategy](#11-testing-strategy)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. Executive Summary

### 1.1 Project Overview

**Cherág** is an advanced AI-powered study companion designed to help students learn more effectively. By analyzing uploaded course materials (PDFs, documents, notes), it generates personalized study aids including:

- **AI Summaries** - Concise document summaries with key term highlighting
- **Smart Flashcards** - Auto-generated Q&A cards for memory testing
- **Interactive Quizzes** - Multiple-choice assessments with explanations
- **Visual Diagrams** - Mermaid.js flowcharts and process diagrams
- **Mind Maps** - Hierarchical concept visualization
- **AI Chat Assistant** - Context-aware Q&A about uploaded materials
- **Study Shorts** - Curated YouTube video recommendations

### 1.2 Key Metrics

| Metric | Value |
|--------|-------|
| Total Source Files | ~35+ |
| React Components | 14 |
| Custom Hooks | 4 |
| Service Modules | 8 |
| Database Tables | 12 |
| Lines of Code | ~4,500+ |

### 1.3 Version Information

- **Application Version**: 0.0.0 (Development)
- **React Version**: 19.2.0
- **TypeScript Version**: 5.9.3
- **Vite Version**: 5.4.11

---

## 2. System Overview

### 2.1 System Purpose

Cherág addresses the challenge of efficient study material processing by:

1. **Document Parsing** - Extracting text from PDF, DOCX, TXT, and MD files
2. **AI Processing** - Using Google Gemini for intelligent content generation
3. **Multi-Modal Learning** - Supporting visual, textual, and interactive learning styles
4. **Progress Tracking** - Recording user activity and study history

### 2.2 User Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────┐    ┌──────────┐    ┌─────────────┐               │
│   │  Login  │───▶│  Upload  │───▶│  Generate   │               │
│   │         │    │ Document │    │   Content   │               │
│   └─────────┘    └──────────┘    └──────┬──────┘               │
│                                         │                       │
│   ┌─────────────────────────────────────┼───────────────────┐  │
│   │                                     ▼                   │  │
│   │  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐  │  │
│   │  │Summary  │ │Flashcards │ │ Quizzes  │ │ Diagrams  │  │  │
│   │  └─────────┘ └───────────┘ └──────────┘ └───────────┘  │  │
│   │                                                         │  │
│   │  ┌─────────┐ ┌───────────┐ ┌──────────────────────────┐│  │
│   │  │Mind Map │ │   Chat    │ │     Study Shorts         ││  │
│   │  └─────────┘ └───────────┘ └──────────────────────────┘│  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Core Features

| Feature | Description | AI Model |
|---------|-------------|----------|
| **Document Upload** | Parse PDF, DOCX, TXT, MD files | N/A |
| **AI Summary** | Generate concise summaries with key terms | Gemini 2.0 Flash |
| **Flashcards** | Create Q&A pairs for memorization | Gemini 2.0 Flash |
| **Quizzes** | Multiple choice questions with explanations | Gemini 2.0 Flash |
| **Diagrams** | Flowcharts and process diagrams | Gemini 2.0 Flash |
| **Mind Maps** | Hierarchical concept visualization | Gemini 2.0 Flash |
| **AI Chat** | Context-aware Q&A assistant | Gemini + OpenRouter |
| **Study Shorts** | YouTube video recommendations | YouTube Data API |

---

## 3. Architecture Design

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                    React 19 + TypeScript                           ││
│  │  ┌──────────────┐  ┌─────────────┐  ┌──────────────────────────┐  ││
│  │  │  Components  │  │   Hooks     │  │      Services (lib/)     │  ││
│  │  │  (14 files)  │  │  (4 files)  │  │       (8 files)          │  ││
│  │  └──────────────┘  └─────────────┘  └──────────────────────────┘  ││
│  └────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVICES                               │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Supabase Database   │  │  Supabase Auth   │  │ Supabase Storage │  │
│  │  (PostgreSQL)        │  │  (Email/Password)│  │  (Document Files)│  │
│  └──────────────────────┘  └──────────────────┘  └──────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL AI SERVICES                            │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Google Gemini API   │  │   OpenRouter     │  │  Hugging Face    │  │
│  │  (Primary AI Model)  │  │   (Fallback)     │  │   (Fallback)     │  │
│  └──────────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      YouTube Data API                             │  │
│  │                   (Video Recommendations)                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Directory Structure

```
cherag/
├── src/
│   ├── components/           # React UI Components (14 files)
│   │   ├── AuthPage.tsx          # Login/Signup page
│   │   ├── ChatTab.tsx           # AI chat interface
│   │   ├── Dashboard.tsx         # Main layout controller
│   │   ├── DashboardHome.tsx     # Home tab with stats
│   │   ├── DiagramsTab.tsx       # Mermaid diagram generation
│   │   ├── FlashcardsTab.tsx     # Flashcard viewer/generator
│   │   ├── HistoryTab.tsx        # Activity history viewer
│   │   ├── MindMapTab.tsx        # Mind map visualization
│   │   ├── QuizzesTab.tsx        # Quiz generation/taking
│   │   ├── ResetPasswordPage.tsx # Password reset flow
│   │   ├── SettingsTab.tsx       # User preferences
│   │   ├── Sidebar.tsx           # Navigation & file list
│   │   ├── StudyShortsTab.tsx    # YouTube video viewer
│   │   └── SummaryTab.tsx        # Document summaries
│   │
│   ├── hooks/                # Custom React Hooks (4 files)
│   │   ├── useChat.ts            # Chat message management
│   │   ├── useFiles.ts           # Document upload/management
│   │   ├── useFlashcards.ts      # Flashcard CRUD operations
│   │   └── useStudyShorts.ts     # YouTube video fetching
│   │
│   ├── lib/                  # Utility & Service Modules (8 files)
│   │   ├── activityService.ts    # Activity history logging
│   │   ├── aiService.ts          # Multi-model AI orchestration
│   │   ├── diagramImageService.ts# Diagram image generation
│   │   ├── fileParser.ts         # PDF/DOCX/TXT parsing
│   │   ├── gemini.ts             # Direct Gemini API calls
│   │   ├── openRouter.ts         # OpenRouter API integration
│   │   ├── rateLimiter.ts        # Token bucket rate limiting
│   │   └── supabaseClient.ts     # Database connection
│   │
│   ├── assets/               # Static assets
│   ├── App.tsx               # Root component with routing
│   ├── main.tsx              # Application entry point
│   ├── index.css             # Global styles
│   └── App.css               # App-specific styles
│
├── supabase/
│   ├── functions/            # Edge Functions (3 files)
│   └── schema.sql            # Database schema (246 lines)
│
├── public/                   # Static public assets
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── tailwind.config.js        # TailwindCSS configuration
└── .env                      # Environment variables
```

### 3.3 Component Relationships

```
                              ┌─────────────┐
                              │   App.tsx   │
                              │  (Routing)  │
                              └──────┬──────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
    ┌──────────────┐         ┌─────────────┐         ┌─────────────────┐
    │  AuthPage    │         │  Dashboard  │         │ResetPasswordPage│
    │  (Login)     │         │   (Main)    │         │                 │
    └──────────────┘         └──────┬──────┘         └─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
  ┌───────────┐              ┌─────────────┐            ┌───────────────┐
  │  Sidebar  │◀─────────────│   Tabs      │            │ DashboardHome │
  │ (Nav+Files)│             │ (Content)   │            │   (Stats)     │
  └───────────┘              └──────┬──────┘            └───────────────┘
                                    │
    ┌─────────┬──────────┬──────────┼──────────┬──────────┬─────────┐
    ▼         ▼          ▼          ▼          ▼          ▼         ▼
┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
│Summary ││Flashcard││ Quiz   ││Diagram ││MindMap ││ Chat   ││Study   │
│Tab     ││Tab      ││Tab     ││Tab     ││Tab     ││Tab     ││Shorts  │
└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘
```

---

## 4. Technology Stack

### 4.1 Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework with hooks |
| **TypeScript** | 5.9.3 | Type safety & developer experience |
| **Vite** | 5.4.11 | Fast build tool & dev server |
| **TailwindCSS** | 4.1.18 | Utility-first CSS framework |
| **Framer Motion** | 12.23.26 | Animation library |
| **Lucide React** | 0.561.0 | Icon library |
| **React Router DOM** | 7.10.1 | Client-side routing |
| **React Markdown** | 10.1.0 | Markdown rendering |
| **Mermaid** | 11.12.2 | Diagram visualization |

### 4.2 Backend Technologies

| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service (BaaS) |
| **PostgreSQL** | Relational database |
| **Supabase Auth** | User authentication |
| **Supabase Storage** | File storage |
| **Edge Functions** | Serverless functions |

### 4.3 AI & External APIs

| Service | Model/API | Purpose |
|---------|-----------|---------|
| **Google Gemini** | gemini-2.0-flash | Primary AI model |
| **OpenRouter** | allenai/molmo-2-8b | Secondary AI (chat fallback) |
| **Hugging Face** | bart-large-cnn, Llama-3.2-3B | Tertiary fallback |
| **YouTube Data API** | v3 | Video search & metadata |

### 4.4 Document Processing

| Library | Version | Purpose |
|---------|---------|---------|
| **pdfjs-dist** | 5.4.449 | PDF text extraction |
| **mammoth** | 1.11.0 | DOCX to text conversion |

### 4.5 Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.39.1 | Code linting |
| **PostCSS** | 8.5.6 | CSS processing |
| **Autoprefixer** | 10.4.23 | CSS vendor prefixes |

---

## 5. Component Specifications

### 5.1 Core Components

#### 5.1.1 App.tsx (Entry Point)
- **Purpose**: Application root with routing and auth state management
- **Lines**: 56
- **Key Features**:
  - Session management via Supabase Auth
  - Theme initialization (dark/light mode)
  - Route configuration (/, /auth, /reset-password)

```typescript
// Key Routes
<Routes>
  <Route path="/auth" element={session ? <Navigate to="/" /> : <AuthPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to="/auth" />} />
</Routes>
```

#### 5.1.2 Dashboard.tsx (Main Layout)
- **Purpose**: Primary authenticated user interface
- **Lines**: 258
- **Key Features**:
  - Tab navigation system
  - Document context management
  - Summary generation coordination
  - User session handling

```typescript
interface DashboardProps {
  session: Session;
}

// Tab Types
type Tab = 'home' | 'summary' | 'flashcards' | 'quizzes' | 'diagrams' | 
           'mindmap' | 'chat' | 'studyshorts' | 'history' | 'settings';
```

#### 5.1.3 Sidebar.tsx (Navigation)
- **Purpose**: Document list and navigation
- **Lines**: ~300
- **Key Features**:
  - File upload interface
  - Document list display
  - Tab navigation buttons
  - File selection/deletion

### 5.2 Feature Components

#### 5.2.1 SummaryTab.tsx
- **Purpose**: AI-generated document summaries
- **Lines**: ~300
- **Features**:
  - Markdown rendering with key term highlighting
  - Customizable summary options (length, style, focus)
  - Regeneration capability

#### 5.2.2 FlashcardsTab.tsx
- **Purpose**: Flashcard generation and review
- **Lines**: 116
- **Features**:
  - Animated flip cards (Framer Motion)
  - Question/Answer format
  - Clear and regenerate controls

#### 5.2.3 QuizzesTab.tsx
- **Purpose**: Multiple-choice quiz generation
- **Lines**: 246
- **Features**:
  - Quiz generation from documents
  - Answer tracking with explanations
  - Score calculation
  - Database persistence

#### 5.2.4 DiagramsTab.tsx
- **Purpose**: Mermaid.js diagram generation
- **Lines**: ~500
- **Features**:
  - Flowchart generation from content
  - SVG rendering
  - Image export capability

#### 5.2.5 MindMapTab.tsx
- **Purpose**: Hierarchical mind map visualization
- **Lines**: ~700
- **Features**:
  - Interactive node expansion
  - Topic-based color coding
  - Explanation panel

#### 5.2.6 ChatTab.tsx
- **Purpose**: AI chat assistant
- **Lines**: ~200
- **Features**:
  - Context-aware responses
  - Message history
  - Real-time UI updates

#### 5.2.7 StudyShortsTab.tsx
- **Purpose**: YouTube video recommendations
- **Lines**: ~400
- **Features**:
  - Topic-based video search
  - Relevance scoring
  - Embedded video player
  - Infinite scroll pagination

---

## 6. Data Layer

### 6.1 Database Schema Overview

The application uses PostgreSQL via Supabase with 12 tables:

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐       ┌──────────────┐                      │
│   │   profiles   │       │  documents   │                      │
│   │  (users)     │◀──────│  (files)     │                      │
│   └──────────────┘       └──────┬───────┘                      │
│          │                      │                               │
│          │               ┌──────┴───────┐                      │
│          │               │              │                      │
│          ▼               ▼              ▼                      │
│   ┌──────────────┐  ┌──────────┐  ┌──────────┐                │
│   │    chats     │  │flashcards│  │  quizzes │                │
│   └──────┬───────┘  └──────────┘  └──────────┘                │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐  ┌──────────┐  ┌──────────────┐            │
│   │   messages   │  │  videos  │  │activity_history│            │
│   └──────────────┘  └──────────┘  └──────────────┘            │
│                                                                 │
│   ┌──────────────┐  ┌───────────────┐  ┌──────────────┐       │
│   │channel_trust │  │verified_videos│  │  summaries   │       │
│   └──────────────┘  └───────────────┘  └──────────────┘       │
│                                                                 │
│   ┌──────────────────────┐                                     │
│   │  document_chunks     │  (RAG support)                      │
│   └──────────────────────┘                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Table Specifications

#### 6.2.1 profiles
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  daily_requests_count INT DEFAULT 0,
  last_request_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.2.2 documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,      -- 'pdf', 'docx', 'txt', 'md'
  file_path TEXT,               -- Storage bucket path
  file_size INT,
  content TEXT,                 -- Full extracted text
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.2.3 document_chunks (RAG Support)
```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),        -- Gemini embedding dimension
  chunk_index INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### 6.2.4 chats & messages
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.2.5 flashcards
```sql
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_id UUID REFERENCES documents(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  status TEXT DEFAULT 'new',    -- 'new', 'learning', 'mastered'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.2.6 quizzes
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_id UUID REFERENCES documents(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  answered BOOLEAN DEFAULT FALSE,
  user_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.2.7 videos (Study Shorts)
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_id UUID REFERENCES documents(id),
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.2.8 activity_history
```sql
CREATE TABLE activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  activity_type TEXT NOT NULL,  -- 'summary', 'flashcard', 'quiz', etc.
  title TEXT,
  content_preview TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 Row Level Security (RLS)

All tables implement Row Level Security to ensure users can only access their own data:

```sql
-- Example RLS Policy
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can crud own documents" ON documents 
  FOR ALL USING (auth.uid() = user_id);
```

### 6.4 Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `documents` | Uploaded PDF/DOCX files | No |
| `videos` | Video thumbnails (optional) | No |

---

## 7. AI Services

### 7.1 Multi-Model Architecture

The application implements a sophisticated multi-model AI system with automatic fallbacks:

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI SERVICE FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐                                              │
│   │   Request   │                                              │
│   └──────┬──────┘                                              │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────┐    ┌─────────────┐                          │
│   │ Rate Limit  │───▶│  Sanitize   │                          │
│   │   Check     │    │   Input     │                          │
│   └──────┬──────┘    └──────┬──────┘                          │
│          │                  │                                   │
│          └────────┬─────────┘                                  │
│                   ▼                                             │
│   ┌───────────────────────────────────────────────────────┐   │
│   │                GEMINI API (Primary)                    │   │
│   │   Models: gemini-2.0-flash-lite, gemini-2.0-flash,    │   │
│   │           gemini-1.5-flash                             │   │
│   └───────────────────────────┬───────────────────────────┘   │
│                               │                                 │
│              ┌────────────────┼────────────────┐               │
│              │ Success        │ Failure        │               │
│              ▼                ▼                ▼               │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│   │   Response   │   │  OpenRouter  │   │ Hugging Face │     │
│   │              │   │  (molmo-2-8b)│   │  (Fallback)  │     │
│   └──────────────┘   └──────────────┘   └──────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Service Files

#### 7.2.1 aiService.ts (Main Orchestrator)
- **Lines**: 651
- **Purpose**: Central AI logic with multi-model support
- **Key Functions**:

| Function | Purpose | Returns |
|----------|---------|---------|
| `sanitizeInput()` | Security input sanitization | `string` |
| `callGeminiWithFallback()` | Gemini API with auto-fallback | `Promise<string>` |
| `callOpenRouter()` | OpenRouter API integration | `Promise<string \| null>` |
| `callHuggingFace()` | Hugging Face fallback | `Promise<string>` |
| `generateSummary()` | Document summarization | `Promise<string>` |
| `generateFlashcards()` | Flashcard generation | `Promise<Array<{question, answer}>>` |
| `generateQuizzes()` | Quiz generation | `Promise<Array<Quiz>>` |
| `generateDiagram()` | Mermaid diagram generation | `Promise<string>` |
| `generateMindMap()` | Mind map structure | `Promise<{title, children}>` |
| `chatWithAI()` | Context-aware chat | `Promise<string>` |
| `generateVideos()` | YouTube video search | `Promise<{result, nextPageToken}>` |

#### 7.2.2 gemini.ts (Direct Gemini Client)
- **Lines**: 110
- **Purpose**: Simplified direct Gemini API calls
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

#### 7.2.3 rateLimiter.ts (Token Bucket)
- **Lines**: 131
- **Purpose**: Prevent API quota exhaustion
- **Implementation**: Token bucket algorithm

```typescript
// Rate Limits per Feature
const RATE_LIMITS = {
  summary: { maxTokens: 10, refillRate: 10/60 },     // 10/min
  flashcards: { maxTokens: 8, refillRate: 8/60 },    // 8/min
  quizzes: { maxTokens: 8, refillRate: 8/60 },       // 8/min
  diagrams: { maxTokens: 5, refillRate: 5/60 },      // 5/min
  mindmap: { maxTokens: 5, refillRate: 5/60 },       // 5/min
  chat: { maxTokens: 15, refillRate: 15/60 },        // 15/min
  videos: { maxTokens: 10, refillRate: 10/60 },      // 10/min
};
```

### 7.3 AI Prompts

#### Summary Generation
```
Summarize this text concisely for a student. Use **bold** for key terms 
and important concepts. Include bullet points for key highlights.
```

#### Flashcard Generation
```
Generate 5 study flashcards as a JSON array. 
Format: [{"question": "...", "answer": "..."}]. No markdown.
```

#### Quiz Generation
```
Generate 5 multiple choice questions as JSON array.
Format: [{"question": "...", "options": [...], "correct_answer": "A", "explanation": "..."}]
```

#### Diagram Generation
```
Create a Mermaid.js flowchart diagram. Output ONLY valid Mermaid syntax.
Use flowchart TD (top-down) style.
```

#### Mind Map Generation
```
Create a mind map structure as JSON.
Format: {"title": "Main Topic", "children": [{"title": "Subtopic", "children": [...]}]}
Max 3 levels deep.
```

---

## 8. Security & Authentication

### 8.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                                             │
│   │   AuthPage   │                                             │
│   │(Login/Signup)│                                             │
│   └──────┬───────┘                                             │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐         ┌──────────────┐                   │
│   │   Supabase   │────────▶│   Session    │                   │
│   │     Auth     │         │   Created    │                   │
│   └──────────────┘         └──────┬───────┘                   │
│                                   │                             │
│          ┌────────────────────────┼────────────────────────┐   │
│          │                        │                        │   │
│          ▼                        ▼                        ▼   │
│   ┌──────────────┐         ┌──────────────┐         ┌────────┐│
│   │   Profile    │         │   Redirect   │         │  JWT   ││
│   │   Created    │         │ to Dashboard │         │ Token  ││
│   └──────────────┘         └──────────────┘         └────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Security Features

| Feature | Implementation |
|---------|----------------|
| **Authentication** | Supabase Auth (email/password) |
| **Session Management** | JWT tokens with auto-refresh |
| **Row Level Security** | All tables have RLS policies |
| **Input Sanitization** | `sanitizeInput()` function |
| **API Key Protection** | Environment variables |
| **Password Reset** | Email-based reset flow |

### 8.3 Environment Variables

```bash
# Required
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# Optional
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_OPENROUTER_API_KEY=your_openrouter_key
VITE_HUGGINGFACE_API_KEY=your_hf_key
```

---

## 9. API Reference

### 9.1 Custom Hooks

#### useFiles
```typescript
function useFiles(user: User): {
  files: Document[];
  isParsing: boolean;
  uploadFile: (file: File) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
}
```

#### useChat
```typescript
function useChat(user: User): {
  messages: Message[];
  sendMessage: (content: string, context: string) => Promise<void>;
  isLoading: boolean;
}
```

#### useFlashcards
```typescript
function useFlashcards(userId: string): {
  flashcards: Flashcard[];
  isLoading: boolean;
  generateFlashcards: (context: string) => Promise<void>;
  clearFlashcards: () => Promise<void>;
}
```

#### useStudyShorts
```typescript
function useStudyShorts(): {
  videos: Video[];
  isLoading: boolean;
  searchVideos: (topic: string) => Promise<void>;
  loadMore: () => Promise<void>;
}
```

### 9.2 Service Functions

#### File Parser
```typescript
function parseFile(file: File): Promise<string>
function parsePDF(file: File): Promise<string>
function parseDOCX(file: File): Promise<string>
function parseText(file: File): Promise<string>
```

#### AI Services
```typescript
function generateSummary(context: string, options?: SummaryOptions): Promise<string>
function generateFlashcards(context: string): Promise<Flashcard[]>
function generateQuizzes(context: string): Promise<Quiz[]>
function generateDiagram(context: string): Promise<string>
function generateMindMap(context: string): Promise<MindMapNode>
function chatWithAI(context: string, query: string): Promise<string>
function generateVideos(topic: string, pageToken?: string): Promise<VideoResult>
```

#### Rate Limiter
```typescript
class RateLimiter {
  tryConsume(endpoint: string): boolean
  waitForToken(endpoint: string, timeout?: number): Promise<void>
  getStatus(endpoint: string): RateLimitStatus
  reset(endpoint?: string): void
}
```

---

## 10. Deployment Guide

### 10.1 Prerequisites

- Node.js v18 or higher
- npm package manager
- Supabase project
- Google Gemini API key
- (Optional) YouTube Data API key

### 10.2 Installation Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd cherag

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Configure environment variables
# Edit .env with your API keys

# 5. Run development server
npm run dev

# 6. Build for production
npm run build

# 7. Preview production build
npm run preview
```

### 10.3 Database Setup

1. Create a new Supabase project
2. Navigate to SQL Editor
3. Execute `supabase/schema.sql`
4. Configure Storage buckets
5. Set up authentication providers

### 10.4 Build Configuration

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**TypeScript Configuration**:
- Strict mode enabled
- ES2020+ target
- Module bundler resolution

---

## 11. Testing Strategy

### 11.1 Test Categories

| Category | Tools | Coverage |
|----------|-------|----------|
| **Unit Tests** | Vitest (planned) | Services, Utilities |
| **Integration Tests** | Playwright (planned) | API integrations |
| **E2E Tests** | Cypress (planned) | User workflows |
| **Manual Testing** | Browser DevTools | UI/UX validation |

### 11.2 Manual Testing Checklist

- [ ] User registration and login
- [ ] Password reset flow
- [ ] Document upload (PDF, DOCX, TXT, MD)
- [ ] Summary generation
- [ ] Flashcard generation and flip animation
- [ ] Quiz taking and scoring
- [ ] Diagram rendering
- [ ] Mind map interaction
- [ ] Chat functionality
- [ ] Study Shorts video playback
- [ ] Dark/Light theme toggle
- [ ] Responsive design (mobile, tablet, desktop)

---

## 12. Future Enhancements

### 12.1 Planned Features

| Priority | Feature | Description |
|----------|---------|-------------|
| High | Spaced Repetition | SRS algorithm for flashcards |
| High | Export to PDF | Download summaries and flashcards |
| Medium | Collaborative Study | Share documents with peers |
| Medium | Audio Notes | Voice-to-text document input |
| Low | Mobile App | React Native companion app |
| Low | LMS Integration | Canvas, Moodle, Blackboard |

### 12.2 Technical Improvements

- [ ] Implement comprehensive test suite
- [ ] Add real-time collaboration features
- [ ] Optimize AI response caching
- [ ] Implement progressive web app (PWA)
- [ ] Add offline support with service workers
- [ ] Implement RAG (Retrieval Augmented Generation) for better context

---

## Document Information

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Last Updated** | January 2026 |
| **Author** | Generated by AI Assistant |
| **Project Name** | Cherág - AI Study Partner |

---

*This documentation provides a comprehensive overview of the Cherág AI Study Partner application for software engineering purposes. For the most up-to-date information, refer to the source code and inline documentation.*
