-- Migration: Fix UUID vs Text mismatch for Clip IDs
-- Date: 2026-01-30
-- Description: Changes clip_id from UUID to TEXT to support direct YouTube video IDs
-- and removes strict foreign key constraints to video_clips to allow flexible linking.

-- 1. Modify clip_interactions table
-- First drop the foreign key constraint that requires UUID
ALTER TABLE clip_interactions 
DROP CONSTRAINT IF EXISTS clip_interactions_clip_id_fkey;

-- Now change the column type to TEXT
ALTER TABLE clip_interactions 
ALTER COLUMN clip_id TYPE TEXT;

-- 2. Modify recall_attempts table
ALTER TABLE recall_attempts 
DROP CONSTRAINT IF EXISTS recall_attempts_clip_id_fkey;

ALTER TABLE recall_attempts 
ALTER COLUMN clip_id TYPE TEXT;

-- 3. Modify recall_questions table (if needed for consistency)
-- If recall questions are linked to raw YouTube IDs, they need this too.
ALTER TABLE recall_questions 
DROP CONSTRAINT IF EXISTS recall_questions_clip_id_fkey;

ALTER TABLE recall_questions 
ALTER COLUMN clip_id TYPE TEXT;

-- 4. Ensure video_clips can also handle text IDs if we want to migrate completely?
-- For now, we leave video_clips.id as UUID, but allow interactions to reference external IDs.
-- This effectively decouples interactions from the strict internal clip registry.
