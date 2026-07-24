-- Learning Reels - Premium Feature Database Schema
-- Migration: 20260126_learning_reels.sql
-- Creates 3 new tables for TikTok-style learning feed

-- ============================================
-- VIDEO CLIPS (Extracted learning segments)
-- ============================================
CREATE TABLE IF NOT EXISTS video_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL, -- YouTube video ID
  concept TEXT NOT NULL, -- Main concept taught in this clip
  start_time INT NOT NULL, -- Start timestamp in seconds
  end_time INT NOT NULL, -- End timestamp in seconds
  difficulty INT CHECK (difficulty >= 1 AND difficulty <= 5), -- 1=easiest, 5=hardest
  importance_score INT CHECK (importance_score >= 1 AND importance_score <= 10), -- 1=low, 10=critical
  prerequisites TEXT[] DEFAULT '{}', -- Array of prerequisite concepts
  metadata JSONB DEFAULT '{}', -- Additional data (channel, title, etc.)
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure no duplicate clips for same video segment
  UNIQUE(video_id, start_time, end_time)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_clips_video 
  ON video_clips(video_id);
CREATE INDEX IF NOT EXISTS idx_video_clips_concept 
  ON video_clips(concept);
CREATE INDEX IF NOT EXISTS idx_video_clips_difficulty 
  ON video_clips(difficulty);

-- ============================================
-- CLIP INTERACTIONS (User engagement signals)
-- ============================================
CREATE TABLE IF NOT EXISTS clip_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id UUID NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
  
  -- Engagement metrics
  watch_duration INT DEFAULT 0, -- Seconds watched
  total_duration INT, -- Total clip length for completion %
  replay_count INT DEFAULT 0, -- How many times replayed
  skipped BOOLEAN DEFAULT false, -- Skipped quickly (<3s)
  liked BOOLEAN DEFAULT false, -- User liked this clip
  pause_count INT DEFAULT 0, -- Number of pauses (thinking signal)
  
  -- Spaced repetition
  last_watched TIMESTAMPTZ DEFAULT now(),
  next_review TIMESTAMPTZ, -- When to show again
  review_interval INT DEFAULT 0, -- Days until next review
  
  -- Learning signals
  confusion_score FLOAT DEFAULT 0, -- 0-1, higher = more confused
  mastery_delta FLOAT DEFAULT 0, -- Change in mastery from this interaction
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One interaction record per user per clip
  UNIQUE(user_id, clip_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clip_interactions_user 
  ON clip_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_clip_interactions_clip 
  ON clip_interactions(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_interactions_next_review 
  ON clip_interactions(user_id, next_review) 
  WHERE next_review IS NOT NULL;

-- RLS Policies
ALTER TABLE clip_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions" ON clip_interactions
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own interactions" ON clip_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own interactions" ON clip_interactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions" ON clip_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RECALL QUESTIONS (Micro-recall prompts)
-- ============================================
CREATE TABLE IF NOT EXISTS recall_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
  
  -- Question data
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 4 options ["A", "B", "C", "D"]
  correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT, -- Brief explanation for wrong answers
  
  -- Metadata
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
  question_type TEXT DEFAULT 'conceptual', -- conceptual, application, recall
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- One cached question per clip
  UNIQUE(clip_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_recall_questions_clip 
  ON recall_questions(clip_id);

-- Note: recall_questions is public (no RLS) since they're cached AI generations
-- User-specific answers are tracked in clip_interactions

-- ============================================
-- USER RECALL ATTEMPTS (Track answers)
-- ============================================
CREATE TABLE IF NOT EXISTS recall_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id UUID NOT NULL REFERENCES video_clips(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES recall_questions(id) ON DELETE CASCADE,
  
  -- Attempt data
  selected_index INT CHECK (selected_index >= 0 AND selected_index <= 3),
  is_correct BOOLEAN NOT NULL,
  time_taken_ms INT, -- How long to answer
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recall_attempts_user 
  ON recall_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_recall_attempts_clip 
  ON recall_attempts(user_id, clip_id);

-- RLS Policies
ALTER TABLE recall_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts" ON recall_attempts
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own attempts" ON recall_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Trigger for updated_at on clip_interactions
-- ============================================
CREATE TRIGGER clip_interactions_updated_at
  BEFORE UPDATE ON clip_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Helper function: Calculate completion percentage
-- ============================================
CREATE OR REPLACE FUNCTION calculate_watch_completion(
  watched INT,
  total INT
) RETURNS FLOAT AS $$
BEGIN
  IF total = 0 THEN
    RETURN 0;
  END IF;
  RETURN LEAST(1.0, watched::FLOAT / total::FLOAT);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
