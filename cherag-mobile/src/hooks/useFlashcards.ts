/**
 * useFlashcards Hook
 * Flashcard generation and management
 */

import { useState, useCallback } from 'react';
import { generateFlashcards as aiGenerateFlashcards } from '../lib/aiService';
import type { Flashcard } from '../types/index';

interface UseFlashcardsState {
    flashcards: Flashcard[];
    isLoading: boolean;
    error: string | null;
    currentIndex: number;
    knownCount: number;
}

export function useFlashcards() {
    const [state, setState] = useState<UseFlashcardsState>({
        flashcards: [],
        isLoading: false,
        error: null,
        currentIndex: 0,
        knownCount: 0,
    });

    // Generate flashcards from content
    const generateFlashcards = useCallback(async (context: string) => {
        if (!context || context.length < 50) {
            setState((prev) => ({
                ...prev,
                error: 'Please provide more content to generate flashcards.',
            }));
            return;
        }

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await aiGenerateFlashcards(context);

            const cards: Flashcard[] = result.map((item, index) => ({
                id: `card_${Date.now()}_${index}`,
                question: item.question,
                answer: item.answer,
                status: 'new' as const,
            }));

            setState({
                flashcards: cards,
                isLoading: false,
                error: null,
                currentIndex: 0,
                knownCount: 0,
            });
        } catch (error: any) {
            console.error('[Flashcards] Generate error:', error);
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Failed to generate flashcards',
            }));
        }
    }, []);

    // Navigate to next card
    const nextCard = useCallback(() => {
        setState((prev) => {
            const newIndex = Math.min(prev.currentIndex + 1, prev.flashcards.length - 1);
            return { ...prev, currentIndex: newIndex };
        });
    }, []);

    // Navigate to previous card
    const prevCard = useCallback(() => {
        setState((prev) => {
            const newIndex = Math.max(prev.currentIndex - 1, 0);
            return { ...prev, currentIndex: newIndex };
        });
    }, []);

    // Go to specific card
    const goToCard = useCallback((index: number) => {
        setState((prev) => {
            const newIndex = Math.max(0, Math.min(index, prev.flashcards.length - 1));
            return { ...prev, currentIndex: newIndex };
        });
    }, []);

    // Mark current card as known
    const markAsKnown = useCallback(() => {
        setState((prev) => {
            const updated = [...prev.flashcards];
            if (updated[prev.currentIndex]) {
                updated[prev.currentIndex] = {
                    ...updated[prev.currentIndex],
                    status: 'mastered',
                };
            }

            const newKnownCount = updated.filter((c) => c.status === 'mastered').length;

            // Move to next card if not at end
            const newIndex = Math.min(prev.currentIndex + 1, updated.length - 1);

            return {
                ...prev,
                flashcards: updated,
                knownCount: newKnownCount,
                currentIndex: newIndex,
            };
        });
    }, []);

    // Reset study progress
    const resetProgress = useCallback(() => {
        setState((prev) => ({
            ...prev,
            flashcards: prev.flashcards.map((c) => ({ ...c, status: 'new' as const })),
            currentIndex: 0,
            knownCount: 0,
        }));
    }, []);

    // Clear all flashcards
    const clearFlashcards = useCallback(() => {
        setState({
            flashcards: [],
            isLoading: false,
            error: null,
            currentIndex: 0,
            knownCount: 0,
        });
    }, []);

    // Shuffle flashcards
    const shuffleCards = useCallback(() => {
        setState((prev) => {
            const shuffled = [...prev.flashcards];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return { ...prev, flashcards: shuffled, currentIndex: 0 };
        });
    }, []);

    const currentCard = state.flashcards[state.currentIndex] || null;
    const totalCards = state.flashcards.length;
    const progress = totalCards > 0 ? ((state.knownCount / totalCards) * 100).toFixed(0) : 0;

    return {
        ...state,
        currentCard,
        totalCards,
        progress,
        generateFlashcards,
        nextCard,
        prevCard,
        goToCard,
        markAsKnown,
        resetProgress,
        clearFlashcards,
        shuffleCards,
        hasFlashcards: state.flashcards.length > 0,
        isFirstCard: state.currentIndex === 0,
        isLastCard: state.currentIndex === state.flashcards.length - 1,
    };
}

export default useFlashcards;
