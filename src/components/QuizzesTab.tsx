import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FileQuestion, CheckCircle, XCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { generateQuizzes } from '../lib/aiService';

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

    useEffect(() => {
        fetchQuizzes();
    }, [userId]);

    const fetchQuizzes = async () => {
        const { data } = await supabase
            .from('quizzes')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (data) setQuizzes(data);
    };

    const handleGenerateQuizzes = async () => {
        if (!context) {
            alert('Please upload a document first!');
            return;
        }
        setIsLoading(true);

        try {
            const generated = await generateQuizzes(context);

            // Save to DB
            const quizzesToInsert = generated.map((q: any) => ({
                user_id: userId,
                question: q.question,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation || ''
            }));

            await supabase.from('quizzes').insert(quizzesToInsert);
            fetchQuizzes();
            setCurrentIndex(0);
        } catch (err: any) {
            console.error('Quiz generation error:', err);
            alert(`Error generating quizzes: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswer = async (answer: string) => {
        setSelectedAnswer(answer);
        setShowResult(true);

        const currentQuiz = quizzes[currentIndex];
        await supabase
            .from('quizzes')
            .update({ answered: true, user_answer: answer })
            .eq('id', currentQuiz.id);
    };

    const nextQuestion = () => {
        setSelectedAnswer(null);
        setShowResult(false);
        setCurrentIndex(prev => Math.min(prev + 1, quizzes.length - 1));
    };

    const currentQuiz = quizzes[currentIndex];

    // Empty State
    if (quizzes.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25">
                    <FileQuestion className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Quizzes</h2>
                <p className="text-gray-500 mb-8 max-w-sm">
                    Test your knowledge with AI-generated multiple choice questions from your documents.
                </p>
                <button
                    onClick={handleGenerateQuizzes}
                    disabled={!hasContext || isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <span>Generate Quizzes</span>
                    </div>
                </button>
                {!hasContext && <p className="mt-4 text-sm text-red-400">Upload a document first!</p>}
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

    // Quiz View
    return (
        <div className="flex flex-col h-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Quiz Time!</h2>
                    <p className="text-sm text-gray-500">Question {currentIndex + 1} of {quizzes.length}</p>
                </div>
                <button
                    onClick={handleGenerateQuizzes}
                    disabled={isLoading || !hasContext}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Generate more quizzes"
                >
                    <RefreshCw className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-gray-100 rounded-full mb-8">
                <div
                    className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${((currentIndex + 1) / quizzes.length) * 100}%` }}
                />
            </div>

            {/* Question */}
            {currentQuiz && (
                <div className="flex-1 flex flex-col">
                    <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 mb-6">
                        <p className="text-lg font-medium text-gray-900">{currentQuiz.question}</p>
                    </div>

                    {/* Options */}
                    <div className="grid gap-3 mb-6">
                        {currentQuiz.options.map((option, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isSelected = selectedAnswer === letter;
                            const isCorrect = currentQuiz.correct_answer === letter;

                            let buttonClass = "w-full p-4 text-left rounded-xl border-2 transition-all flex items-center gap-3";

                            if (showResult) {
                                if (isCorrect) {
                                    buttonClass += " border-green-500 bg-green-50";
                                } else if (isSelected && !isCorrect) {
                                    buttonClass += " border-red-500 bg-red-50";
                                } else {
                                    buttonClass += " border-gray-200 opacity-50";
                                }
                            } else if (isSelected) {
                                buttonClass += " border-purple-500 bg-purple-50";
                            } else {
                                buttonClass += " border-gray-200 hover:border-purple-300 hover:bg-gray-50";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !showResult && handleAnswer(letter)}
                                    disabled={showResult}
                                    className={buttonClass}
                                >
                                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-medium text-gray-600">
                                        {letter}
                                    </span>
                                    <span className="flex-1 text-gray-700">{option}</span>
                                    {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                                    {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Result & Explanation */}
                    {showResult && (
                        <div className={`p-4 rounded-xl mb-6 ${selectedAnswer === currentQuiz.correct_answer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {selectedAnswer === currentQuiz.correct_answer ? (
                                    <>
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <span className="font-medium text-green-700">Correct!</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-5 h-5 text-red-500" />
                                        <span className="font-medium text-red-700">Incorrect</span>
                                    </>
                                )}
                            </div>
                            {currentQuiz.explanation && (
                                <p className="text-sm text-gray-600">{currentQuiz.explanation}</p>
                            )}
                        </div>
                    )}

                    {/* Next Button */}
                    {showResult && currentIndex < quizzes.length - 1 && (
                        <button
                            onClick={nextQuestion}
                            className="mt-auto px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl self-end"
                        >
                            Next Question →
                        </button>
                    )}

                    {showResult && currentIndex === quizzes.length - 1 && (
                        <div className="mt-auto text-center p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                            <p className="text-lg font-medium text-gray-900">🎉 Quiz Complete!</p>
                            <p className="text-sm text-gray-600">Great job! Generate more quizzes to keep learning.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
