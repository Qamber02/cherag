
import { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Trash2, LogOut, User, Database, Sparkles, Mail, Check, X, Bot } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { usePreferences } from '../hooks/usePreferences';

interface SettingsTabProps {
    userEmail?: string;
    onSignOut: () => void;
    onClearData: () => Promise<void>;
}

export default function SettingsTab({ userEmail, onSignOut, onClearData }: SettingsTabProps) {
    const { preferences, updatePreference } = usePreferences();

    // Initialize from localStorage or system preference
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const [isClearing, setIsClearing] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    // Email change state
    const [showEmailChange, setShowEmailChange] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Sync theme with localStorage and document
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const handleClearData = async () => {
        setIsClearing(true);
        try {
            await onClearData();
            setShowConfirmClear(false);
        } finally {
            setIsClearing(false);
        }
    };

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    const handleEmailChange = async () => {
        if (!newEmail || newEmail === userEmail) return;

        setEmailLoading(true);
        setEmailMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;

            setEmailMessage({ type: 'success', text: 'Verification email sent to your new address!' });
            setNewEmail('');
            setShowEmailChange(false);
        } catch (err: any) {
            setEmailMessage({ type: 'error', text: err.message });
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <div className="p-8 min-h-full glass-panel">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg shadow-amber-500/25">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
                    </div>
                </div>

                {/* Account Section */}
                <section className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Account
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* Current Email */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail || 'Not signed in'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                    Active
                                </span>
                                <button
                                    onClick={() => setShowEmailChange(!showEmailChange)}
                                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                >
                                    Change
                                </button>
                            </div>
                        </div>

                        {/* Email Change Form */}
                        {showEmailChange && (
                            <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl space-y-3">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="New email address"
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white dark:bg-zinc-700 text-foreground"
                                        />
                                    </div>
                                    <button
                                        onClick={handleEmailChange}
                                        disabled={emailLoading || !newEmail}
                                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                    >
                                        {emailLoading ? '...' : <Check className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => setShowEmailChange(false)}
                                        className="px-3 py-2 bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                {emailMessage && (
                                    <p className={`text-sm ${emailMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                        {emailMessage.text}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Sign Out Button */}
                        <button
                            onClick={onSignOut}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Appearance
                        </h2>
                    </div>
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Toggle dark theme</p>
                            </div>
                            <button
                                onClick={toggleDarkMode}
                                role="switch"
                                aria-checked={isDarkMode}
                                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                                className={`relative w-14 h-8 rounded-full transition-colors ${isDarkMode ? 'bg-amber-500' : 'bg-gray-200'
                                    }`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform flex items-center justify-center ${isDarkMode ? 'translate-x-7' : 'translate-x-1'
                                    }`}>
                                    {isDarkMode ? <Moon className="w-3 h-3 text-amber-500" /> : <Sun className="w-3 h-3 text-gray-400" />}
                                </div>
                            </button>
                        </div>
                    </div>
                </section>

                {/* AI Preferences Section */}
                <section className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            AI Preferences
                        </h2>
                    </div>
                    <div className="p-4 space-y-6">
                        {/* Model Selection */}
                        <div>
                            <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Preferred AI Model</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Choose which AI powers your experience</p>
                            </div>

                            {/* Base providers */}
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Base Providers</p>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {[
                                    { id: 'auto',        label: '⚡ Auto (Best)',    desc: 'Smart fallback chain' },
                                    { id: 'gemini',      label: '✦ Gemini',          desc: 'Google Gemini models' },
                                    { id: 'deepseek',    label: '🔷 DeepSeek',       desc: 'DeepSeek Chat' },
                                    { id: 'openrouter',  label: '🔀 OpenRouter',      desc: 'OpenRouter models' },
                                ].map((option) => {
                                    const isSelected = preferences.aiModel === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            id={`model-btn-${option.id}`}
                                            onClick={() => updatePreference('aiModel', option.id as any)}
                                            title={option.desc}
                                            className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border flex flex-col items-start gap-0.5 ${
                                                isSelected
                                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 ring-1 ring-indigo-500/20'
                                                    : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-700'
                                            }`}
                                        >
                                            <span className="flex items-center gap-1.5 w-full">
                                                {option.label}
                                                {isSelected && <Check className="w-3 h-3 ml-auto shrink-0" />}
                                            </span>
                                            <span className="text-xs opacity-60 font-normal">{option.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Groq — Production Models */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider">⚡ Groq — Production</span>
                                <div className="flex-1 h-px bg-orange-200 dark:bg-orange-900/50" />
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 mb-4">
                                {[
                                    { id: 'llama-3.1-8b-instant',   label: 'Llama 3.1 8B',        speed: '560 t/s',  price: '$0.05/$0.08 per 1M' },
                                    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',       speed: '280 t/s',  price: '$0.59/$0.79 per 1M' },
                                    { id: 'openai/gpt-oss-120b',    label: 'GPT-OSS 120B',         speed: '500 t/s',  price: '$0.15/$0.60 per 1M' },
                                    { id: 'openai/gpt-oss-20b',     label: 'GPT-OSS 20B',          speed: '1000 t/s', price: '$0.075/$0.30 per 1M' },
                                    { id: 'groq/compound',          label: 'Groq Compound',         speed: '~450 t/s', price: 'Free (web+code)' },
                                    { id: 'groq/compound-mini',     label: 'Groq Compound Mini',    speed: '~450 t/s', price: 'Free (web+code)' },
                                ].map((option) => {
                                    const isSelected = preferences.aiModel === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            id={`model-btn-${option.id.replace(/\//g, '-')}`}
                                            onClick={() => updatePreference('aiModel', option.id as any)}
                                            className={`w-full px-3 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-3 ${
                                                isSelected
                                                    ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 ring-1 ring-orange-500/20'
                                                    : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-700'
                                            }`}
                                        >
                                            <span className="flex-1 text-left font-medium">{option.label}</span>
                                            <span className="text-xs opacity-60 shrink-0">{option.speed}</span>
                                            <span className="text-xs opacity-50 shrink-0 hidden sm:inline">{option.price}</span>
                                            {isSelected && <Check className="w-3 h-3 shrink-0 text-orange-500" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Groq — Preview Models */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">🔬 Groq — Preview</span>
                                <div className="flex-1 h-px bg-purple-200 dark:bg-purple-900/50" />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Preview models may be discontinued. Not recommended for production.</p>
                            <div className="grid grid-cols-1 gap-1.5">
                                {[
                                    { id: 'openai/gpt-oss-safeguard-20b',         label: 'Safety GPT-OSS 20B',       speed: '1000 t/s', price: '$0.075/$0.30 per 1M' },
                                    { id: 'qwen/qwen3.6-27b',                     label: 'Qwen 3.6-27B',             speed: '500 t/s',  price: '$0.60/$3.00 per 1M' },
                                    { id: 'meta-llama/llama-prompt-guard-2-22m',  label: 'Prompt Guard 2 22M',       speed: '—',        price: '$0.03/$0.03 per 1M' },
                                    { id: 'meta-llama/llama-prompt-guard-2-86m',  label: 'Prompt Guard 2 86M',       speed: '—',        price: '$0.04/$0.04 per 1M' },
                                    { id: 'canopylabs/orpheus-v1-english',         label: 'Orpheus English TTS',      speed: '—',        price: '$22/1M chars' },
                                    { id: 'canopylabs/orpheus-arabic-saudi',       label: 'Orpheus Arabic TTS',       speed: '—',        price: '$40/1M chars' },
                                ].map((option) => {
                                    const isSelected = preferences.aiModel === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            id={`model-btn-${option.id.replace(/\//g, '-')}`}
                                            onClick={() => updatePreference('aiModel', option.id as any)}
                                            className={`w-full px-3 py-2 rounded-xl text-sm font-medium transition-all border flex items-center gap-3 ${
                                                isSelected
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 ring-1 ring-purple-500/20'
                                                    : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-700'
                                            }`}
                                        >
                                            <span className="flex-1 text-left font-medium">{option.label}</span>
                                            <span className="text-xs opacity-60 shrink-0">{option.speed}</span>
                                            <span className="text-xs opacity-50 shrink-0 hidden sm:inline">{option.price}</span>
                                            {isSelected && <Check className="w-3 h-3 shrink-0 text-purple-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Response Verbosity */}
                        <div>
                            <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Response Detail Level</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Control how verbose the AI responses should be</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {['Concise', 'Balanced', 'Detailed'].map((option) => {
                                    const current = localStorage.getItem('ai_verbosity') || 'Balanced';
                                    const isSelected = current === option;
                                    return (
                                        <button
                                            key={option}
                                            onClick={() => {
                                                localStorage.setItem('ai_verbosity', option);
                                                window.dispatchEvent(new Event('storage'));
                                                setIsDarkMode(prev => prev);
                                            }}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isSelected
                                                ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-700'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Data Management Section */}
                <section className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Data Management
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Clear All Data</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Remove all flashcards, quizzes, videos, and chat history</p>
                        </div>

                        {!showConfirmClear ? (
                            <button
                                onClick={() => setShowConfirmClear(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear All Data
                            </button>
                        ) : (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-3">
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                    ⚠️ This action cannot be undone. All your data will be permanently deleted.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowConfirmClear(false)}
                                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleClearData}
                                        disabled={isClearing}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {isClearing ? 'Clearing...' : 'Yes, Delete Everything'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* About Section */}
                <section className="bg-gradient-to-br from-primary/10 to-orange-500/10 rounded-2xl border border-primary/20 p-6 text-center">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Cherág</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">AI-Powered Study Assistant</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Version 3.0 • Production Release</p>
                </section>
            </div>
        </div>
    );
}
