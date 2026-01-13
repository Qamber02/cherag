
import { useState } from 'react';
import { Settings, Moon, Sun, Trash2, LogOut, User, Database, Sparkles, Mail, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface SettingsTabProps {
    userEmail?: string;
    onSignOut: () => void;
    onClearData: () => Promise<void>;
}

export default function SettingsTab({ userEmail, onSignOut, onClearData }: SettingsTabProps) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    // Email change state
    const [showEmailChange, setShowEmailChange] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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
        document.documentElement.classList.toggle('dark');
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
        <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg shadow-amber-500/25">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                        <p className="text-sm text-gray-500">Manage your account and preferences</p>
                    </div>
                </div>

                {/* Account Section */}
                <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Account
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* Current Email */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Email</p>
                                <p className="text-sm text-gray-500">{userEmail || 'Not signed in'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
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
                            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="New email address"
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
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
                                        className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
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
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </section>

                {/* Appearance Section */}
                <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Appearance
                        </h2>
                    </div>
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Dark Mode</p>
                                <p className="text-sm text-gray-500">Toggle dark theme</p>
                            </div>
                            <button
                                onClick={toggleDarkMode}
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

                {/* Data Management Section */}
                <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Data Management
                        </h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Clear All Data</p>
                            <p className="text-sm text-gray-500">Remove all flashcards, quizzes, videos, and chat history</p>
                        </div>

                        {!showConfirmClear ? (
                            <button
                                onClick={() => setShowConfirmClear(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear All Data
                            </button>
                        ) : (
                            <div className="p-4 bg-red-50 rounded-xl space-y-3">
                                <p className="text-sm text-red-600 font-medium">
                                    ⚠️ This action cannot be undone. All your data will be permanently deleted.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowConfirmClear(false)}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
                <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 p-6 text-center">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Cherág</h3>
                    <p className="text-sm text-gray-600 mb-2">AI-Powered Study Assistant</p>
                    <p className="text-xs text-gray-500">Version 3.0 • Production Release</p>
                </section>
            </div>
        </div>
    );
}
