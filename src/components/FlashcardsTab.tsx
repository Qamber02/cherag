import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Trash2, ChevronLeft, ChevronRight, RotateCcw, Sparkles, BookOpen, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
    const [studyMode, setStudyMode] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [knownCards, setKnownCards] = useState<Set<number>>(new Set());

    const handleRegenerate = async () => {
        if (flashcards.length > 0) {
            await onClear();
        }
        onGenerate();
    };

    const startStudyMode = () => {
        setStudyMode(true);
        setCurrentIndex(0);
        setIsFlipped(false);
        setKnownCards(new Set());
    };

    const exitStudyMode = () => {
        setStudyMode(false);
        setCurrentIndex(0);
        setIsFlipped(false);
    };

    const nextCard = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
        }
    };

    const prevCard = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsFlipped(false);
        }
    };

    const markAsKnown = () => {
        setKnownCards(prev => new Set(prev).add(currentIndex));
        nextCard();
    };

    const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

    // Study Mode View
    if (studyMode && flashcards.length > 0) {
        const card = flashcards[currentIndex];
        const isLast = currentIndex === flashcards.length - 1;
        const isComplete = knownCards.size === flashcards.length;

        if (isComplete) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-green-950">
                    <div className="w-24 h-24 bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30 animate-pulse">
                        <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Study Complete!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        You've reviewed all {flashcards.length} cards!
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => { setKnownCards(new Set()); setCurrentIndex(0); setIsFlipped(false); }}
                            className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white rounded-xl hover:bg-gray-50"
                        >
                            <RotateCcw className="w-5 h-5 inline mr-2" />
                            Study Again
                        </button>
                        <button
                            onClick={exitStudyMode}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg"
                        >
                            Done
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <button onClick={exitStudyMode} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            ← Back to Cards
                        </button>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {currentIndex + 1} / {flashcards.length}
                            </span>
                            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                            {knownCards.size} known
                        </span>
                    </div>
                </div>

                {/* Card Area */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div
                        className="w-full max-w-2xl h-80 cursor-pointer perspective-1000"
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <motion.div
                            className="relative w-full h-full"
                            initial={false}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.6 }}
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            {/* Front */}
                            <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700">
                                <span className="text-xs uppercase tracking-wider text-gray-400 mb-4 font-bold">Question</span>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white text-center leading-relaxed w-full prose prose-lg dark:prose-invert">
                                    <ReactMarkdown>{card.question}</ReactMarkdown>
                                </div>
                                <span className="absolute bottom-6 text-sm text-blue-500 font-medium">Tap to flip</span>
                            </div>

                            {/* Back */}
                            <div
                                className="absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center"
                                style={{ transform: 'rotateY(180deg)' }}
                            >
                                <span className="text-xs uppercase tracking-wider text-blue-200 mb-4 font-bold">Answer</span>
                                <div className="text-xl font-medium text-white text-center leading-relaxed w-full prose prose-lg prose-invert">
                                    <ReactMarkdown>{card.answer}</ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <button
                            onClick={prevCard}
                            disabled={currentIndex === 0}
                            className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
                        >
                            <ChevronLeft className="w-6 h-6 inline" /> Previous
                        </button>

                        <button
                            onClick={markAsKnown}
                            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" />
                            I Know This
                        </button>

                        <button
                            onClick={nextCard}
                            disabled={isLast}
                            className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30"
                        >
                            Next <ChevronRight className="w-6 h-6 inline" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Grid View
    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Flashcards</h2>
                    {flashcards.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{flashcards.length} cards</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {flashcards.length > 0 && (
                        <>
                            <button
                                onClick={startStudyMode}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                            >
                                <BookOpen className="w-4 h-4" />
                                Study Mode
                            </button>
                            <button
                                onClick={onClear}
                                disabled={isLoading}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-900"
                                title="Clear All Cards"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </>
                    )}
                    {hasUnknownContext && (
                        <button
                            onClick={handleRegenerate}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            <span>{flashcards.length > 0 ? 'Regenerate' : 'Generate'}</span>
                        </button>
                    )}
                </div>
            </div>

            {flashcards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-12 h-12 animate-spin mb-4 text-purple-500" />
                            <p className="text-gray-600 dark:text-gray-400">Generating flashcards from your documents...</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg animate-float">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Flashcards Yet</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                Upload documents and generate flashcards to start studying.
                            </p>
                        </>
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

    return (
        <div
            className="h-64 cursor-pointer perspective-1000 group"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                className="relative w-full h-full"
                initial={false}
                animate={{
                    rotateY: isFlipped ? 180 : 0,
                    scale: isFlipped ? 1.02 : 1,
                }}
                transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow p-8 flex flex-col items-center justify-center">
                    <span className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-bold">Question</span>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed text-center font-serif w-full prose prose-sm dark:prose-invert">
                        <ReactMarkdown>{question}</ReactMarkdown>
                    </div>
                    <span className="absolute bottom-6 text-xs text-amber-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Click to flip <Sparkles className="w-3 h-3" />
                    </span>
                </div>

                {/* Back */}
                <div
                    className="absolute w-full h-full backface-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center"
                    style={{ transform: 'rotateY(180deg)' }}
                >
                    <span className="text-xs uppercase tracking-widest text-white/80 mb-4 font-bold">Answer</span>
                    <div className="text-lg text-white leading-relaxed text-center font-medium w-full prose prose-sm prose-invert">
                        <ReactMarkdown>{answer}</ReactMarkdown>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
