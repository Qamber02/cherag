
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
        let active = true;
        if (user) {
            fetchFlashcards().then(data => {
                if (active && data) setFlashcards(data);
            });
        }
        return () => { active = false; };
    }, [user]);

    const fetchFlashcards = async () => {
        if (!user) return null;
        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching flashcards:', error);
            return null;
        }

        if (data) {
            // Map DB columns (front/back) to UI props (question/answer)
            return data.map((item: any) => ({
                id: item.id,
                question: item.front || item.question,
                answer: item.back || item.answer
            }));
        }
        return null;
    };

    const generateFlashcards = async () => {
        if (!user) return;
        if (!context) {
            alert('Please upload documents first');
            return;
        }
        setIsLoading(true);
        try {
            const { generateFlashcards: genAI } = await import('../lib/aiService');
            const result = await genAI(context);

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
