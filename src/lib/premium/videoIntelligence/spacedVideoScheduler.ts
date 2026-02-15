// Spaced Video Scheduler - Spaced repetition for video clips
// Implements SM-2 algorithm variant for optimal review intervals

import { supabase } from '../../supabaseClient';
import type { SpacedRepetitionResult, ReviewInput } from '../../../types/videoIntelligence.types';

// Default ease factor for new clips
const DEFAULT_EASE_FACTOR = 2.5;

// Minimum ease factor to prevent too-frequent reviews
const MIN_EASE_FACTOR = 1.3;

// Maximum interval in days
const MAX_INTERVAL_DAYS = 180; // 6 months

/**
 * Calculate next review time based on performance
 * Uses simplified SM-2 algorithm
 */
export function calculateNextReview(input: ReviewInput): SpacedRepetitionResult {
    const { current_interval, ease_factor, quality } = input;

    let newInterval: number;
    let newEaseFactor = ease_factor;

    // Quality scale:
    // 0-1: Fail (incorrect, confused)
    // 2-3: Hard (correct with difficulty)
    // 4-5: Easy (confident, correct)

    if (quality < 2) {
        // Failed - reset to shortest interval
        newInterval = 0.5; // 12 hours
        newEaseFactor = Math.max(MIN_EASE_FACTOR, ease_factor - 0.2);

    } else if (quality === 2) {
        // Hard - slight increase
        newInterval = Math.max(1, current_interval * 1.2);
        newEaseFactor = Math.max(MIN_EASE_FACTOR, ease_factor - 0.15);

    } else if (quality === 3) {
        // Good - normal increase
        if (current_interval === 0) {
            newInterval = 1; // 1 day
        } else if (current_interval === 1) {
            newInterval = 3; // 3 days
        } else {
            newInterval = current_interval * newEaseFactor;
        }

    } else {
        // Easy - larger increase
        if (current_interval === 0) {
            newInterval = 3; // 3 days
        } else {
            newInterval = current_interval * (newEaseFactor + 0.2);
        }
        newEaseFactor = ease_factor + 0.1;
    }

    // Cap interval at maximum
    newInterval = Math.min(MAX_INTERVAL_DAYS, newInterval);

    // Round to nearest day
    newInterval = Math.round(newInterval);

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);

    return {
        next_review: nextReview.toISOString(),
        review_interval: newInterval,
        ease_factor: newEaseFactor,
    };
}

/**
 * Schedule next review for a clip after user interaction
 */
export async function scheduleNextReview(
    userId: string,
    clipId: string,
    performance: 'fail' | 'hard' | 'good' | 'easy'
): Promise<void> {
    try {
        // Get current interaction data
        const { data: interaction } = await supabase
            .from('clip_interactions')
            .select('review_interval, confusion_score')
            .eq('user_id', userId)
            .eq('clip_id', clipId)
            .single();

        const currentInterval = interaction?.review_interval || 0;

        // Map performance to quality score
        const qualityMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5> = {
            'fail': 0,
            'hard': 2,
            'good': 3,
            'easy': 5,
        };

        const quality = qualityMap[performance];

        // Get or initialize ease factor
        const ease_factor = DEFAULT_EASE_FACTOR - (interaction?.confusion_score || 0);

        // Calculate next review
        const result = calculateNextReview({
            current_interval: currentInterval,
            ease_factor: Math.max(MIN_EASE_FACTOR, ease_factor),
            quality,
        });

        // Update database
        await supabase
            .from('clip_interactions')
            .upsert({
                user_id: userId,
                clip_id: clipId,
                next_review: result.next_review,
                review_interval: result.review_interval,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,clip_id',
            });

        console.log(`[SpacedScheduler] Scheduled next review for clip ${clipId} in ${result.review_interval} days`);

    } catch (error) {
        console.error('[SpacedScheduler] Failed to schedule review:', error);
        throw error; // Propagate error so UI can react
    }
}

/**
 * Get clips due for review
 */
export async function getClipsDueForReview(userId: string): Promise<string[]> {
    try {
        const now = new Date().toISOString();

        const { data } = await supabase
            .from('clip_interactions')
            .select('clip_id')
            .eq('user_id', userId)
            .not('next_review', 'is', null)
            .lte('next_review', now)
            .order('next_review', { ascending: true });

        if (!data) return [];

        return data.map(item => item.clip_id);

    } catch (error) {
        console.error('[SpacedScheduler] Failed to get due clips:', error);
        return [];
    }
}

/**
 * Mark clip as reviewed (reset review timer)
 */
export async function markAsReviewed(
    userId: string,
    clipId: string,
    success: boolean
): Promise<void> {
    await scheduleNextReview(
        userId,
        clipId,
        success ? 'good' : 'fail'
    );
}

/**
 * Get review statistics for user
 */
export async function getReviewStats(userId: string): Promise<{
    total_clips: number;
    due_today: number;
    due_this_week: number;
    mastered: number;
}> {
    try {
        const { data: allInteractions } = await supabase
            .from('clip_interactions')
            .select('next_review, review_interval')
            .eq('user_id', userId);

        if (!allInteractions) {
            return {
                total_clips: 0,
                due_today: 0,
                due_this_week: 0,
                mastered: 0,
            };
        }

        const now = new Date();
        const today = new Date(now);
        today.setHours(23, 59, 59, 999);

        const weekFromNow = new Date(now);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        let dueToday = 0;
        let dueThisWeek = 0;
        let mastered = 0;

        for (const interaction of allInteractions) {
            if (!interaction.next_review) continue;

            const reviewDate = new Date(interaction.next_review);

            if (reviewDate <= today) {
                dueToday++;
            }

            if (reviewDate <= weekFromNow) {
                dueThisWeek++;
            }

            // Consider mastered if interval > 30 days
            if (interaction.review_interval > 30) {
                mastered++;
            }
        }

        return {
            total_clips: allInteractions.length,
            due_today: dueToday,
            due_this_week: dueThisWeek,
            mastered,
        };

    } catch (error) {
        console.error('[SpacedScheduler] Failed to get stats:', error);
        return {
            total_clips: 0,
            due_today: 0,
            due_this_week: 0,
            mastered: 0,
        };
    }
}
