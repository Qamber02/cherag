import { useEffect, useState } from 'react';
import { getStreakData, type DayActivity } from '../../lib/streakService';

interface StreakHeatmapProps {
    userId: string;
    onReview?: () => void;
}

export default function StreakHeatmap({ userId, onReview }: StreakHeatmapProps) {
    const [heatmap, setHeatmap] = useState<DayActivity[]>([]);
    const [streak, setStreak] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getStreakData(userId).then((data) => {
            if (!cancelled) {
                setHeatmap(data.heatmap);
                setStreak(data.currentStreak);
                setLoaded(true);
            }
        });
        return () => { cancelled = true; };
    }, [userId]);

    // Get intensity class based on count
    const getIntensity = (count: number): string => {
        if (count === 0) return 'bg-white/5 dark:bg-white/5';
        if (count === 1) return 'bg-primary/25';
        if (count <= 3) return 'bg-primary/50';
        return 'bg-primary/80';
    };

    // Build 8 columns × 7 rows grid (column-major = weeks)
    const columns = 8;
    const rows = 7;

    // Current week dots (last 7 days)
    const lastSevenDays = heatmap.slice(-7);

    return (
        <div className="glass-card rounded-2xl p-5 border border-white/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Flashcards Due</h3>
                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {streak}🔥
                </span>
            </div>

            {/* Heatmap Grid */}
            <div className="flex gap-1 justify-center mb-4">
                {Array.from({ length: columns }).map((_, col) => (
                    <div key={col} className="flex flex-col gap-1">
                        {Array.from({ length: rows }).map((_, row) => {
                            const idx = col * rows + row;
                            const day = heatmap[idx];
                            return (
                                <div
                                    key={row}
                                    className={`w-4 h-4 md:w-5 md:h-5 rounded-sm transition-all duration-300 ${loaded && day
                                        ? getIntensity(day.count)
                                        : 'bg-white/5'
                                        }`}
                                    title={day ? `${day.date}: ${day.count} activities` : ''}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Week dots row */}
            <div className="flex items-center justify-center gap-2 mt-2">
                {lastSevenDays.map((day, i) => (
                    <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${day.count > 0
                            ? 'bg-primary shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                            : 'bg-white/10'
                            }`}
                        title={`${day.date}: ${day.count}`}
                    />
                ))}
            </div>

            {/* Review Now button */}
            <button
                onClick={onReview}
                className="w-full mt-4 py-2.5 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-foreground font-medium text-sm transition-colors border border-white/10"
            >
                Review Now
            </button>
        </div>
    );
}
