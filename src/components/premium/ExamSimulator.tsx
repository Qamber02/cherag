// Exam Simulator Component
// FIX: Added localStorage persistence, forward-only navigation, and mobile improvements
import { useState, useEffect, useCallback } from 'react';
import {
    Clock,
    CheckCircle2,
    ChevronRight,
    Flag,
    Save,
    SkipForward,
} from 'lucide-react';
import type { ExamQuestion } from '../../lib/premium';

// localStorage key for exam state persistence
const EXAM_STATE_KEY = 'cherag_exam_state';

interface ExamState {
    answers: Record<number, string>;
    currentQuestionIndex: number;
    timeLeft: number;
    flagged: Record<number, boolean>;
    questionsHash: string; // To detect if questions changed
}

interface ExamSimulatorProps {
    questions: ExamQuestion[];
    durationMinutes: number;
    onComplete: (score: number, answers: Record<number, string>) => void;
    onCancel: () => void;
}

// Generate a simple hash to detect if questions changed
const getQuestionsHash = (questions: ExamQuestion[]): string => {
    return questions.map(q => q.question.slice(0, 20)).join('|').slice(0, 100);
};

export default function ExamSimulator({
    questions,
    durationMinutes,
    onComplete,
    onCancel
}: ExamSimulatorProps) {
    // FIX: Initialize state from localStorage if available
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
        try {
            const saved = localStorage.getItem(EXAM_STATE_KEY);
            if (saved) {
                const state: ExamState = JSON.parse(saved);
                if (state.questionsHash === getQuestionsHash(questions)) {
                    return state.currentQuestionIndex;
                }
            }
        } catch (e) { /* ignore */ }
        return 0;
    });

    const [answers, setAnswers] = useState<Record<number, string>>(() => {
        try {
            const saved = localStorage.getItem(EXAM_STATE_KEY);
            if (saved) {
                const state: ExamState = JSON.parse(saved);
                if (state.questionsHash === getQuestionsHash(questions)) {
                    return state.answers;
                }
            }
        } catch (e) { /* ignore */ }
        return {};
    });

    const [flagged, setFlagged] = useState<Record<number, boolean>>(() => {
        try {
            const saved = localStorage.getItem(EXAM_STATE_KEY);
            if (saved) {
                const state: ExamState = JSON.parse(saved);
                if (state.questionsHash === getQuestionsHash(questions)) {
                    return state.flagged;
                }
            }
        } catch (e) { /* ignore */ }
        return {};
    });

    const [timeLeft, setTimeLeft] = useState(() => {
        try {
            const saved = localStorage.getItem(EXAM_STATE_KEY);
            if (saved) {
                const state: ExamState = JSON.parse(saved);
                if (state.questionsHash === getQuestionsHash(questions)) {
                    return state.timeLeft;
                }
            }
        } catch (e) { /* ignore */ }
        return durationMinutes * 60;
    });

    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);

    const currentQuestion = questions[currentQuestionIndex];

    // FIX: Persist exam state to localStorage whenever it changes
    useEffect(() => {
        if (isFinished) return;

        const state: ExamState = {
            answers,
            currentQuestionIndex,
            timeLeft,
            flagged,
            questionsHash: getQuestionsHash(questions),
        };
        localStorage.setItem(EXAM_STATE_KEY, JSON.stringify(state));
    }, [answers, currentQuestionIndex, timeLeft, flagged, questions, isFinished]);

    // Timer effect
    useEffect(() => {
        if (isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    finishExam();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isFinished]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // FIX: Auto-advance to next question after answering MCQ (forward-only progression)
    const handleAnswer = useCallback((value: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestionIndex]: value }));

        // Auto-advance for MCQ questions after a brief delay for visual feedback
        if (currentQuestion?.type === 'mcq' && currentQuestionIndex < questions.length - 1) {
            setTimeout(() => {
                setCurrentQuestionIndex(prev => prev + 1);
            }, 300);
        }
    }, [currentQuestionIndex, currentQuestion?.type, questions.length]);

    const toggleFlag = () => {
        setFlagged(prev => ({ ...prev, [currentQuestionIndex]: !prev[currentQuestionIndex] }));
    };

    // FIX: Clear localStorage on exam finish to prevent stale state
    const finishExam = useCallback(() => {
        let calculatedScore = 0;
        questions.forEach((q, idx) => {
            if (q.type === 'mcq') {
                const userAnswer = answers[idx] || "";
                if (userAnswer.trim().toUpperCase() === q.correct_answer.trim().toUpperCase()) {
                    calculatedScore++;
                } else if (q.correct_answer.length > 1 && userAnswer === q.correct_answer) {
                    calculatedScore++;
                }
            }
        });

        const finalScore = Math.round((calculatedScore / questions.length) * 100);
        setScore(finalScore);
        setIsFinished(true);

        // Clear saved state after exam completion
        localStorage.removeItem(EXAM_STATE_KEY);
    }, [questions, answers]);

    const getQuestionStatus = (index: number) => {
        if (index === currentQuestionIndex) return 'current';
        if (flagged[index]) return 'flagged';
        if (answers[index]) return 'answered';
        return 'unanswered';
    };

    if (isFinished) {
        return (
            <div className="h-full flex flex-col p-6 overflow-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-foreground">Exam Results</h2>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-border rounded-lg hover:bg-secondary text-foreground"
                    >
                        Close
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-sm text-muted-foreground mb-1">Final Score</div>
                        <div className={`text-4xl font-bold ${score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {score}%
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-sm text-muted-foreground mb-1">Time Taken</div>
                        <div className="text-2xl font-bold text-foreground">
                            {formatTime((durationMinutes * 60) - timeLeft)}
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <div className="text-sm text-muted-foreground mb-1">Questions Answered</div>
                        <div className="text-2xl font-bold text-foreground">
                            {Object.keys(answers).length} / {questions.length}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Review Answers</h3>
                    {questions.map((q, idx) => {
                        const userAnswer = answers[idx] || "";
                        const isCorrect = userAnswer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();

                        return (
                            <div key={idx} className={`bg-card border rounded-xl p-6 ${q.type === 'mcq'
                                ? (isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5')
                                : 'border-border'
                                }`}>
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground capitalize">
                                                {q.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-muted-foreground capitalize">
                                                {q.difficulty}
                                            </span>
                                        </div>
                                        <p className="text-lg font-medium text-foreground mb-4">{q.question}</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Your Answer</div>
                                                <div className={`p-3 rounded-lg border ${q.type === 'mcq'
                                                    ? isCorrect ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                                                    : 'border-border bg-secondary text-foreground'
                                                    }`}>
                                                    {userAnswer || '(No answer)'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Correct Answer</div>
                                                <div className="p-3 rounded-lg border border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                                    {q.correct_answer}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
                                            <span className="font-semibold text-foreground">Explanation: </span>
                                            {q.explanation}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 flex justify-center pb-8">
                    <button
                        onClick={() => onComplete(score, answers)}
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90"
                    >
                        Save Results & Exit
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-foreground">Exam Simulation</span>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm text-foreground">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                </div>
                <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                    <Clock className="w-5 h-5" />
                    {formatTime(timeLeft)}
                </div>
                <button
                    onClick={finishExam}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors text-sm font-medium"
                >
                    <Save className="w-4 h-4" />
                    Finish
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex">
                {/* Question Area */}
                <div className="flex-1 overflow-auto p-6 md:p-10">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-6 flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                {currentQuestion.topic}
                            </span>
                            <button
                                onClick={toggleFlag}
                                className={`flex items-center gap-2 text-sm ${flagged[currentQuestionIndex] ? 'text-orange-500 font-medium' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Flag className={`w-4 h-4 ${flagged[currentQuestionIndex] ? 'fill-current' : ''}`} />
                                {flagged[currentQuestionIndex] ? 'Flagged for Review' : 'Flag Question'}
                            </button>
                        </div>

                        <h2 className="text-2xl font-serif leading-relaxed text-foreground mb-8">
                            {currentQuestion.question}
                        </h2>

                        {currentQuestion.type === 'mcq' && currentQuestion.options ? (
                            <div className="space-y-3">
                                {currentQuestion.options.map((option, idx) => {
                                    // Extract letter (e.g. "A) ...")
                                    const letter = option.charAt(0);
                                    // Or simplified logic if option is just text
                                    // Assuming "A) Answer" format from prompt
                                    const isSelected = answers[currentQuestionIndex] === letter;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(letter)}
                                            className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-sm font-medium ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
                                                    }`}>
                                                    {letter}
                                                </div>
                                                <span className="text-foreground pt-0.5">{option.substring(2).trim() || option}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <textarea
                                value={answers[currentQuestionIndex] || ''}
                                onChange={(e) => handleAnswer(e.target.value)}
                                placeholder="Type your answer here..."
                                className="w-full h-64 p-4 rounded-xl bg-secondary/30 border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-foreground font-sans text-base leading-relaxed"
                            />
                        )}
                    </div>
                </div>

                {/* Navigation Sidebar */}
                <div className="w-64 border-l border-border bg-card overflow-auto p-4 hidden lg:block">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Question Map</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {questions.map((_, idx) => {
                            const status = getQuestionStatus(idx);
                            let bgClass = 'bg-secondary text-muted-foreground hover:bg-secondary/80';
                            if (status === 'current') bgClass = 'ring-2 ring-primary bg-background text-primary';
                            else if (status === 'flagged') bgClass = 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
                            else if (status === 'answered') bgClass = 'bg-primary/20 text-primary hover:bg-primary/30';

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${bgClass}`}
                                >
                                    {idx + 1}
                                    {/* Small flag indicator */}
                                    {flagged[idx] && (
                                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-3 h-3 rounded bg-primary/20 ring-1 ring-primary/20" /> Answered
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-3 h-3 rounded bg-orange-100 ring-1 ring-orange-200 dark:bg-orange-900/30" /> Flagged
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-3 h-3 rounded bg-secondary" /> Unanswered
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - FIX: Forward-only navigation with mobile-friendly touch targets */}
            <div className="border-t border-border p-4 flex items-center justify-between shrink-0 bg-card">
                {/* Skip button for non-MCQ questions (MCQ auto-advances) */}
                {currentQuestion?.type !== 'mcq' ? (
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]"
                    >
                        <SkipForward className="w-4 h-4" />
                        Skip Question
                    </button>
                ) : (
                    <div className="text-sm text-muted-foreground px-4">
                        Select an answer to continue
                    </div>
                )}

                {/* Mobile progress indicator */}
                <div className="flex gap-2 lg:hidden">
                    <span className="px-4 py-3 bg-secondary rounded-lg text-sm font-medium min-h-[48px] flex items-center">
                        {currentQuestionIndex + 1} / {questions.length}
                    </span>
                </div>

                <div className="flex gap-4">
                    {currentQuestionIndex === questions.length - 1 ? (
                        <button
                            onClick={finishExam}
                            className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 shadow-sm shadow-primary/20 transition-all hover:translate-y-[-1px] min-h-[48px] active:scale-95"
                        >
                            Finish Exam
                            <CheckCircle2 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 shadow-sm shadow-primary/20 transition-all hover:translate-y-[-1px] min-h-[48px] active:scale-95"
                        >
                            Next Question
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
