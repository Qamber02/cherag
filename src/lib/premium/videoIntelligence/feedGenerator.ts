// Feed Generator - Assemble personalized learning feed
// Combines ranking, recall questions, and spaced repetition

import { supabase } from '../../supabaseClient';
import { getAllClips } from './clipExtractor';
import { rankClips, DEFAULT_FEED_CONFIG } from './clipRanker';
import type {
    FeedItem,
    FeedConfig,
    ClipRankingSignals,
    VideoClip,
    RecallQuestion,
    RecallPrompt,
} from '../../../types/videoIntelligence.types';

/**
 * Generate personalized feed for user
 */
export async function generateLearningFeed(
    userId: string,
    count: number = 20,
    config: FeedConfig = DEFAULT_FEED_CONFIG
): Promise<FeedItem[]> {
    try {
        // Step 1: Gather ranking signals
        const signals = await gatherRankingSignals(userId);

        // Step 2: Get all available clips
        const allClips = await getAllClips();

        if (allClips.length === 0) {
            console.warn('[FeedGenerator] No clips available');
            return [];
        }

        // Step 3: Rank clips
        const rankedClips = rankClips(allClips, signals, config);

        // Step 4: Select top clips
        const selectedClips = rankedClips.slice(0, Math.min(count, config.maxClipsPerFeed));

        // Step 5: Interleave with recall prompts
        const feed = await interleaveRecallPrompts(
            selectedClips,
            config.recallPromptInterval
        );

        console.log(`[FeedGenerator] Generated feed with ${feed.length} items (${selectedClips.length} clips)`);

        return feed;

    } catch (error) {
        console.error('[FeedGenerator] Failed to generate feed:', error);
        return [];
    }
}

/**
 * Gather all ranking signals from user data
 */
async function gatherRankingSignals(userId: string): Promise<ClipRankingSignals> {
    // Fetch concept mastery from concept_dependencies
    const { data: conceptData } = await supabase
        .from('concept_dependencies')
        .select('concept, mastery_level')
        .eq('user_id', userId);

    const userMastery: Record<string, number> = {};
    const weakConcepts: string[] = [];

    if (conceptData) {
        for (const item of conceptData) {
            userMastery[item.concept.toLowerCase()] = item.mastery_level;
            if (item.mastery_level < 0.5) {
                weakConcepts.push(item.concept.toLowerCase());
            }
        }
    }

    // Fetch recent interactions
    const { data: interactionsData } = await supabase
        .from('clip_interactions')
        .select('clip_id, skipped, liked, last_watched')
        .eq('user_id', userId)
        .order('last_watched', { ascending: false })
        .limit(50);

    const recentSkips: string[] = [];
    const recentLikes: string[] = [];
    const watchedClips: string[] = [];

    if (interactionsData) {
        for (const interaction of interactionsData) {
            watchedClips.push(interaction.clip_id);
            if (interaction.skipped) {
                recentSkips.push(interaction.clip_id);
            }
            if (interaction.liked) {
                recentLikes.push(interaction.clip_id);
            }
        }
    }

    // Fetch failed quiz concepts - get all answered quizzes and filter incorrect ones
    const { data: quizData } = await supabase
        .from('quizzes')
        .select('question, user_answer, correct_answer')
        .eq('user_id', userId)
        .eq('answered', true)
        .order('created_at', { ascending: false })
        .limit(50);

    const failedConcepts: string[] = [];
    // Extract concepts from quiz questions (basic extraction)
    if (quizData) {
        for (const quiz of quizData) {
            // Only process incorrect answers
            if (quiz.user_answer !== quiz.correct_answer) {
                // Simple extraction - split question and take key terms
                const words = quiz.question.toLowerCase().split(' ');
                failedConcepts.push(...words.filter((w: string) => w.length > 5));
            }
        }
    }

    // Fetch exam data (from exam_simulations)
    const { data: examData } = await supabase
        .from('exam_simulations')
        .select('exam_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    const upcomingExams: Array<{ topic: string; days_until: number }> = [];
    // For MVP, assume exams are in 30 days
    if (examData && examData.length > 0) {
        for (const exam of examData) {
            upcomingExams.push({
                topic: exam.exam_type || 'General',
                days_until: 30,
            });
        }
    }

    // Fetch learning profile for preferences
    const { data: profileData } = await supabase
        .from('learning_profiles')
        .select('preferred_difficulty, learning_style')
        .eq('user_id', userId)
        .single();

    let preferredDifficulty: 1 | 2 | 3 | 4 | 5 = 3; // Default medium
    if (profileData && profileData.preferred_difficulty) {
        const diffMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
            'easy': 2,
            'medium': 3,
            'hard': 4,
        };
        preferredDifficulty = diffMap[profileData.preferred_difficulty] || 3;
    }

    return {
        userMastery,
        weakConcepts,
        upcomingExams,
        recentSkips: recentSkips.slice(0, 10),
        recentLikes: recentLikes.slice(0, 10),
        watchedClips,
        failedConcepts: [...new Set(failedConcepts)].slice(0, 10),
        preferredDifficulty,
        learningStyle: profileData?.learning_style || 'balanced',
    };
}

