import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, Check, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '../components/ui/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

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
    const { showToast } = useToast();
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
            showToast('Message copied to clipboard', 'success');
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            showToast('Failed to copy text', 'error');
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
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20 animate-float transform rotate-3 hover:rotate-6 transition-transform duration-500">
                            <Sparkles className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Cherág Insights</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">
                            Upload your study materials to get instant summaries, quizzes, and answers.
                        </p>

                        {/* Suggested Prompts */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            {suggestedPrompts.map((prompt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onSendMessage(prompt)}
                                    className="p-5 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:shadow-md transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                        {prompt}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => {
                        const msgId = msg.id || `msg-${idx}`;
                        return (
                            <motion.div
                                key={msgId}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`group relative max-w-[85%] lg:max-w-[75%] ${msg.role === 'user' ? '' : ''}`}>
                                    <div
                                        className={`flex items-start rounded-3xl p-5 space-x-4 shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-sm'
                                            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-bl-sm text-gray-900 dark:text-white'
                                            }`}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="p-2 bg-amber-100/50 dark:bg-amber-900/20 rounded-xl shrink-0">
                                                <Bot className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                                            </div>
                                        )}
                                        <div className="leading-7 text-base overflow-hidden w-full">
                                            <div className="markdown-content prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900 prose-pre:p-0 prose-headings:font-bold prose-headings:text-base prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:underline">
                                                <ReactMarkdown
                                                    components={{
                                                        // Custom code block renderer to allow copying
                                                        code({ node, inline, className, children, ...props }: any) {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            return !inline && match ? (
                                                                <div className="relative group rounded-md overflow-hidden my-3 border border-gray-200 dark:border-gray-700">
                                                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
                                                                        <span className="text-xs text-gray-500 font-mono lower">{match[1]}</span>
                                                                        <button
                                                                            onClick={() => navigator.clipboard.writeText(String(children))}
                                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                                            title="Copy code"
                                                                        >
                                                                            <Copy className="w-3 h-3 text-gray-500" />
                                                                        </button>
                                                                    </div>
                                                                    <pre className="!m-0 !p-3 !bg-gray-50 dark:!bg-gray-900 overflow-x-auto text-sm">
                                                                        <code className={className} {...props}>
                                                                            {children}
                                                                        </code>
                                                                    </pre>
                                                                </div>
                                                            ) : (
                                                                <code className={`${className} bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono`} {...props}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="p-2 bg-white/20 rounded-xl shrink-0">
                                                <User className="w-5 h-5 text-white" />
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
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

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

            {/* Input Area - Touch Optimized */}
            <div className="p-3 md:p-4 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 z-10 shrink-0">
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Cherág about your documents..."
                        className="w-full px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-primary/50 rounded-full shadow-lg focus:shadow-primary/20 focus:outline-none transition-all text-base placeholder:text-gray-400 pr-14"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 w-11 h-11 md:w-12 md:h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:shadow-lg disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-400 transition-all group flex items-center justify-center active:scale-95"
                    >
                        <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
}
