import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, Lock, BookOpen, Sparkles, Brain, Lightbulb } from 'lucide-react';
import logoImg from '../assets/logo.png';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    // Password strength validation
    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
        return null;
    };

    // Sanitize error messages to prevent internal error disclosure
    const sanitizeErrorMessage = (errorMessage: string): string => {
        const msg = errorMessage.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid password')) {
            return 'Invalid email or password';
        }
        if (msg.includes('email not confirmed')) {
            return 'Please verify your email before signing in';
        }
        if (msg.includes('user already registered')) {
            return 'An account with this email already exists';
        }
        if (msg.includes('rate limit') || msg.includes('too many')) {
            return 'Too many attempts. Please try again later';
        }
        // Default safe message
        return 'An error occurred. Please try again.';
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/');
            } else if (mode === 'signup') {
                // Validate password strength before signup
                const pwdError = validatePassword(password);
                if (pwdError) {
                    setError(pwdError);
                    setLoading(false);
                    return;
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/`
                    }
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            } else if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                setMessage('Password reset link sent to your email!');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[Auth]', message); // Log for debugging
            setError(sanitizeErrorMessage(message));
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: BookOpen, text: 'AI-Powered Summaries' },
        { icon: Brain, text: 'Smart Flashcards' },
        { icon: Lightbulb, text: 'Interactive Quizzes' },
        { icon: Sparkles, text: 'Learning Roadmaps' },
    ];

    return (
        <div className="flex min-h-screen">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-zinc-900 to-black relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-40 right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center p-16 text-white">
                    {/* Logo */}
                    <div className="mb-12">
                        <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/20 mb-6">
                            <img src={logoImg} alt="Cherág" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-5xl font-bold mb-4">
                            Cherág
                        </h1>
                        <p className="text-xl text-white/70 max-w-md">
                            Illuminate your learning journey with AI-powered study tools
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/90 font-medium">{feature.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Quote */}
                    <div className="mt-12 pt-8 border-t border-white/10">
                        <p className="text-white/50 text-sm italic">
                            "The light of knowledge illuminates the path to wisdom"
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-zinc-900 dark:to-black">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-block w-20 h-20 rounded-2xl overflow-hidden shadow-lg mb-4">
                            <img src={logoImg} alt="Cherág" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cherág</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Your AI Study Partner</p>

                        {/* Mobile Features Highlight */}
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                            {[
                                { icon: BookOpen, text: 'AI Summaries' },
                                { icon: Brain, text: 'Flashcards' },
                                { icon: Lightbulb, text: 'Quizzes' },
                                { icon: Sparkles, text: 'Roadmaps' }
                            ].map((feature, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full"
                                >
                                    <feature.icon className="w-3 h-3" />
                                    {feature.text}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Card */}
                    <div className="glass-card p-8 relative">
                        {/* Header */}
                        {mode === 'forgot' ? (
                            <div className="flex items-center gap-3 mb-6">
                                <button
                                    onClick={() => setMode('login')}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </button>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">We'll send you a reset link</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {mode === 'login' ? 'Welcome back!' : 'Create account'}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    {mode === 'login' ? 'Sign in to continue learning' : 'Start your learning journey'}
                                </p>
                            </div>
                        )}

                        {/* Mode Tabs */}
                        {mode !== 'forgot' && (
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
                                <button
                                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'login'
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    onClick={() => setMode('login')}
                                >
                                    Sign In
                                </button>
                                <button
                                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'signup'
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    onClick={() => setMode('signup')}
                                >
                                    Sign Up
                                </button>
                            </div>
                        )}

                        {/* Error/Success Messages */}
                        {error && (
                            <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="p-4 mb-4 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                                {message}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 dark:bg-zinc-900/50 text-foreground placeholder-muted-foreground transition-all"
                                    />
                                </div>
                            </div>

                            {mode !== 'forgot' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 dark:bg-zinc-900/50 text-foreground placeholder-muted-foreground transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {mode === 'login' && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => setMode('forgot')}
                                        className="text-sm text-primary hover:text-primary/80 font-medium"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 text-white font-semibold bg-primary rounded-xl hover:bg-orange-600 focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all shadow-warm-glow flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : mode === 'login' ? (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                    </>
                                ) : mode === 'signup' ? (
                                    'Create Account'
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
                        By continuing, you agree to our{' '}
                        <a href="#" className="text-primary hover:underline">Terms</a>
                        {' '}and{' '}
                        <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
