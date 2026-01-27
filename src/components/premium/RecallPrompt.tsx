// Recall Prompt - Micro-recall question overlay
// Tests understanding without typing

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { RecallPromptProps } from '../../types/videoIntelligence.types';

type PromptState = 'showing' | 'answered_correct' | 'answered_wrong' | 'skipped';

export default function RecallPrompt({
    clip,
    question,
    onAnswer,
    onSkip,
    timeoutSeconds = 15,
}: RecallPromptProps) {
    const [state, setState] = useState<PromptState>('showing');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(timeoutSeconds);
    const [answerStartTime] = useState(Date.now());

    // Countdown timer
    useEffect(() => {
        if (state !== 'showing') return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Timeout - auto-skip
                    setState('skipped');
                    setTimeout(() => {
                        onSkip();
                    }, 1500);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [state, onSkip]);

    const handleOptionClick = (index: number) => {
        if (state !== 'showing') return;

        setSelectedIndex(index);
        const timeTaken = Date.now() - answerStartTime;
        const isCorrect = index === question.correct_index;

        setState(isCorrect ? 'answered_correct' : 'answered_wrong');

        // Report to parent
        onAnswer(index, timeTaken);
    };

    const isCorrect = selectedIndex === question.correct_index;

    return (
        <div className="h-full w-full flex items-center justify-center bg-black p-6 relative">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-pink-900/30" />

            <div className="relative z-10 w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 bg-purple-600/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 text-sm font-bold">
                            {state === 'showing' ? `${timeRemaining}s` : 'Complete'}
                        </span>
                    </div>
                    <h3 className="text-white/60 text-sm mb-2">Quick Recall</h3>
                    <p className="text-white/40 text-xs">
                        Concept: {clip.concept}
                    </p>
                </div>

                {/* Question */}
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/10">
                    <p className="text-white text-lg font-medium text-center leading-relaxed">
                        {question.question}
                    </p>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                    {question.options.map((option, index) => {
                        const isSelected = selectedIndex === index;
                        const isCorrectOption = index === question.correct_index;

                        let bgColor = 'bg-white/10';
                        let borderColor = 'border-white/20';
                        let icon = null;

                        if (state !== 'showing') {
                            if (isCorrectOption) {
                                bgColor = 'bg-green-500/20';
                                borderColor = 'border-green-500/50';
                                icon = <CheckCircle2 className="w-5 h-5 text-green-400" />;
                            } else if (isSelected && !isCorrect) {
                                bgColor = 'bg-red-500/20';
                                borderColor = 'border-red-500/50';
                                icon = <XCircle className="w-5 h-5 text-red-400" />;
                            }
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleOptionClick(index)}
                                disabled={state !== 'showing'}
                                className={`w-full ${bgColor} backdrop-blur-md ${borderColor} border-2 rounded-xl p-4 text-white text-left hover:bg-white/20 active:scale-98 transition-all disabled:cursor-not-allowed flex items-center justify-between`}
                            >
                                <span>{option}</span>
                                {icon}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation (if answered wrong) */}
                {state === 'answered_wrong' && question.explanation && (
                    <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-xl p-4 mb-6">
                        <p className="text-red-300 text-sm font-bold mb-1">Why?</p>
                        <p className="text-white/70 text-sm">{question.explanation}</p>
                    </div>
                )}

                {/* Success message */}
                {state === 'answered_correct' && (
                    <div className="bg-green-500/10 backdrop-blur-md border border-green-500/30 rounded-xl p-4 mb-6 text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-green-300 text-sm font-bold">
                            Perfect! Mastery +30%
                        </p>
                    </div>
                )}

                {/* Timeout message */}
                {state === 'skipped' && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
                        <p className="text-white/60 text-sm">Time's up!</p>
                    </div>
                )}

                {/* Skip button (only when showing) */}
                {state === 'showing' && (
                    <button
                        onClick={() => {
                            setState('skipped');
                            setTimeout(onSkip, 500);
                        }}
                        className="w-full bg-white/5 backdrop-blur-md text-white/60 rounded-full py-3 text-sm hover:bg-white/10 transition-all"
                    >
                        Skip Question
                    </button>
                )}
            </div>
        </div>
    );
}
