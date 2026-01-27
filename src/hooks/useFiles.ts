
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { parseFile } from '../lib/fileParser';
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
            // 1. Parse content locally
            const content = await parseFile(file);

            // 2. Upload to Storage (Optional backup)
            const filePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
            if (uploadError) {
                console.warn('Storage upload failed:', uploadError);
                // Continue even if storage fails, as we store content in DB
            }

            // 3. Insert into DB
            const { data: doc, error: dbError } = await supabase
                .from('documents')
                .insert({
                    user_id: user.id,
                    filename: file.name,
                    file_type: file.name.split('.').pop() || 'txt',
                    file_path: filePath,
                    file_size: file.size,
                    content: content
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // 4. Trigger RAG Processing (Async)
            // Fire and forget to avoid blocking UI, or await if critical
            supabase.functions.invoke('process-document', {
                body: { document_id: doc.id, content: content }
            }).then(({ error: invokeError }) => {
                if (invokeError) console.error('RAG processing error:', invokeError);
            });

            setFiles(prev => [doc, ...prev]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Failed to upload file');
            alert(`Failed to upload file: ${err.message || 'Unknown error'}`);
        } finally {
            setIsParsing(false);
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
