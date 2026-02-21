// Streak Service - Computes study streak and heatmap data from activity_history
import { supabase } from './supabaseClient';

export interface DayActivity {
    date: string; // YYYY-MM-DD
    count: number;
}

export interface StreakData {
    currentStreak: number;
    heatmap: DayActivity[];
}

/**
 * Get the current study streak (consecutive days with at least 1 activity)
 * and a heatmap of daily activity for the past ~8 weeks.
 */
export async function getStreakData(userId: string): Promise<StreakData> {
    try {
        // Fetch activities from the past 60 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data, error } = await supabase
            .from('activity_history')
            .select('created_at')
            .eq('user_id', userId)
            .gte('created_at', sixtyDaysAgo.toISOString())
            .order('created_at', { ascending: false });

        if (error || !data) {
            console.error('[StreakService] Error fetching activities:', error);
            return { currentStreak: 0, heatmap: buildEmptyHeatmap() };
        }

        // Group activities by date (local timezone)
        const activityByDate = new Map<string, number>();
        for (const row of data) {
            const dateStr = new Date(row.created_at).toLocaleDateString('en-CA'); // YYYY-MM-DD
            activityByDate.set(dateStr, (activityByDate.get(dateStr) || 0) + 1);
        }

        // Calculate current streak
        const currentStreak = computeStreak(activityByDate);

        // Build heatmap for past 56 days (8 weeks)
        const heatmap = buildHeatmap(activityByDate);

        return { currentStreak, heatmap };
    } catch (e) {
        console.error('[StreakService] Unexpected error:', e);
        return { currentStreak: 0, heatmap: buildEmptyHeatmap() };
    }
}

function computeStreak(activityByDate: Map<string, number>): number {
    let streak = 0;
    const today = new Date();

    // Start from today and walk backwards
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA');

        if (activityByDate.has(dateStr)) {
            streak++;
        } else {
            // If it's today and no activity yet, check yesterday
            if (i === 0) continue;
            break;
        }
    }

    return streak;
}

function buildHeatmap(activityByDate: Map<string, number>): DayActivity[] {
    const days: DayActivity[] = [];
    const today = new Date();

    for (let i = 55; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA');
        days.push({
            date: dateStr,
            count: activityByDate.get(dateStr) || 0,
        });
    }

    return days;
}

function buildEmptyHeatmap(): DayActivity[] {
    return buildHeatmap(new Map());
}
