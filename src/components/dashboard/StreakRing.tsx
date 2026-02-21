import { useEffect, useState } from 'react';
import { getStreakData } from '../../lib/streakService';

interface StreakRingProps {
    userId: string;
}

export default function StreakRing({ userId }: StreakRingProps) {
    const [streak, setStreak] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getStreakData(userId).then((data) => {
            if (!cancelled) {
                setStreak(data.currentStreak);
                setLoaded(true);
            }
        });
        return () => { cancelled = true; };
    }, [userId]);

    // Ring math: full circle at 7 days, wraps around
    const maxDays = 7;
    const progress = Math.min(streak / maxDays, 1);
    const radius = 80;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
        <div className="relative shrink-0 w-52 h-52 md:w-64 md:h-64 flex items-center justify-center hidden md:flex">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-orange-500/30 rounded-full blur-3xl animate-pulse-slow" />

            <svg
                className="relative w-full h-full drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                viewBox="0 0 200 200"
            >
                {/* Track ring */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress ring */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="url(#streakGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={loaded ? dashOffset : circumference}
                    transform="rotate(-90 100 100)"
                    className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
                {/* Gradient definition */}
                <defs>
                    <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(35, 90%, 55%)" />
                        <stop offset="100%" stopColor="hsl(25, 95%, 50%)" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                    {streak}-Day
                </span>
                <span className="text-base md:text-lg font-display font-semibold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                    Streak
                </span>
            </div>
        </div>
    );
}
