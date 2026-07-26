-- Migration: 20260726_session_summaries.sql
-- Create session_summaries table for lightweight AI session memory

create table if not exists session_summaries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users not null,
  course_id text not null,
  summary text not null,
  created_at timestamptz default now()
);

alter table session_summaries enable row level security;

create policy "students see own session summaries" on session_summaries
  for select using (auth.uid() = student_id);

create policy "students insert own session summaries" on session_summaries
  for insert with check (auth.uid() = student_id);

create index if not exists idx_session_summaries_student_course on session_summaries(student_id, course_id, created_at desc);
