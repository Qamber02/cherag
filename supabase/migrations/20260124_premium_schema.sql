-- Cherág Premium Database Schema
-- Run this migration to set up premium feature tables

-- ============================================
-- Learning Sessions (Spaced Repetition)
-- ============================================
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0,
  attempts INT DEFAULT 0,
  last_reviewed TIMESTAMPTZ DEFAULT now(),
  next_review TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, concept_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user 
  ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_next_review 
  ON learning_sessions(user_id, next_review);

-- RLS Policies
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON learning_sessions
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own sessions" ON learning_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own sessions" ON learning_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON learning_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Concept Dependencies (Knowledge Graph)
-- ============================================
CREATE TABLE IF NOT EXISTS concept_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  depends_on TEXT[] DEFAULT '{}',
  mastery_level FLOAT DEFAULT 0,
  stress_tested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, concept)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_concept_dependencies_user 
  ON concept_dependencies(user_id);

-- RLS Policies
ALTER TABLE concept_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dependencies" ON concept_dependencies
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own dependencies" ON concept_dependencies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own dependencies" ON concept_dependencies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dependencies" ON concept_dependencies
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Exam Simulations
-- ============================================
CREATE TABLE IF NOT EXISTS exam_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type TEXT,
  score FLOAT,
  time_taken INT, -- seconds
  total_questions INT,
  correct_answers INT,
  weak_areas TEXT[] DEFAULT '{}',
  questions JSONB, -- Store questions and answers
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_simulations_user 
  ON exam_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_simulations_active 
  ON exam_simulations(user_id) 
  WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE exam_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulations" ON exam_simulations
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
  
CREATE POLICY "Users can insert own simulations" ON exam_simulations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own simulations" ON exam_simulations
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Learning DNA Profile
-- ============================================
CREATE TABLE IF NOT EXISTS learning_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  learning_style JSONB, -- {visual, auditory, reading_writing, kinesthetic}
  peak_hours INT[] DEFAULT '{}',
  cognitive_strengths TEXT[] DEFAULT '{}',
  preferred_difficulty TEXT DEFAULT 'medium',
  session_preference TEXT DEFAULT 'moderate',
  retention_pattern TEXT,
  recommendations TEXT[] DEFAULT '{}',
  profile_confidence TEXT DEFAULT 'low', -- low, medium, high
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON learning_profiles
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own profile" ON learning_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own profile" ON learning_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Study Plans (AI Study Agent)
-- ============================================
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  plan_data JSONB NOT NULL, -- Full daily plan
  completed_blocks INT DEFAULT 0,
  total_blocks INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, plan_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_plans_user_date 
  ON study_plans(user_id, plan_date);

-- RLS Policies
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans" ON study_plans
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own plans" ON study_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own plans" ON study_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Living Notes
-- ============================================
CREATE TABLE IF NOT EXISTS living_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INT DEFAULT 1,
  suggestions JSONB DEFAULT '[]',
  last_analyzed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_living_notes_user 
  ON living_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_living_notes_concept 
  ON living_notes(user_id, concept_id);

-- RLS Policies
ALTER TABLE living_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON living_notes
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own notes" ON living_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own notes" ON living_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON living_notes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Teaching Sessions
-- ============================================
CREATE TABLE IF NOT EXISTS teaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  conversation JSONB NOT NULL,
  evaluation JSONB,
  mastery_level TEXT, -- novice, developing, proficient, expert
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teaching_sessions_user 
  ON teaching_sessions(user_id);

-- RLS Policies
ALTER TABLE teaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own teaching sessions" ON teaching_sessions
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own teaching sessions" ON teaching_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Video Learning Progress
-- ============================================
CREATE TABLE IF NOT EXISTS video_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT,
  segments_watched JSONB DEFAULT '[]',
  quiz_scores JSONB DEFAULT '[]',
  last_watched TIMESTAMPTZ DEFAULT now(),
  next_review TIMESTAMPTZ,
  
  UNIQUE(user_id, video_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_learning_user 
  ON video_learning(user_id);
CREATE INDEX IF NOT EXISTS idx_video_learning_review 
  ON video_learning(user_id, next_review);

-- RLS Policies
ALTER TABLE video_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video progress" ON video_learning
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own video progress" ON video_learning
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own video progress" ON video_learning
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER learning_profiles_updated_at
  BEFORE UPDATE ON learning_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER concept_dependencies_updated_at
  BEFORE UPDATE ON concept_dependencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER study_plans_updated_at
  BEFORE UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER living_notes_updated_at
  BEFORE UPDATE ON living_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
