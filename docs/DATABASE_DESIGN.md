# Cherág - Database Design Document

## Overview

This document describes the complete database design for the Cherág AI Study Partner application, including entity-relationship diagrams, table specifications, and data flow patterns.

---

## 1. Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            ENTITY-RELATIONSHIP DIAGRAM                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│                              ┌────────────────┐                                    │
│                              │   auth.users   │                                    │
│                              │  (Supabase)    │                                    │
│                              └───────┬────────┘                                    │
│                                      │                                              │
│                                      │ 1:1                                          │
│                                      ▼                                              │
│                              ┌────────────────┐                                    │
│                              │    profiles    │                                    │
│                              └───────┬────────┘                                    │
│                                      │                                              │
│           ┌──────────────────────────┼──────────────────────────┐                  │
│           │                          │                          │                  │
│           │ 1:N                      │ 1:N                      │ 1:N             │
│           ▼                          ▼                          ▼                  │
│   ┌───────────────┐          ┌───────────────┐          ┌───────────────┐         │
│   │   documents   │          │     chats     │          │activity_history│         │
│   └───────┬───────┘          └───────┬───────┘          └───────────────┘         │
│           │                          │                                              │
│   ┌───────┼────────────────┐         │ 1:N                                         │
│   │       │                │         ▼                                              │
│   │       │ 1:N            │ 1:N  ┌───────────────┐                                │
│   │       ▼                ▼      │   messages    │                                │
│   │ ┌───────────┐  ┌───────────┐  └───────────────┘                                │
│   │ │flashcards │  │ summaries │                                                    │
│   │ └───────────┘  └───────────┘                                                    │
│   │                                                                                 │
│   │ 1:N           1:N           1:N                                                │
│   ▼               ▼             ▼                                                   │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                                          │
│ │  quizzes  │ │  videos   │ │ doc_chunks│                                          │
│ └───────────┘ └───────────┘ └───────────┘                                          │
│                                                                                     │
│           ┌────────────────────────────────────────┐                               │
│           │          Standalone Tables              │                               │
│           │  ┌───────────────┐  ┌────────────────┐ │                               │
│           │  │ channel_trust │  │verified_videos │ │                               │
│           │  └───────────────┘  └────────────────┘ │                               │
│           └────────────────────────────────────────┘                               │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Table Specifications

### 2.1 profiles

**Purpose**: Stores user profile data and usage limits.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | - | Primary key, references auth.users |
| email | TEXT | Yes | - | User's email address |
| daily_requests_count | INT | Yes | 0 | Daily API request counter |
| last_request_time | TIMESTAMPTZ | Yes | - | Last API request timestamp |
| created_at | TIMESTAMPTZ | Yes | NOW() | Account creation time |

**Indexes**: Primary key on `id`

**RLS Policies**:
- SELECT: `auth.uid() = id`
- UPDATE: `auth.uid() = id`

---

### 2.2 documents

**Purpose**: Stores uploaded document metadata and content.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | Foreign key to auth.users |
| filename | TEXT | No | - | Original file name |
| file_type | TEXT | No | - | File extension (pdf, docx, txt, md) |
| file_path | TEXT | Yes | - | Storage bucket path |
| file_size | INT | Yes | - | File size in bytes |
| content | TEXT | Yes | - | Extracted text content |
| created_at | TIMESTAMPTZ | Yes | NOW() | Upload timestamp |

**Indexes**: Primary key on `id`

**RLS Policies**:
- ALL: `auth.uid() = user_id`

---

### 2.3 document_chunks

**Purpose**: Stores document chunks with embeddings for RAG (Retrieval Augmented Generation).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| document_id | UUID | No | - | Foreign key to documents |
| content | TEXT | No | - | Chunk content |
| embedding | VECTOR(768) | Yes | - | Gemini embedding vector |
| chunk_index | INT | Yes | - | Position in document |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Indexes**:
- Primary key on `id`
- IVFFlat index on `embedding` for vector search

---

### 2.4 chats

**Purpose**: Stores chat session metadata.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | Foreign key to auth.users |
| title | TEXT | Yes | 'New Chat' | Chat session title |
| created_at | TIMESTAMPTZ | Yes | NOW() | Session creation time |

---

### 2.5 messages

**Purpose**: Stores individual chat messages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| chat_id | UUID | No | - | Foreign key to chats |
| role | TEXT | No | - | 'user' or 'assistant' |
| content | TEXT | No | - | Message content |
| created_at | TIMESTAMPTZ | Yes | NOW() | Message timestamp |

**Constraints**: `role IN ('user', 'assistant')`

---

### 2.6 flashcards

**Purpose**: Stores AI-generated flashcards.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | Foreign key to auth.users |
| document_id | UUID | Yes | - | Foreign key to documents |
| front | TEXT | No | - | Question/prompt |
| back | TEXT | No | - | Answer |
| status | TEXT | Yes | 'new' | Learning status |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Status Values**: `'new'`, `'learning'`, `'mastered'`

---

### 2.7 quizzes

**Purpose**: Stores AI-generated multiple-choice questions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | Foreign key to auth.users |
| document_id | UUID | Yes | - | Foreign key to documents |
| question | TEXT | No | - | Question text |
| options | JSONB | No | '[]' | Answer options array |
| correct_answer | TEXT | No | - | Correct option letter |
| explanation | TEXT | Yes | - | Answer explanation |
| difficulty | TEXT | Yes | 'medium' | Difficulty level |
| answered | BOOLEAN | Yes | FALSE | User has answered |
| user_answer | TEXT | Yes | - | User's selected answer |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Indexes**:
- `idx_quizzes_user` on `user_id`
- `idx_quizzes_document` on `document_id`

