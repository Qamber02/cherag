/**
 * useFiles Hook
 * Document management - upload, delete, fetch
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { Document } from '../types/index';

interface UseFilesState {
    files: Document[];
    isLoading: boolean;
    isParsing: boolean;
    error: string | null;
    selectedFile: Document | null;
}

export function useFiles(userId: string | undefined) {
    const [state, setState] = useState<UseFilesState>({
        files: [],
        isLoading: false,
        isParsing: false,
        error: null,
        selectedFile: null,
    });

    // Fetch user's documents
    const fetchFiles = useCallback(async () => {
        if (!userId) return;

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setState((prev) => ({
                ...prev,
                files: data || [],
                isLoading: false,
            }));
        } catch (error: any) {
            console.error('[Files] Fetch error:', error);
            setState((prev) => ({
                ...prev,
                error: error.message || 'Failed to fetch files',
                isLoading: false,
            }));
        }
    }, [userId]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Parse file content
    const parseFile = async (uri: string, name: string): Promise<string> => {
        const extension = name.split('.').pop()?.toLowerCase() || '';

        // For text-based files
        if (['txt', 'md'].includes(extension)) {
            const content = await FileSystem.readAsStringAsync(uri);
            return content;
        }

        // For PDF and DOCX, we'll send to server or use limited parsing
        // Note: Full PDF/DOCX parsing requires native modules or server-side processing
        if (extension === 'pdf' || extension === 'docx') {
            // For now, return a placeholder - in production, you'd want server-side parsing
            return `[Content from ${name}]\n\nNote: Full PDF/DOCX parsing on mobile requires the file to be processed by the server.`;
        }

        throw new Error(`Unsupported file type: ${extension}`);
    };

    // Upload a document
    const uploadFile = useCallback(async () => {
        if (!userId) return null;

        setState((prev) => ({ ...prev, isParsing: true, error: null }));

        try {
            // Pick document
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain',
                    'text/markdown',
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                setState((prev) => ({ ...prev, isParsing: false }));
                return null;
            }

            const file = result.assets[0];

            // Validate file size (10MB max)
            if (file.size && file.size > 10 * 1024 * 1024) {
                throw new Error('File too large. Maximum size is 10MB.');
            }

            // Parse content
            const content = await parseFile(file.uri, file.name);

            // Save to database
            const { data: doc, error: dbError } = await supabase
                .from('documents')
                .insert({
                    user_id: userId,
                    filename: file.name,
                    file_type: file.name.split('.').pop() || 'txt',
                    file_size: file.size,
                    content: content,
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // Update state
            setState((prev) => ({
                ...prev,
                files: [doc, ...prev.files],
                selectedFile: doc,
                isParsing: false,
            }));

            return doc;
        } catch (error: any) {
            console.error('[Files] Upload error:', error);
            setState((prev) => ({
                ...prev,
                error: error.message || 'Failed to upload file',
                isParsing: false,
            }));
            return null;
        }
    }, [userId]);

    // Delete a document
    const deleteFile = useCallback(
        async (id: string) => {
            if (!userId) return;

            // Optimistic update
            const previousFiles = state.files;
            setState((prev) => ({
                ...prev,
                files: prev.files.filter((f) => f.id !== id),
                selectedFile: prev.selectedFile?.id === id ? null : prev.selectedFile,
            }));

            try {
                const { error } = await supabase.from('documents').delete().eq('id', id);

                if (error) throw error;
            } catch (error: any) {
                console.error('[Files] Delete error:', error);
                // Revert on error
                setState((prev) => ({
                    ...prev,
                    files: previousFiles,
                    error: error.message || 'Failed to delete file',
                }));
            }
        },
        [userId, state.files]
    );

    // Select a file
    const selectFile = useCallback((file: Document | null) => {
        setState((prev) => ({ ...prev, selectedFile: file }));
    }, []);

    // Get combined content from all files
    const getContext = useCallback(() => {
        return state.files.map((f) => f.content).join('\n\n');
    }, [state.files]);

    // Get selected file content
    const getSelectedContext = useCallback(() => {
        return state.selectedFile?.content || '';
    }, [state.selectedFile]);

    return {
        ...state,
        fetchFiles,
        uploadFile,
        deleteFile,
        selectFile,
        getContext,
        getSelectedContext,
        hasFiles: state.files.length > 0,
        hasContext: state.selectedFile !== null || state.files.length > 0,
    };
}

export default useFiles;
