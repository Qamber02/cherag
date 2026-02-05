
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { processDocument, getDocumentStatus } from '../lib/aiService';
import type { User } from '@supabase/supabase-js';

export interface Document {
    id: string;
    filename: string;
    file_type: string;
    content: string;
    created_at: string;
    processing_status?: string;
    processing_progress?: number;
}

export function useFiles(user: User | null) {
    const [files, setFiles] = useState<Document[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchFiles = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('documents')
                .select('*, processing_status, processing_progress')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setFiles(data || []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch files';
            console.error('Error fetching files:', err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Poll for processing status updates
    const pollProcessingStatus = useCallback(async (documentId: string) => {
        const maxAttempts = 600; // 10 minutes max (1s intervals)
        let attempts = 0;

        const poll = async () => {
            try {
                const status = await getDocumentStatus(documentId);
                setProcessingProgress(status.progress);

                if (status.status === 'completed') {
                    setIsParsing(false);
                    setProcessingProgress(100);
                    await fetchFiles(); // Refresh to get updated doc
                    return;
                }

                if (status.status === 'failed') {
                    setIsParsing(false);
                    setError(status.error || 'Processing failed');
                    return;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 1000); // Poll every 1 second
                } else {
                    setIsParsing(false);
                    setError('Processing timed out');
                }
            } catch (err) {
                console.error('Status poll error:', err);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 2000); // Retry with backoff
                }
            }
        };

        poll();
    }, [fetchFiles]);

    const uploadFile = async (file: File) => {
        if (!user) return;
        setIsParsing(true);
        setProcessingProgress(0);
        setError(null);

        console.log('[UPLOAD] Starting upload for:', file.name);

        try {
            // 1. Create DB Record
            console.log('[UPLOAD] Step 1: Creating database record...');
            const filePath = `${user.id}/${Date.now()}_${file.name}`;

            const { data: doc, error: dbError } = await supabase
                .from('documents')
                .insert({
                    user_id: user.id,
                    filename: file.name,
                    file_type: file.name.split('.').pop() || 'txt',
                    file_path: filePath,
                    file_size: file.size,
                    content: '',
                    processing_status: 'pending'
                })
                .select()
                .single();

            if (dbError) {
                console.error('[UPLOAD] Step 1 FAILED - DB Error:', dbError);
                throw dbError;
            }
            console.log('[UPLOAD] Step 1 SUCCESS - Doc ID:', doc.id);

            // 2. Upload to Storage
            console.log('[UPLOAD] Step 2: Uploading to Supabase Storage...');
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) {
                console.error('[UPLOAD] Step 2 FAILED - Storage Error:', uploadError);
                throw uploadError;
            }
            console.log('[UPLOAD] Step 2 SUCCESS - File uploaded to storage');

            // 3. Get signed URL for backend processing
            console.log('[UPLOAD] Step 3: Creating signed URL...');
            const { data: urlData, error: urlError } = await supabase.storage
                .from('documents')
                .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (urlError || !urlData?.signedUrl) {
                console.error('[UPLOAD] Step 3 FAILED - Signed URL Error:', urlError);
                throw new Error('Failed to create signed URL');
            }
            console.log('[UPLOAD] Step 3 SUCCESS - Signed URL created');

            // 4. Trigger server-side processing via FastAPI
            console.log('[UPLOAD] Step 4: Calling backend /process-document...');
            await processDocument(doc.id, urlData.signedUrl);
            console.log('[UPLOAD] Step 4 SUCCESS - Backend processing started');

            // 5. Update local state immediately (show as processing)
            setFiles(prev => [{ ...doc, processing_status: 'processing' }, ...prev]);

            // 6. Start polling for status updates
            console.log('[UPLOAD] Step 5: Starting status polling...');
            pollProcessingStatus(doc.id);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to upload file';
            console.error('[UPLOAD] FAILED at some step:', err);
            setError(message);
            setIsParsing(false);
        }
    };

    const removeFile = async (id: string) => {
        const previousFiles = [...files];
        setFiles(prev => prev.filter(f => f.id !== id));

        try {
            const { error: deleteError } = await supabase.from('documents').delete().eq('id', id);
            if (deleteError) throw deleteError;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete file';
            console.error('Delete error', err);
            setError(message);
            setFiles(previousFiles);
        }
    };

    return {
        files,
        isParsing,
        processingProgress,
        error,
        isLoading,
        uploadFile,
        removeFile,
        refreshFiles: fetchFiles
    };
}
