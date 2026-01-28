import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FileQuestion, CheckCircle, XCircle, Sparkles, Loader2, RefreshCw, ArrowRight, Trash2 } from 'lucide-react';
import { generateQuizzes } from '../lib/aiService';
import ReactMarkdown from 'react-markdown';

interface Quiz {
    id: string;
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    answered: boolean;
    user_answer: string | null;
}

interface QuizzesTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

export default function QuizzesTab({ userId, context, hasContext }: QuizzesTabProps) {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    const [topicInput, setTopicInput] = useState('');
    const [isTopicMode, setIsTopicMode] = useState(false);

    useEffect(() => {
        fetchQuizzes();
    }, [userId]);

    const fetchQuizzes = async () => {
        const { data } = await supabase
            .from('quizzes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (data && data.length > 0) setQuizzes(data);
    };

    const handleGenerateQuizzes = async () => {
        const quizContext = topicInput ? `Topic: ${topicInput}` : context;

        if (!quizContext) {
            setIsTopicMode(true);
            return;
        }

        setIsLoading(true);

        try {
            const generated = await generateQuizzes(quizContext);
            if (!generated || generated.length === 0) throw new Error("No quizzes generated");

            // Save to DB
            const quizzesToInsert = generated.map((q: any) => ({
                user_id: userId,
                question: q.question,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation || ''
            }));

            await supabase.from('quizzes').insert(quizzesToInsert);

            // Refresh local state immediately
            // Convert to Quiz type
            const newQuizzes: Quiz[] = generated.map((q: any, i: number) => ({
                id: `temp-${Date.now()}-${i}`, // Temp ID until fetch
                question: q.question,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation || '',
                answered: false,
                user_answer: null
            }));

            setQuizzes(newQuizzes);
            setCurrentIndex(0);
            setIsTopicMode(false);

            // Background fetch to get real IDs
            fetchQuizzes();
        } catch (err: any) {
            console.error('Quiz generation error:', err);
            // alert(`Error generating quizzes: ${err.message || 'Unknown error'}`); 
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswer = async (answer: string) => {
        const currentQuiz = quizzes[currentIndex];
        if (!currentQuiz) return;

        setSelectedAnswer(answer);
        setShowResult(true);

        // Update local state with the user's answer
        setQuizzes(prev => prev.map((q, idx) =>
            idx === currentIndex
                ? { ...q, answered: true, user_answer: answer }
                : q
        ));

        // Only update DB if it has a real ID (not temp)
        if (!currentQuiz.id.startsWith('temp-')) {
            await supabase
                .from('quizzes')
                .update({ answered: true, user_answer: answer })
                .eq('id', currentQuiz.id);
        }
    };

    const nextQuestion = () => {
        setSelectedAnswer(null);
        setShowResult(false);
        setCurrentIndex(prev => Math.min(prev + 1, quizzes.length - 1));
    };

    const clearQuizzes = async () => {
        try {
            await supabase
                .from('quizzes')
                .delete()
                .eq('user_id', userId);

            setQuizzes([]);
            setCurrentIndex(0);
            setSelectedAnswer(null);
            setShowResult(false);
        } catch (err) {
            console.error('Error clearing quizzes:', err);
        }
    };

    const currentQuiz = quizzes[currentIndex];

    // Empty State
    if (quizzes.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 dark:bg-gray-900/50">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25 animate-float">
                    <FileQuestion className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Quizzes</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
                    Test your knowledge with AI-generated multiple choice questions.
                </p>

                {isTopicMode || (!hasContext && quizzes.length === 0) ? (
                    <div className="w-full max-w-md animate-fade-in-up">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter a topic (e.g., Quantum Physics)..."
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateQuizzes()}
                            />
                            <button
                                onClick={handleGenerateQuizzes}
                                disabled={!topicInput.trim() || isLoading}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50 transition-all"
                            >
                                Start
                            </button>
                        </div>
                        <button
                            onClick={() => setIsTopicMode(false)}
                            className="text-xs text-gray-400 mt-2 hover:text-gray-600"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleGenerateQuizzes}
                            disabled={!hasContext && !topicInput}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 justify-center"
                        >
                            <Sparkles className="w-5 h-5" />
                            <span>Generate from Document</span>
                        </button>
                        <button
                            onClick={() => setIsTopicMode(true)}
                            className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                            Search Specific Topic
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Loading State
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                <p className="text-gray-600">Generating quizzes from your content...</p>
            </div>
        );
    }

    // Results State
    if (showResult && currentIndex === quizzes.length - 1 && selectedAnswer) {
        const score = quizzes.filter(q => q.user_answer === q.correct_answer).length;
        const percentage = Math.round((score / quizzes.length) * 100);

        return (
            <div className="flex flex-col h-full bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 p-4 md:p-12 overflow-y-auto pb-24 md:pb-12">
                <div className="max-w-2xl mx-auto w-full bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-8 border border-white/50 dark:border-white/10">
                    <div className="text-center mb-6 md:mb-8">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg shadow-orange-500/30">
                            <span className="text-3xl md:text-4xl font-bold text-white">{percentage}%</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {percentage >= 80 ? 'Outstanding!' : percentage >= 60 ? 'Good Job!' : 'Keep Practicing!'}
                        </h2>
                        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                            You got {score} out of {quizzes.length} questions correct.
                        </p>
                    </div>

                    <div className="space-y-3 mb-6 md:mb-8">
                        <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">Review</h3>
                        {quizzes.map((q) => (
                            <div key={q.id} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                {q.user_answer === q.correct_answer ? (
                                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs md:text-sm font-medium text-gray-800 dark:text-gray-200 break-words">{q.question}</p>
                                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Answer: <span className="font-semibold text-green-600 dark:text-green-400">{q.correct_answer}</span>
                                        {q.user_answer !== q.correct_answer && (
                                            <span className="text-red-500"> (You chose {q.user_answer || 'nothing'})</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 md:gap-4">
                        <button
                            onClick={() => {
                                setQuizzes([]);
                                setCurrentIndex(0);
                                setShowResult(false);
                            }}
                            className="flex-1 py-2.5 md:py-3 px-4 md:px-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm md:text-base"
                        >
                            Close
                        </button>
                        <button
                            onClick={handleGenerateQuizzes}
                            disabled={isLoading}
                            className="flex-1 py-2.5 md:py-3 px-4 md:px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                        >
                            <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="hidden sm:inline">New Quiz</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Quiz View
    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50">
            {/* Header / Progress */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:px-8 shadow-sm z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Topic Quiz</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Test your knowledge</p>
                    </div>
                    <div className="flex items-center gap-4 flex-1 justify-end max-w-sm">
                        <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 ease-out"
                                style={{ width: `${((currentIndex + 1) / quizzes.length) * 100}%` }}
                            />
                        </div>
                        <span className="text-sm font-mono font-medium text-gray-600 dark:text-gray-300 min-w-[3rem]">
                            {currentIndex + 1}/{quizzes.length}
                        </span>
                        <button
                            onClick={() => {
                                clearQuizzes();
                                handleGenerateQuizzes();
                            }}
                            disabled={isLoading || !hasContext}
                            className="min-w-[44px] min-h-[44px] p-2.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                            title={hasContext ? "Regenerate from document" : "Upload a document first"}
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={clearQuizzes}
                            className="min-w-[44px] min-h-[44px] p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center"
                            title="Clear all quizzes"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Question Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto w-full">
                    {currentQuiz && (
                        <div className="flex flex-col gap-6 animate-fade-in">
                            {/* Question Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                                <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg mb-4 uppercase tracking-wider">
                                    Question {currentIndex + 1}
                                </span>
                                <div className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white leading-relaxed prose prose-lg dark:prose-invert max-w-none">
                                    <ReactMarkdown>{currentQuiz.question}</ReactMarkdown>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="grid gap-3">
                                {(currentQuiz.options || []).map((option, idx) => {
                                    const letter = String.fromCharCode(65 + idx);
                                    const isSelected = selectedAnswer === letter;
                                    const isCorrect = currentQuiz.correct_answer === letter;

                                    // Determine button state style
                                    let stateClass = "border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10";

                                    if (showResult) {
                                        if (isCorrect) {
                                            stateClass = "border-green-500 bg-green-50 dark:bg-green-900/20";
                                        } else if (isSelected && !isCorrect) {
                                            stateClass = "border-red-500 bg-red-50 dark:bg-red-900/20";
                                        } else {
                                            stateClass = "border-gray-200 dark:border-gray-700 opacity-50";
                                        }
                                    } else if (isSelected) {
                                        stateClass = "border-purple-600 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-600";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => !showResult && handleAnswer(letter)}
                                            disabled={showResult}
                                            className={`
                                                relative w-full min-h-[56px] p-4 md:p-5 text-left rounded-xl border-2 transition-all duration-200 group active:scale-[0.98]
                                                ${stateClass}
                                            `}
                                        >
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <span className={`
                                                    w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors shrink-0
                                                    ${isSelected || (showResult && isCorrect) ? 'bg-white text-gray-900 shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-white'}
                                                `}>
                                                    {letter}
                                                </span>
                                                <div className="flex-1 font-medium text-gray-700 dark:text-gray-200 prose prose-sm dark:prose-invert">
                                                    <ReactMarkdown>{option}</ReactMarkdown>
                                                </div>

                                                {/* Status Icons */}
                                                {showResult && isCorrect && <CheckCircle className="w-6 h-6 text-green-500 animate-slide-up shrink-0" />}
                                                {showResult && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500 animate-slide-up shrink-0" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation / Footer */}
                            <div className="h-24"> {/* Spacer for consistent layout */}
                                {showResult && (
                                    <div className="animate-slide-up">
                                        <div className={`p-4 rounded-xl border ${selectedAnswer === currentQuiz.correct_answer ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900'} mb-4`}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                                {selectedAnswer === currentQuiz.correct_answer ? 'Correct!' : 'Not quite right.'}
                                            </p>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed prose prose-sm dark:prose-invert">
                                                <ReactMarkdown>{currentQuiz.explanation}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="max-w-3xl mx-auto flex justify-between items-center">
                    <button
                        className="px-4 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors"
                        disabled
                    >
                        Report Issue
                    </button>

                    {showResult && (
                        <button
                            onClick={nextQuestion}
                            className="min-h-[48px] px-6 md:px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:shadow-lg active:scale-[0.98] transition-all flex items-center gap-2"
                        >
                            {currentIndex < quizzes.length - 1 ? (
                                <>Next <ArrowRight className="w-5 h-5" /></>
                            ) : (
                                <>Results <Sparkles className="w-5 h-5" /></>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
