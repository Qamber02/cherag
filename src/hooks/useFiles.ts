
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { parseFileStream } from '../lib/fileParser';
import type { User } from '@supabase/supabase-js';

export interface Document {
    id: string;
    filename: string;
    file_type: string;
    content: string;
    created_at: string;
}

export function useFiles(user: User | null) {
    const [files, setFiles] = useState<Document[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchFiles = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id) // Ensure we only get current user's files
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setFiles(data || []);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Error fetching files:', err);
            setError(err.message || 'Failed to fetch files');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const uploadFile = async (file: File) => {
        if (!user) return;
        setIsParsing(true);
        setError(null);
        try {
            // 1. Create DB Record First (Metadata)
            // We store a placeholder content or empty string initially.
            const filePath = `${user.id}/${Date.now()}_${file.name}`;

            const { data: doc, error: dbError } = await supabase
                .from('documents')
                .insert({
                    user_id: user.id,
                    filename: file.name,
                    file_type: file.name.split('.').pop() || 'txt',
                    file_path: filePath,
                    file_size: file.size,
                    content: '' // Will update with preview later
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // 2. Upload to Storage (Backup & Source of Truth)
            // Supabase client handles large TUS uploads automatically
            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
            if (uploadError) {
                console.warn('Storage upload failed:', uploadError);
            }

            // 3. Stream Parse & Process
            // We'll accumulate a preview string (first 20KB)
            let previewContent = '';
            let buffer = '';
            let currentChunkIndex = 0; // Track global chunk index for RAG
            const BATCH_SIZE = 500 * 1024; // 0.5 MB per Edge Function call (safe limit)

            await parseFileStream(file, async (chunk: string, _progress: number) => {
                buffer += chunk;

                // Collect preview
                if (previewContent.length < 20000) {
                    previewContent += chunk.slice(0, 20000 - previewContent.length);
                }

                // If buffer exceeds batch size, send to RAG processing
                if (buffer.length >= BATCH_SIZE) {
                    await processBatch(doc.id, buffer, currentChunkIndex);
                    // Estimate valid sub-chunks created by Edge Function (approx 1 per 1000 chars)
                    currentChunkIndex += Math.ceil(buffer.length / 900);
                    buffer = ''; // Clear buffer
                }
            });

            // Process remaining buffer
            if (buffer.length > 0) {
                await processBatch(doc.id, buffer, currentChunkIndex);
            }

            // 4. Update DB with Preview Content
            await supabase
                .from('documents')
                .update({ content: previewContent })
                .eq('id', doc.id);

            // Update local state (Optimistic: we have the doc with preview)
            setFiles(prev => [{ ...doc, content: previewContent }, ...prev]);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload file');
            alert(`Failed to upload file: ${err.message || 'Unknown error'}`);
        } finally {
            setIsParsing(false);
        }
    };

    const processBatch = async (documentId: string, text: string, startIndex: number) => {
        // Retry logic could be added here
        const { error } = await supabase.functions.invoke('process-document', {
            body: { document_id: documentId, content: text, chunk_offset: startIndex }
        });
        if (error) {
            console.error('RAG batch processing error:', error);
            // Optionally throw to stop processing, or continue best-effort
        }
    };

    const removeFile = async (id: string) => {
        // Optimistic update
        const previousFiles = [...files];
        setFiles(prev => prev.filter(f => f.id !== id));

        try {
            const { error: deleteError } = await supabase.from('documents').delete().eq('id', id);
            if (deleteError) throw deleteError;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Delete error', err);
            setError(err.message || 'Failed to delete file');
            setFiles(previousFiles); // Revert on error
        }
    };

    return { files, isParsing, error, isLoading, uploadFile, removeFile, refreshFiles: fetchFiles };
}
