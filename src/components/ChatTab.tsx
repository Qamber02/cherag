import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, Check, RotateCcw, Trash2 } from 'lucide-react';

export interface Message {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatTabProps {
    messages: Message[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    onClearChat?: () => void;
}

export default function ChatTab({ messages, onSendMessage, isLoading, onClearChat }: ChatTabProps) {
    const [input, setInput] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
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

    const copyToClipboard = async (content: string, id: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const suggestedPrompts = [
        "Summarize the main points",
        "Create study questions",
        "Explain in simpler terms",
        "What are the key takeaways?"
    ];

    return (
        <div className="flex flex-col h-full relative">
            {/* Header */}
            {messages.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary" />
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-200">Cherág AI</span>
                        <span className="text-xs text-gray-400">• {messages.length} messages</span>
                    </div>
                    {onClearChat && (
                        <button
                            onClick={onClearChat}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Clear chat"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Chat Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/25 animate-float">
                            <Sparkles className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Cherág A.I.</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                            Your intelligent study companion. Upload documents and ask questions about them.
                        </p>

                        {/* Suggested Prompts */}
                        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                            {suggestedPrompts.map((prompt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onSendMessage(prompt)}
                                    className="p-4 text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                >
                                    <span className="text-gray-700 dark:text-gray-200 group-hover:text-primary">{prompt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const msgId = msg.id || `msg-${idx}`;
                    return (
                        <div
                            key={msgId}
                            className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`group relative max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                                <div
                                    className={`flex items-start rounded-2xl p-4 space-x-3 shadow-sm ${msg.role === 'user'
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-none'
                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none text-gray-900 dark:text-white'
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

                                {/* Message Actions */}
                                {msg.role === 'assistant' && (
                                    <div className="absolute -bottom-3 left-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => copyToClipboard(msg.content, msgId)}
                                            className="p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                            title="Copy"
                                        >
                                            {copiedId === msgId ? (
                                                <Check className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <Copy className="w-3 h-3 text-gray-400" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onSendMessage(`Regenerate: ${messages[idx - 1]?.content || 'previous response'}`)}
                                            className="p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                            title="Regenerate"
                                        >
                                            <RotateCcw className="w-3 h-3 text-gray-400" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center space-x-3 shadow-sm">
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
            <div className="p-4 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 z-10 shrink-0">
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Cherág about your documents..."
                        className="w-full px-6 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-primary/50 rounded-full shadow-lg focus:shadow-primary/20 focus:outline-none transition-all text-sm placeholder:text-gray-400 pr-14"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:shadow-lg disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-400 transition-all group"
                    >
                        <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
}
