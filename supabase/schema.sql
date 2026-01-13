-- Enable necessary extensions
create extension if not exists "vector" with schema extensions;
create extension if not exists "uuid-ossp";

-- CLEANUP: Drop existing tables to allow clean reset
drop table if exists videos cascade;
drop table if exists flashcards cascade;
drop table if exists messages cascade;
drop table if exists chats cascade;
drop table if exists document_chunks cascade;
drop table if exists documents cascade;
drop table if exists profiles cascade;

-- 1. PROFILES (User settings & limits)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  daily_requests_count int default 0,
  last_request_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. DOCUMENTS (Uploaded files metadata)
create table documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  file_type text not null, -- 'pdf', 'docx', 'txt', 'md'
  file_path text, -- Path in Storage Bucket
  file_size int,
  content text, -- Storing full text for client-side context reconstruction
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. DOCUMENT CHUNKS (For RAG)
create table document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  content text not null,
  embedding vector(768), -- Gemini embedding dimension (usually 768 or 1536, checking needed)
  chunk_index int,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
-- Index for vector search
create index on document_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. CHAT SESSIONS
create table chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'New Chat',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. CHAT MESSAGES
create table messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. FLASHCARDS
create table flashcards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references documents(id) on delete set null,
  front text not null,
  back text not null,
  status text default 'new', -- 'new', 'learning', 'mastered'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. VIDEOS (Study Shorts - YouTube Links)
create table videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references documents(id) on delete set null,
  youtube_id text not null,
  title text not null,
  description text,
  thumbnail_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. CHANNEL TRUST (Track reliable educational channels)
create table channel_trust (
  channel_id text primary key,
  channel_name text not null,
  trust_score float default 0.5 check (trust_score >= 0 and trust_score <= 1),
  videos_verified int default 0,
  videos_rejected int default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. VERIFIED VIDEOS CACHE (Avoid re-verifying known good videos)
create table verified_videos (
  id uuid default gen_random_uuid() primary key,
  video_id text unique not null,
  topic text not null,
  relevance_score int check (relevance_score >= 0 and relevance_score <= 100),
  semantic_score float check (semantic_score >= 0 and semantic_score <= 1),
  channel_id text references channel_trust(channel_id) on delete set null,
  title text,
  thumbnail_url text,
  verification_timestamp timestamp with time zone default timezone('utc'::text, now()),
  embedding vector(768) -- For semantic search
);

-- Index for topic-based lookups
create index idx_verified_videos_topic on verified_videos(topic);
-- Index for semantic similarity search
create index on verified_videos using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS POLICIES -----------------------------------------

-- Profiles
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Documents
alter table documents enable row level security;
create policy "Users can crud own documents" on documents for all using (auth.uid() = user_id);

-- Document Chunks
alter table document_chunks enable row level security;
create policy "Users can view own chunks" on document_chunks for select using (
  exists (select 1 from documents where id = document_chunks.document_id and user_id = auth.uid())
);

-- Chats
alter table chats enable row level security;
create policy "Users can crud own chats" on chats for all using (auth.uid() = user_id);

-- Messages
alter table messages enable row level security;
create policy "Users can crud own messages" on messages for all using (
  exists (select 1 from chats where id = messages.chat_id and user_id = auth.uid())
);

-- Flashcards
alter table flashcards enable row level security;
create policy "Users can crud own flashcards" on flashcards for all using (auth.uid() = user_id);

-- Videos
alter table videos enable row level security;
create policy "Users can crud own videos" on videos for all using (auth.uid() = user_id);

-- TRIGGER TO CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('videos', 'videos', false) -- Though we store YouTube links, maybe we need thumbnails?
on conflict (id) do nothing;

-- Storage Policies
drop policy if exists "Users can upload own documents" on storage.objects;
create policy "Users can upload own documents"
on storage.objects for insert
with check ( bucket_id = 'documents' and auth.uid() = owner );

drop policy if exists "Users can view own documents" on storage.objects;
create policy "Users can view own documents"
on storage.objects for select
using ( bucket_id = 'documents' and auth.uid() = owner );

-- ============================================================================
-- 10. QUIZZES (AI-generated multiple choice questions)
-- ============================================================================
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references documents(id) on delete set null,
  question text not null,
  options jsonb not null default '[]', -- ["Option A", "Option B", "Option C", "Option D"]
  correct_answer text not null,
  explanation text,
  difficulty text default 'medium', -- easy, medium, hard
  answered boolean default false,
  user_answer text,
  created_at timestamptz default now()
);

create index if not exists idx_quizzes_user on quizzes(user_id);
create index if not exists idx_quizzes_document on quizzes(document_id);

alter table quizzes enable row level security;
create policy "Users can crud own quizzes" on quizzes for all using (auth.uid() = user_id);

-- ============================================================================
-- 11. ACTIVITY HISTORY (Track all AI generations)
-- ============================================================================
create table if not exists activity_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  activity_type text not null, -- 'summary', 'flashcard', 'quiz', 'chat', 'video'
  title text,
  content_preview text, -- First 200 chars of content
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_history_user on activity_history(user_id);
create index if not exists idx_history_type on activity_history(activity_type);
create index if not exists idx_history_created on activity_history(created_at desc);

alter table activity_history enable row level security;
create policy "Users can crud own history" on activity_history for all using (auth.uid() = user_id);

-- ============================================================================
-- 12. SUMMARIES (Store generated summaries)
-- ============================================================================
create table if not exists summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  document_id uuid references documents(id) on delete set null,
  title text,
  content text not null,
  key_points jsonb default '[]', -- Array of highlighted points
  created_at timestamptz default now()
);

create index if not exists idx_summaries_user on summaries(user_id);

alter table summaries enable row level security;
create policy "Users can crud own summaries" on summaries for all using (auth.uid() = user_id);