/**
 * Interleave recall prompts into clip feed
 */
async function interleaveRecallPrompts(
    clips: VideoClip[],
    interval: number
): Promise<FeedItem[]> {
    const feed: FeedItem[] = [];

    for (let i = 0; i < clips.length; i++) {
        // Add clip
        feed.push({
            type: 'clip',
            data: clips[i],
            index: feed.length,
        });

        // Every N clips, add a recall prompt
        if ((i + 1) % interval === 0 && i < clips.length - 1) {
            // Get recall question for a recent clip
            const clipForRecall = clips[Math.max(0, i - interval + 1)];
            const recallQuestion = await getOrCreateRecallQuestion(clipForRecall);

            if (recallQuestion) {
                feed.push({
                    type: 'recall',
                    data: {
                        clip: clipForRecall,
                        question: recallQuestion,
                        type: 'recall',
                    } as RecallPrompt,
                    index: feed.length,
                });
            }
        }
    }

    return feed;
}

/**
 * Get cached recall question or generate new one
 */
async function getOrCreateRecallQuestion(
    clip: VideoClip
): Promise<RecallQuestion | null> {
    try {
        // Skip database query for virtual/demo clips (they don't exist in DB)
        if (clip.id.startsWith('virtual-') || clip.id.startsWith('demo-')) {
            // For virtual clips, skip recall prompts for now
            return null;
        }

        // Check if question already exists
        const { data: existingQuestion } = await supabase
            .from('recall_questions')
            .select('*')
            .eq('clip_id', clip.id)
            .single();

        if (existingQuestion) {
            return existingQuestion as RecallQuestion;
        }

        // For MVP: Return null, questions will be generated on-demand
        // In full implementation, call AI service to generate question
        console.log(`[FeedGenerator] Recall question needed for clip ${clip.id}`);
        return null;

    } catch (error) {
        console.error('[FeedGenerator] Failed to get recall question:', error);
        return null;
    }
}

/**
 * Refresh feed with new rankings
 */
export async function refreshFeed(
    userId: string,
    excludeClipIds: string[] = []
): Promise<FeedItem[]> {
    const signals = await gatherRankingSignals(userId);

    // Add excluded clips to watched set
    for (const clipId of excludeClipIds) {
        signals.watchedClips.push(clipId);
    }

    return generateLearningFeed(userId, 20, DEFAULT_FEED_CONFIG);
}

/**
 * Get feed for specific concepts (topic-focused mode)
 */
export async function generateTopicFeed(
    userId: string,
    topics: string[],
    count: number = 15
): Promise<FeedItem[]> {
    const signals = await gatherRankingSignals(userId);

    // Get clips related to topics
    const { data: topicClips } = await supabase
        .from('video_clips')
        .select('*');

    if (!topicClips) {
        return [];
    }

    // Filter clips by topics
    const filtered = topicClips.filter(clip =>
        topics.some(topic =>
            clip.concept.toLowerCase().includes(topic.toLowerCase())
        )
    );

    const rankedClips = rankClips(filtered as VideoClip[], signals, DEFAULT_FEED_CONFIG);
    const selectedClips = rankedClips.slice(0, count);

    return interleaveRecallPrompts(selectedClips, 4);
}
