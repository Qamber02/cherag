import { useQuery, useMutation, useQueryClient, type Query } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { processDocument } from '../lib/aiService';
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
    const queryClient = useQueryClient();

    // Query for fetching files
    const {
        data: files = [],
        isLoading,
        error: queryError
    } = useQuery({
        queryKey: ['files', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('documents')
                .select('*, processing_status, processing_progress')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Document[];
        },
        enabled: !!user,
        // Poll every 2 seconds if any file is processing or pending
        refetchInterval: (query: Query<Document[], Error, Document[], readonly unknown[]>) => {
            const data = query.state.data;
            const hasProcessing = data?.some((f: Document) =>
                f.processing_status === 'processing' || f.processing_status === 'pending'
            );
            return hasProcessing ? 2000 : false;
        }
    });

    const isParsing = files.some((f: Document) => f.processing_status === 'processing' || f.processing_status === 'pending');

    // Mutation for uploading files
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!user) throw new Error("No user");

            // Validation
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_SIZE) throw new Error("File too large. Maximum size is 10MB.");

            const ALLOWED_TYPES = [
                'application/pdf',
                'text/plain',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                'text/markdown'
            ];
            const ext = file.name.split('.').pop()?.toLowerCase();
            const allowedExts = ['pdf', 'txt', 'docx', 'md'];

            if (!ALLOWED_TYPES.includes(file.type) && !allowedExts.includes(ext || '')) {
                throw new Error("Invalid file type. Allowed: PDF, DOCX, TXT, MD");
            }

            const filePath = `${user.id}/${Date.now()}_${file.name}`;

            // 1. Create DB Record
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

            if (dbError) throw dbError;

            // 2. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 3. Get signed URL
            const { data: urlData, error: urlError } = await supabase.storage
                .from('documents')
                .createSignedUrl(filePath, 3600);

            if (urlError || !urlData?.signedUrl) throw new Error('Failed to create signed URL');

            // 4. Trigger backend processing
            processDocument(doc.id, urlData.signedUrl).catch(err => console.error("Processing trigger failed", err));

            return doc;
        },
        onSuccess: (newDoc: Document) => {
            queryClient.invalidateQueries({ queryKey: ['files', user?.id] });
            queryClient.setQueryData(['files', user?.id], (old: Document[] | undefined) => {
                return old ? [newDoc, ...old] : [newDoc];
            });
        }
    });

    // Mutation for removing files
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('documents').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: (id: string) => {
            queryClient.setQueryData(['files', user?.id], (old: Document[] | undefined) => {
                return old ? old.filter((f: Document) => f.id !== id) : [];
            });
        }
    });

    return {
        files,
        isParsing,
        processingProgress: 0,
        error: (queryError as Error)?.message || (uploadMutation.error as Error)?.message || null,
        isLoading,
        uploadFile: (file: File) => uploadMutation.mutateAsync(file),
        removeFile: (id: string) => deleteMutation.mutateAsync(id),
        refreshFiles: () => queryClient.invalidateQueries({ queryKey: ['files', user?.id] })
    };
}
