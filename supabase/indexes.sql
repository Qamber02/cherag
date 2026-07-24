-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Foreign Key Indexes to speed up access by user_id
create index if not exists idx_documents_user on documents(user_id);
create index if not exists idx_chats_user on chats(user_id);
create index if not exists idx_flashcards_user on flashcards(user_id);
create index if not exists idx_videos_user on videos(user_id);
create index if not exists idx_quizzes_user on quizzes(user_id);
create index if not exists idx_summaries_user on summaries(user_id);
create index if not exists idx_history_user on activity_history(user_id);

-- Foreign Key Indexes to speed up relation lookups (e.g. Flashcards for a Document)
create index if not exists idx_flashcards_document on flashcards(document_id);
create index if not exists idx_videos_document on videos(document_id);
create index if not exists idx_quizzes_document on quizzes(document_id);

-- Sorting Indexes
create index if not exists idx_history_created on activity_history(created_at desc);