---

### 2.8 videos

**Purpose**: Stores YouTube video recommendations (Study Shorts).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | Foreign key to auth.users |
| document_id | UUID | Yes | - | Foreign key to documents |
| youtube_id | TEXT | No | - | YouTube video ID |
| title | TEXT | No | - | Video title |
| description | TEXT | Yes | - | Video description |
| thumbnail_url | TEXT | Yes | - | Thumbnail URL |
| created_at | TIMESTAMPTZ | Yes | NOW() | Save timestamp |

---

### 2.9 activity_history

**Purpose**: Logs all AI generation activities for history tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | Foreign key to auth.users |
| activity_type | TEXT | No | - | Type of activity |
| title | TEXT | Yes | - | Activity title |
| content_preview | TEXT | Yes | - | First 200 chars |
| metadata | JSONB | Yes | '{}' | Additional data |
| created_at | TIMESTAMPTZ | Yes | NOW() | Activity timestamp |

**Activity Types**: `'summary'`, `'flashcard'`, `'quiz'`, `'diagram'`, `'mindmap'`, `'chat'`, `'video'`

**Indexes**:
- `idx_history_user` on `user_id`
- `idx_history_type` on `activity_type`
- `idx_history_created` on `created_at DESC`

---

### 2.10 summaries

**Purpose**: Stores generated document summaries.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | Foreign key to auth.users |
| document_id | UUID | Yes | - | Foreign key to documents |
| title | TEXT | Yes | - | Summary title |
| content | TEXT | No | - | Summary content |
| key_points | JSONB | Yes | '[]' | Highlighted points |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

---

### 2.11 channel_trust

**Purpose**: Tracks reliability of YouTube educational channels.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| channel_id | TEXT | No | - | Primary key |
| channel_name | TEXT | No | - | Channel display name |
| trust_score | FLOAT | Yes | 0.5 | Reliability score (0-1) |
| videos_verified | INT | Yes | 0 | Count of verified videos |
| videos_rejected | INT | Yes | 0 | Count of rejected videos |
| updated_at | TIMESTAMPTZ | Yes | NOW() | Last update time |

**Constraints**: `trust_score >= 0 AND trust_score <= 1`

---

### 2.12 verified_videos

**Purpose**: Caches verified educational videos to avoid re-verification.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| video_id | TEXT | No | - | YouTube video ID (unique) |
| topic | TEXT | No | - | Associated topic |
| relevance_score | INT | Yes | - | Topic relevance (0-100) |
| semantic_score | FLOAT | Yes | - | Semantic match (0-1) |
| channel_id | TEXT | Yes | - | FK to channel_trust |
| title | TEXT | Yes | - | Video title |
| thumbnail_url | TEXT | Yes | - | Thumbnail URL |
| verification_timestamp | TIMESTAMPTZ | Yes | NOW() | Verification time |
| embedding | VECTOR(768) | Yes | - | Semantic embedding |

**Indexes**:
- `idx_verified_videos_topic` on `topic`
- IVFFlat index on `embedding` for semantic search

---

## 3. Row Level Security (RLS)

All user-data tables have RLS enabled to ensure data isolation:

```sql
-- Example: documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can crud own documents" 
  ON documents FOR ALL 
  USING (auth.uid() = user_id);

-- Example: messages (through chats relationship)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can crud own messages" 
  ON messages FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE id = messages.chat_id 
      AND user_id = auth.uid()
    )
  );
```

### RLS Summary

| Table | Policy | Condition |
|-------|--------|-----------|
| profiles | Own profile only | `auth.uid() = id` |
| documents | Own documents | `auth.uid() = user_id` |
| document_chunks | Via documents | `document FK check` |
| chats | Own chats | `auth.uid() = user_id` |
| messages | Via chats | `chat FK check` |
| flashcards | Own flashcards | `auth.uid() = user_id` |
| quizzes | Own quizzes | `auth.uid() = user_id` |
| videos | Own videos | `auth.uid() = user_id` |
| activity_history | Own history | `auth.uid() = user_id` |
| summaries | Own summaries | `auth.uid() = user_id` |

---

## 4. Triggers and Functions

### 4.1 Auto-Create Profile on Signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 5. Storage Configuration

### 5.1 Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| documents | User uploaded files | No |
| videos | Video thumbnails | No |

### 5.2 Storage Policies

```sql
-- Upload policy
CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid() = owner);

-- View policy
CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid() = owner);
```

---

## 6. Data Flow Patterns

### 6.1 Document Upload Flow

```
User Upload → parseFile() → documents table → RAG Processing → document_chunks
```

### 6.2 AI Generation Flow

```
Request → Rate Limiter → AI Service → Response → activity_history
                                         ↓
                              [flashcards|quizzes|summaries]
```

### 6.3 Chat Flow

```
User Message → chats table → messages table → AI Service → messages table
```

---

## 7. Extensions

### Required PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

- **vector**: Enables pgvector for embedding storage and similarity search
- **uuid-ossp**: Generates UUIDs for primary keys

---

## 8. Migration Notes

### Initial Setup

1. Create Supabase project
2. Execute `supabase/schema.sql` in SQL Editor
3. Verify RLS policies are active
4. Configure storage buckets
5. Test auth triggers

### Schema Updates

- Use Supabase Migrations for production changes
- Test RLS policies after any table modifications
- Update indexes for query optimization

---

*This database design document provides the complete schema for the Cherág application. Refer to `schema.sql` for the executable SQL statements.*
