import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatTabProps {
    messages: Message[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
}

export default function ChatTab({ messages, onSendMessage, isLoading }: ChatTabProps) {
    const [input, setInput] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Chat Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in opacity-80">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Welcome to Cherág A.I.</h2>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Your intelligent study companion. Upload documents from the sidebar to start referencing them in your chat.
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`flex items-start max-w-[85%] rounded-2xl p-4 space-x-3 shadow-sm ${msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                : 'bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-white/50 dark:border-zinc-700 rounded-bl-none text-foreground'
                                }`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                                    <Bot className="w-4 h-4 text-primary" />
                                </div>
                            )}
                            <div className="leading-relaxed text-sm">
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                                <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                                    <User className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-white/50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-border flex items-center space-x-3 shadow-sm backdrop-blur-sm">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex space-x-1">
                                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border-t border-white/50 dark:border-zinc-700/50 z-10 shrink-0">
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Cherág about your documents..."
                        className="w-full px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-transparent focus:border-primary/50 rounded-full shadow-lg shadow-primary/5 focus:shadow-primary/20 focus:outline-none transition-all text-sm placeholder:text-muted-foreground pr-14"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:bg-muted-foreground transition-all shadow-md group"
                    >
                        <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
}
