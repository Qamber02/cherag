
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export interface Flashcard {
    id?: string;
    question: string;
    answer: string;
}

export function useFlashcards(user: User | null, context: string) {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) fetchFlashcards();
    }, [user]);

    const fetchFlashcards = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching flashcards:', error);
            return;
        }

        if (data) {
            // Map DB columns (front/back) to UI props (question/answer)
            const mapped: Flashcard[] = data.map((item: any) => ({
                id: item.id,
                question: item.front || item.question,
                answer: item.back || item.answer
            }));
            setFlashcards(mapped);
        }
    };

    const generateFlashcards = async () => {
        if (!user) return;
        if (!context) {
            alert('Please upload documents first');
            return;
        }
        setIsLoading(true);
        try {
            // Use new aiService (FastAPI Backend)
            // Legacy import removed
            // const data = await genAI(context);

            // Import dynamically or statically - here using dynamic to match previous pattern if needed, but static is better for thin client
            const { generateFlashcards: genAI } = await import('../lib/aiService');
            // Note: aiService.generateFlashcards returns Flashcard[] directly, assuming the types match or need mapping
            // Let's check the return type of aiService.generateFlashcards in next step before committing this blindly.
            // Actually, let's use the static import at top if possible, or dynamic here.

            const result = await genAI(context);

            // The new aiService returns { question, answer } objects? 
            // In aiService.ts: export async function generateFlashcards(context: string): Promise<Flashcard[]> 
            // where Flashcard = { question: string, answer: string }

            const mapped: Flashcard[] = result.map((item: any) => ({
                id: crypto.randomUUID(),
                question: item.question,
                answer: item.answer
            }));

            setFlashcards(mapped);

            // Save to DB
            const { error } = await supabase.from('flashcards').insert(
                mapped.map(f => ({
                    user_id: user.id,
                    front: f.question,
                    back: f.answer,
                    status: 'new'
                }))
            );

            if (error) console.error('Error saving flashcards', error);

        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const clearFlashcards = async () => {
        if (!user) return;
        setFlashcards([]);
        try {
            await supabase.from('flashcards').delete().eq('user_id', user.id);
        } catch (error) {
            console.error('Error clearing flashcards:', error);
        }
    };

    return { flashcards, generateFlashcards, clearFlashcards, isLoading };
}
