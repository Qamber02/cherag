-- Create Activity History Table
-- Fixes missing history tracking in dashboard

CREATE TABLE IF NOT EXISTS activity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'summary', 'flashcard', 'quiz', 'mindmap', 'chat', 'video'
    title TEXT DEFAULT 'Untitled Activity',
    content_preview TEXT,
    content_full TEXT, -- Store full content (e.g. summary text)
    metadata JSONB DEFAULT '{}', -- Store extra data (e.g. quiz score, video ID)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_history_user_created 
  ON activity_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_history_type 
  ON activity_history(user_id, activity_type);

-- RLS Policies
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON activity_history
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own history" ON activity_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own history" ON activity_history
  FOR DELETE USING (auth.uid() = user_id);
