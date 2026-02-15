// Interaction Analyzer - Process user actions into learning signals
// Updates mastery scores based on engagement patterns

import { supabase } from '../../supabaseClient';
import type { ClipInteraction } from '../../../types/videoIntelligence.types';

import { saveActivity } from '../../activityService';

/**
 * Record watch interaction
 */
export async function recordWatchInteraction(
    userId: string,
    clipId: string,
    watchDuration: number,
    totalDuration: number
): Promise<void> {
    try {
        const completion = watchDuration / totalDuration;
        let masteryDelta = 0;

        // Calculate mastery change based on completion
        if (completion > 0.8) {
            // Watched most of it - positive signal
            masteryDelta = 0.1;

            // Log as significant activity if completed
            await saveActivity({
                user_id: userId,
                activity_type: 'video',
                title: `Watched Video Clip`,
                content_preview: `Completed ${Math.round(completion * 100)}% of video.`,
                metadata: { clipId, completion, watchDuration }
            });
        } else if (completion < 0.3) {
            // Skipped quickly - neutral/negative
            masteryDelta = -0.05;
        }

        await upsertInteraction(userId, clipId, {
            watch_duration: Math.round(watchDuration),
            total_duration: Math.round(totalDuration),
            mastery_delta: masteryDelta,
            last_watched: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[InteractionAnalyzer] Failed to record watch:', error);
    }
}

/**
 * Record skip interaction (user skipped quickly)
 */
export async function recordSkipInteraction(
    userId: string,
    clipId: string
): Promise<void> {
    try {
        await upsertInteraction(userId, clipId, {
            skipped: true,
            mastery_delta: -0.1, // Penalty for skipping
        });
    } catch (error) {
        console.error('[InteractionAnalyzer] Failed to record skip:', error);
    }
}

/**
 * Record replay interaction (confusion signal)
 */
export async function recordReplayInteraction(
    userId: string,
    clipId: string
): Promise<void> {
    try {
        const { data: existing } = await supabase
            .from('clip_interactions')
            .select('replay_count, confusion_score')
            .eq('user_id', userId)
            .eq('clip_id', clipId)
            .single();

        const newReplayCount = (existing?.replay_count || 0) + 1;
        const confusionScore = Math.min(1.0, 0.2 + (newReplayCount * 0.1));

        await upsertInteraction(userId, clipId, {
            replay_count: newReplayCount,
            confusion_score: confusionScore,
            mastery_delta: -0.1, // Replay indicates uncertainty
        });

    } catch (error) {
        console.error('[InteractionAnalyzer] Failed to record replay:', error);
    }
}

/**
 * Record like interaction (mastery signal)
 */
export async function recordLikeInteraction(
    userId: string,
    clipId: string
): Promise<void> {
    try {
        await upsertInteraction(userId, clipId, {
            liked: true,
            mastery_delta: 0.2, // Strong positive signal
        });

        // Also update the concept graph
        await updateConceptMastery(userId, clipId, 0.2);
    } catch (error) {
        console.error('[InteractionAnalyzer] Failed to record like:', error);
    }
}

/**
 * Record pause interaction (thinking signal)
 */
export async function recordPauseInteraction(
    userId: string,
    clipId: string
): Promise<void> {
    try {
        const { data: existing } = await supabase
            .from('clip_interactions')
            .select('pause_count')
            .eq('user_id', userId)
            .eq('clip_id', clipId)
            .single();

        const newPauseCount = (existing?.pause_count || 0) + 1;

        await upsertInteraction(userId, clipId, {
            pause_count: newPauseCount,
            // Moderate pausing is good (thinking), excessive is confusing
            mastery_delta: newPauseCount <= 3 ? 0.05 : -0.05,
        });

    } catch (error) {
        console.error('[InteractionAnalyzer] Failed to record pause:', error);
    }
}

/**
 * Record recall attempt (strong learning signal)
 */
export async function recordRecallAttempt(
    userId: string,
    clipId: string,
    questionId: string,
    selectedIndex: number,
    correctIndex: number,
    timeTaken: number
): Promise<void> {
    try {
        const isCorrect = selectedIndex === correctIndex;

        // Store attempt
        await supabase.from('recall_attempts').insert({
            user_id: userId,
            clip_id: clipId,
            question_id: questionId,
            selected_index: selectedIndex,
            is_correct: isCorrect,
            time_taken_ms: timeTaken,
        });

        // Update interaction with mastery change
        const masteryDelta = isCorrect ? 0.3 : -0.15;

        await upsertInteraction(userId, clipId, {
            mastery_delta: masteryDelta,
        });

        // Update concept mastery in knowledge graph
        await updateConceptMastery(userId, clipId, masteryDelta);

    } catch (error) {
        console.error('[InteractionAnalyzer] Failed to record recall:', error);
    }
}

/**
 * Upsert interaction record
 */
async function upsertInteraction(
    userId: string,
    clipId: string,
    updates: Partial<ClipInteraction>
): Promise<void> {
    const { error } = await supabase
        .from('clip_interactions')
        .upsert({
            user_id: userId,
            clip_id: clipId,
            ...updates,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,clip_id',
        });

    if (error) {
        console.error('[InteractionAnalyzer] Upsert failed:', error);
    }
}

/**
 * Update concept mastery in knowledge graph
 */
async function updateConceptMastery(
    userId: string,
    clipId: string,
    masteryDelta: number
): Promise<void> {
    try {
        // Get clip concept
        const { data: clip } = await supabase
            .from('video_clips')
            .select('concept')
            .eq('id', clipId)
            .single();

        if (!clip) return;

        const concept = clip.concept;

        // Get current mastery
        const { data: existing } = await supabase
            .from('concept_dependencies')
            .select('mastery_level')
            .eq('user_id', userId)
            .eq('concept', concept)
            .single();

        const currentMastery = existing?.mastery_level || 0.5;
        const newMastery = Math.max(0, Math.min(1, currentMastery + masteryDelta));

        // Upsert concept mastery
        await supabase
            .from('concept_dependencies')
            .upsert({
                user_id: userId,
                concept: concept,
                mastery_level: newMastery,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,concept',
            });

    } catch (error) {
        console.error('[InteractionAnalyzer  ] Failed to update concept mastery:', error);
    }
}

/**
 * Get interaction summary for a clip
 */
export async function getInteractionSummary(
    userId: string,
    clipId: string
): Promise<ClipInteraction | null> {
    try {
        const { data } = await supabase
            .from('clip_interactions')
            .select('*')
            .eq('user_id', userId)
            .eq('clip_id', clipId)
            .single();

        return data as ClipInteraction | null;

    } catch (error) {
        console.error('[InteractionAnalyzer] Failed to get summary:', error);
        return null;
    }
}

/**
 * Batch process interactions (for offline sync)
 */
export async function batchProcessInteractions(
    interactions: Array<{
        userId: string;
        clipId: string;
        action: 'watch' | 'skip' | 'replay' | 'like' | 'pause';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata?: any;
    }>
): Promise<void> {
    for (const interaction of interactions) {
        const { userId, clipId, action, metadata } = interaction;

        switch (action) {
            case 'watch':
                await recordWatchInteraction(
                    userId,
                    clipId,
                    metadata.watchDuration,
                    metadata.totalDuration
                );
                break;
            case 'skip':
                await recordSkipInteraction(userId, clipId);
                break;
            case 'replay':
                await recordReplayInteraction(userId, clipId);
                break;
            case 'like':
                await recordLikeInteraction(userId, clipId);
                break;
            case 'pause':
                await recordPauseInteraction(userId, clipId);
                break;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
