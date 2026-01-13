import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

export interface Flashcard {
    question: string;
    answer: string;
}

interface FlashcardsTabProps {
    flashcards: Flashcard[];
    isLoading: boolean;
    onGenerate: () => void;
    onClear: () => Promise<void>;
    hasUnknownContext: boolean;
}

export default function FlashcardsTab({ flashcards, isLoading, onGenerate, onClear, hasUnknownContext }: FlashcardsTabProps) {
    const handleRegenerate = async () => {
        if (flashcards.length > 0) {
            await onClear();
        }
        onGenerate();
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Flashcards</h2>
                <div className="flex items-center gap-2">
                    {flashcards.length > 0 && (
                        <button
                            onClick={onClear}
                            disabled={isLoading}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-900"
                            title="Clear All Cards"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    {hasUnknownContext && (
                        <button
                            onClick={handleRegenerate}
                            disabled={isLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            <span>{flashcards.length > 0 ? 'Regenerate' : 'Generate'} Flashcards</span>
                        </button>
                    )}
                </div>
            </div>

            {flashcards.length === 0 ? (
                <div className="text-center mt-20 text-gray-500">
                    {isLoading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                            <p>Generating standard flashcards from your documents...</p>
                        </div>
                    ) : (
                        <p>Upload documents and click Generate to create flashcards.</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flashcards.map((card, index) => (
                        <FlipCard key={index} question={card.question} answer={card.answer} />
                    ))}
                </div>
            )}
        </div>
    );
}

function FlipCard({ question, answer }: { question: string; answer: string }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleFlip = () => {
        if (!isAnimating) {
            setIsFlipped(!isFlipped);
            setIsAnimating(true);
        }
    }

    return (
        <div className="h-64 cursor-pointer perspective-1000" onClick={handleFlip}>
            <motion.div
                className="relative w-full h-full text-center transition-all duration-500 preserve-3d"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                onAnimationComplete={() => setIsAnimating(false)}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg p-8 flex flex-col items-center justify-center">
                    <h3 className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 font-semibold">Question</h3>
                    <p className="text-xl font-medium text-gray-900 dark:text-white leading-relaxed">{question}</p>
                    <span className="absolute bottom-4 text-xs text-blue-500 font-medium">Click to flip</span>
                </div>

                {/* Back */}
                <div
                    className="absolute w-full h-full backface-hidden bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg p-8 flex flex-col items-center justify-center"
                    style={{ transform: 'rotateY(180deg)' }}
                >
                    <h3 className="text-sm uppercase tracking-wider text-blue-400 mb-4 font-semibold">Answer</h3>
                    <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed font-medium">{answer}</p>
                </div>
            </motion.div>
        </div>
    );
}
