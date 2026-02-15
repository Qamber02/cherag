import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileText, Sparkles, Brain, CheckCircle, X, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
    onComplete: () => void;
    onSkip: () => void;
}

const steps = [
    {
        icon: Upload,
        title: "Upload Your Materials",
        description: "Drop PDFs, Word docs, or text files. Cherág works with any study content.",
        color: "from-blue-500 to-cyan-500"
    },
    {
        icon: Sparkles,
        title: "AI Does the Work",
        description: "We'll generate summaries, flashcards, quizzes, and learning roadmaps automatically.",
        color: "from-amber-500 to-orange-500"
    },
    {
        icon: Brain,
        title: "Study Smarter",
        description: "Track your progress with Knowledge Radar, take practice exams, and master any topic.",
        color: "from-purple-500 to-pink-500"
    }
];

export default function OnboardingModal({ onComplete, onSkip }: OnboardingModalProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Animate in with cleanup
        const timeoutId = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timeoutId);
    }, []);

    const handleComplete = useCallback(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
    }, [onComplete]);

    const handleSkip = useCallback(() => {
        setIsVisible(false);
        setTimeout(onSkip, 300);
    }, [onSkip]);

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    }, [currentStep, handleComplete]);

    // Keyboard handling for accessibility
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleSkip();
        }
    }, [handleSkip]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        // Focus trap: focus modal on mount
        modalRef.current?.focus();
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const step = steps[currentStep];
    const Icon = step.icon;
    const isLastStep = currentStep === steps.length - 1;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
                }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
        >
            <div
                ref={modalRef}
                tabIndex={-1}
                className={`relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                    }`}
            >
                {/* Close button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
                    aria-label="Skip tutorial"
                    type="button"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon Header */}
                <div className={`bg-gradient-to-br ${step.color} p-8 pb-12`}>
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm">
                        <Icon className="w-10 h-10 text-white" />
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 -mt-4 bg-white dark:bg-gray-800 rounded-t-3xl relative">
                    {/* Step indicators */}
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep
                                    ? 'w-8 bg-amber-500'
                                    : idx < currentStep
                                        ? 'w-4 bg-amber-300'
                                        : 'w-4 bg-gray-200 dark:bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>

                    <h2 id="onboarding-title" className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
                        {step.title}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center mb-8 leading-relaxed">
                        {step.description}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleNext}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLastStep ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Get Started
                                </>
                            ) : (
                                <>
                                    Next
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        {!isLastStep && (
                            <button
                                onClick={handleSkip}
                                className="w-full py-3 text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                Skip tutorial
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
