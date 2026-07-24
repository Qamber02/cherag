-- Migration: Add RAG processing columns and similarity search function
-- Run this in Supabase SQL Editor

-- Add processing status columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_progress float DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS error_message text;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);

-- Similarity search function for RAG
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(768),
    doc_id uuid,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.content,
        1 - (dc.embedding <=> query_embedding) as similarity
    FROM document_chunks dc
    WHERE dc.document_id = doc_id
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_similar_chunks TO authenticated;
