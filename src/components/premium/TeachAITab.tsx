// Teach AI Tab (Feynman Technique)
// User teaches the AI a concept, AI acts as a curious student

import { useState, useRef, useEffect } from 'react';
import {
    GraduationCap,
    MessageCircle,
    Send,
    Lightbulb,
    Award,
    RefreshCw,
    User,
    Bot,
    ChevronRight,
    ArrowDown
} from 'lucide-react';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';
import { saveTeachingSessionState, getLastTeachingSessionState } from '../../lib/activityService';

interface TeachAITabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

interface Message {
    id: string;
    role: 'teacher' | 'student'; // User is teacher, AI is student
    content: string;
    timestamp: Date;
}

export default function TeachAITab({
    userId,
    context,
    hasContext: _hasContext,
}: TeachAITabProps) {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [concept, setConcept] = useState('');
    const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [evaluation, setEvaluation] = useState<any | null>(null);

    const [showScrollButton, setShowScrollButton] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { startTeachingSession, sendTeachingMessage, evaluateSession } = usePremiumFeatures(userId);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    // Load last session on mount
    useEffect(() => {
        async function loadSession() {
            const lastSession = await getLastTeachingSessionState(userId);
            if (lastSession) {
                setConcept(lastSession.concept);
                setMessages(lastSession.messages.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp) // Fix date parsing
                })));
                setEvaluation(lastSession.evaluation);
                if (!lastSession.evaluation && lastSession.messages.length > 0) {
                    setIsSessionActive(true);
                }
            }
        }
        loadSession();
    }, [userId]);

    // Auto-save on meaningful changes
    useEffect(() => {
        if ((messages.length > 0 || evaluation) && concept) {
            const timer = setTimeout(() => {
                saveTeachingSessionState(userId, concept, messages, evaluation);
            }, 1000); // Debounce save
            return () => clearTimeout(timer);
        }
    }, [messages, evaluation, concept, userId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollButton(false);
    };

    // ...

    const handleStartSession = async () => {
        if (!concept.trim()) return;

        setIsLoading(true);
        try {
            // Initialize session
            const initialMessage = await startTeachingSession(concept, difficulty, context);
            setIsSessionActive(true);
            const newMessages: Message[] = [
                {
                    id: '1',
                    role: 'student',
                    content: initialMessage,
                    timestamp: new Date()
                }
            ];
            setMessages(newMessages);
            // Save initial state
            // Handled by useEffect
        } catch (error) {
            console.error('Failed to start teaching session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'teacher',
            content: input,
            timestamp: new Date(),
        };

        const currentMessages = [...messages, userMsg];
        setMessages(currentMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Create a timeout promise
            const timeoutPromise = new Promise<string>((_, reject) => {
                setTimeout(() => reject(new Error('AI response timed out. Please try again.')), 45000);
            });

            // Race against the actual API call
            const response = await Promise.race([
                sendTeachingMessage(currentMessages, concept, difficulty, context),
                timeoutPromise
            ]);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'student',
                content: response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error: any) {
            console.error('Failed to send message:', error);
            // Add error message to chat
            const errorMsg: Message = {
                id: (Date.now() + 2).toString(),
                role: 'student',
                content: `⚠️ ${error.message || 'Something went wrong. Please try again.'}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndSession = async () => {
        setIsLoading(true);
        try {
            const result = await evaluateSession(concept, messages);
            setEvaluation(result);
            setIsSessionActive(false);
            // Saved by useEffect
        } catch (error) {
            console.error('Failed to evaluate session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Setup View
    if (!isSessionActive && !evaluation) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 max-w-2xl mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center mb-6 shadow-lg">
                    <GraduationCap className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold mb-3 text-foreground">The Feynman Technique</h2>
                <p className="text-muted-foreground text-center mb-8">
                    The best way to learn is to teach. Choose a concept, and I'll act as a
                    curious student asking questions to test your understanding.
                </p>

                <div className="w-full space-y-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            What do you want to teach me?
                        </label>
                        <input
                            type="text"
                            value={concept}
                            onChange={(e) => setConcept(e.target.value)}
                            placeholder="e.g. Quantum Entanglement, The French Revolution..."
                            className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Student Level (My Persona)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setDifficulty(level)}
                                    className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${difficulty === level
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-500/50'
                                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleStartSession}
                        disabled={!concept.trim() || isLoading}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                    >
                        {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                        Start Teaching Session
                    </button>
                </div>
            </div>
        );
    }

    // Evaluation View
    if (evaluation) {
        return (
            <div className="h-full overflow-auto p-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Session Evaluation</h1>
                            <p className="text-muted-foreground">Topic: {concept}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEvaluation(null);
                            setMessages([]);
                            setConcept('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        New Session
                    </button>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-card border border-border p-6 rounded-2xl text-center">
                        <div className="text-4xl font-bold text-emerald-500 mb-2">{(evaluation.scores?.overall || 0) * 10}/100</div>
                        <div className="text-sm text-muted-foreground">Understanding Score</div>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-2xl col-span-2">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            Key Insight
                        </h3>
                        <p className="text-muted-foreground">{evaluation.encouragement || "Great effort! Keep practicing to improve your understanding."}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-4 text-lg">Detailed Analysis</h3>
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            {/* Gaps / Improvements */}
                            <div className="p-6 border-b border-border">
                                <h4 className="text-sm font-medium text-red-500 mb-3 flex items-center gap-2">
                                    <Award className="w-4 h-4" /> Areas for Improvement
                                </h4>
                                <ul className="space-y-2">
                                    {evaluation.improvement_suggestions?.map((suggestion: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                            <ChevronRight className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                            {suggestion}
                                        </li>
                                    )) || <p className="text-muted-foreground text-sm">No specific gaps identified.</p>}
                                </ul>
                            </div>

                            {/* Strengths */}
                            <div className="p-6">
                                <h4 className="text-sm font-medium text-emerald-500 mb-3 flex items-center gap-2">
                                    <Award className="w-4 h-4" /> Strengths
                                </h4>
                                <ul className="space-y-2">
                                    {evaluation.strengths?.map((strength: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                            <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            {strength}
                                        </li>
                                    )) || <p className="text-muted-foreground text-sm">Strong performance.</p>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active Session View
    return (
        <div className="h-full flex flex-col max-w-5xl mx-auto w-full bg-card/50 shadow-2xl md:rounded-2xl border-x border-border md:border-y overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white">
                        <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{concept}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            Teaching {difficulty} student
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleEndSession}
                    className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-foreground"
                >
                    End Session & Evaluate
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 pb-20 space-y-6 scroll-smooth relative"
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-4 ${msg.role === 'teacher' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`
              w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
              ${msg.role === 'teacher' ? 'bg-primary text-primary-foreground' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300'}
            `}>
                            {msg.role === 'teacher' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        <div className={`
              max-w-[80%] rounded-2xl p-4 shadow-sm
              ${msg.role === 'teacher'
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-card border border-border rounded-tl-sm text-foreground'}
            `}>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" />
                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce delay-75" />
                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce delay-150" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />

                {/* Floating Scroll Button */}
                <button
                    onClick={scrollToBottom}
                    className={`absolute bottom-6 right-6 p-2 bg-primary text-primary-foreground rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-20 ${showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                        }`}
                    title="Scroll to bottom"
                >
                    <ArrowDown className="w-5 h-5" />
                </button>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md">
                <div className="max-w-4xl mx-auto relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Explain the concept naturally..."
                        className="flex-1 px-6 py-4 bg-secondary rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isLoading}
                        className="p-4 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-3">
                    Tip: Try to use simple analogies. The AI will ask follow-up questions if it's confused.
                </p>
            </div>
        </div>
    );
}
