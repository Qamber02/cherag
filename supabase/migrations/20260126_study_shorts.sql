-- Study Shorts Table Migration
-- This table stores user's saved study shorts for Learning Reels

CREATE TABLE IF NOT EXISTS study_shorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    youtube_id TEXT NOT NULL,
    title TEXT,
    thumbnail TEXT,
    channel TEXT,
    relevance_score NUMERIC,
    duration TEXT DEFAULT '1:00',
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicates per user
    UNIQUE(user_id, youtube_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_study_shorts_user 
ON study_shorts(user_id);

-- Index for recent videos
CREATE INDEX IF NOT EXISTS idx_study_shorts_created 
ON study_shorts(created_at DESC);

-- Enable RLS
ALTER TABLE study_shorts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own study shorts"
ON study_shorts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study shorts"
ON study_shorts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study shorts"
ON study_shorts FOR DELETE
USING (auth.uid() = user_id);
