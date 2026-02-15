import { ArrowRight, Sparkles, Brain } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

interface HeroSectionProps {
    session: Session;
    onUpload: () => void;
}

export default function HeroSection({ session, onUpload }: HeroSectionProps) {
    const userName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Scholar';

    return (
        <div className="relative w-full rounded-3xl overflow-hidden glass-card border-none shadow-warm-glow mb-8 transition-all duration-500 group">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-orange-500/10 to-transparent opacity-80" />
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse-slow" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-amber-600/20 rounded-full blur-3xl animate-pulse-slow delay-700" />

            <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">

                {/* Text Content */}
                <div className="max-w-2xl text-center md:text-left space-y-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur-md shadow-sm">
                        <Sparkles className="w-3 h-3 text-primary mr-2" />
                        <span className="text-xs font-medium text-foreground tracking-wide uppercase">AI Study Companion</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">{userName}</span>
                    </h1>

                    <p className="text-lg text-muted-foreground/90 max-w-lg mx-auto md:mx-0 leading-relaxed">
                        Ready to supercharge your learning? Your AI can now create deeper mental models and simulate exams.
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                        <button
                            onClick={onUpload}
                            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center group/btn"
                        >
                            <span className="mr-2">Upload Materials</span>
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>

                        <button className="px-6 py-3 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-white/70 dark:hover:bg-black/30 text-foreground font-semibold border border-white/20 transition-all backdrop-blur-sm">
                            View Roadmap
                        </button>
                    </div>
                </div>

                {/* Visual / Illustration */}
                <div className="relative shrink-0 w-64 h-64 md:w-80 md:h-80 flex items-center justify-center hidden md:flex">
                    {/* Central Brain with Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-orange-500/40 rounded-full blur-3xl animate-pulse-slow" />

                    <div className="relative w-48 h-48 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-warm-glow animate-float">
                        <Brain className="w-24 h-24 text-primary drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />

                        {/* Orbiting Elements */}
                        <div className="absolute inset-0 animate-spin-slow">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                        </div>
                        <div className="absolute inset-0 animate-spin-reverse-slower">
                            <div className="absolute bottom-4 right-8 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
