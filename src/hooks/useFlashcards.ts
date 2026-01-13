
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Flashcard {
    id?: string;
    question: string;
    answer: string;
}

export function useFlashcards(user: any, context: string) {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) fetchFlashcards();
    }, [user]);

    const clearFlashcards = async () => {
        try {
            await supabase.from('flashcards').delete().eq('user_id', user.id);
            setFlashcards([]);
        } catch (error) {
            console.error('Error clearing flashcards:', error);
        }
    };

    const fetchFlashcards = async () => {
        const { data } = await supabase.from('flashcards').select('*').order('created_at', { ascending: false });

        if (data) {
            // Map DB columns (front/back) to UI props (question/answer)
            const mapped = data.map((item: any) => ({
                ...item,
                question: item.front,
                answer: item.back
            }));
            setFlashcards(mapped);
        } else {
            setFlashcards([]);
        }
    };

    const generateFlashcards = async () => {
        if (!context) return;
        setIsLoading(true);
        try {
            const { generateFlashcards: genCards } = await import('../lib/aiService');
            const cards = await genCards(context);

            if (Array.isArray(cards)) {
                // Save to DB
                // Note: Schema expects 'document_id'. Ideally we link to specific doc.
                // For now, we might leave it null or link to first available doc if user has one.
                // Or simplified schema allows null document_id (I set 'on delete set null' but constraints?)
                // Schema: document_id uuid references documents... on delete set null.
                // But creates implies it might not allow null if I didn't say 'null'.
                // Schema said: document_id uuid ... (no 'not null' on the new schema? let's check).
                // My new schema: document_id uuid references ... on delete set null. It doesn't say 'not null'. So it's nullable.

                const cardsToInsert = cards.map(c => ({
                    user_id: user.id,
                    front: c.question,
                    back: c.answer,
                    status: 'new'
                }));

                await supabase.from('flashcards').insert(cardsToInsert);
                fetchFlashcards();
            }
        } catch (err) {
            console.error('Flashcard error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return { flashcards, generateFlashcards, clearFlashcards, isLoading };
}
