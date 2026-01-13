
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { parseFile } from '../lib/fileParser';

export interface Document {
    id: string;
    filename: string;
    file_type: string;
    content: string;
    created_at: string;
}

export function useFiles(user: any) {
    const [files, setFiles] = useState<Document[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    useEffect(() => {
        if (user) fetchFiles();
    }, [user]);

    const fetchFiles = async () => {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching files:', error);
        else setFiles(data || []);
    };

    const uploadFile = async (file: File) => {
        setIsParsing(true);
        try {
            // 1. Parse content locally
            const content = await parseFile(file);

            // 2. Upload to Storage (Optional backup)
            const filePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
            if (uploadError) {
                console.warn('Storage upload failed:', uploadError);
                // We might choose to continue or throw. Let's throw for now to see the error.
                throw uploadError;
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
            const { error: invokeError } = await supabase.functions.invoke('process-document', {
                body: { document_id: doc.id, content: content }
            });

            if (invokeError) throw invokeError;

            setFiles(prev => [doc, ...prev]);
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(`Failed to upload file: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsParsing(false);
        }
    };

    const removeFile = async (id: string) => {
        // Optimistic update
        setFiles(prev => prev.filter(f => f.id !== id));

        const { error } = await supabase.from('documents').delete().eq('id', id);
        if (error) {
            console.error('Delete error', error);
            fetchFiles(); // Revert on error
        }
    };

    return { files, isParsing, uploadFile, removeFile };
}
