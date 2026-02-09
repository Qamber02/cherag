// Clip Ranker - Score and rank clips based on user context
// Pure algorithmic ranking - NO AI calls

import type {
    VideoClip,
    RankedClip,
    ClipRankingSignals,
    FeedConfig,
} from '../../../types/videoIntelligence.types';

// Default ranking weights
export const DEFAULT_FEED_CONFIG: FeedConfig = {
    weakConceptBoost: 3.0,
    upcomingExamBoost: 2.5,
    recentFailureBoost: 2.0,
    importanceMultiplier: 1.5,
    diversityBonus: 1.0,
    masteredPenalty: -2.0,
    recentSkipPenalty: -1.5,

    minClipsPerFeed: 10,
    maxClipsPerFeed: 50,
    recallPromptInterval: 4, // Every 4 clips
    diversityThreshold: 3, // Max 3 same-concept clips in a row
};

// Helper: Check if concept matches using word boundaries (not substring)
function conceptMatches(concept: string, target: string): boolean {
    const conceptLower = concept.toLowerCase();
    const targetLower = target.toLowerCase();
    // Use word boundary regex for more accurate matching
    const regex = new RegExp(`\\b${targetLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(conceptLower);
}

/**
 * Rank clips based on personalized signals
 * Returns sorted array with scores and reasons
 */
export function rankClips(
    clips: VideoClip[],
    signals: ClipRankingSignals,
    config: FeedConfig = DEFAULT_FEED_CONFIG
): RankedClip[] {
    const rankedClips: RankedClip[] = clips.map(clip => {
        const score = calculateClipScore(clip, signals, config);
        const reason = generateRankingReason(clip, signals);

        return {
            ...clip,
            score,
            reason,
            rank: 0, // Will be set after sorting
        };
    });

    // Sort by score (highest first)
    rankedClips.sort((a, b) => b.score - a.score);

    // Assign ranks
    rankedClips.forEach((clip, index) => {
        clip.rank = index + 1;
    });

    // Apply diversity filter
    return applyDiversityFilter(rankedClips, config.diversityThreshold);
}

/**
 * Calculate score for a single clip
 */
function calculateClipScore(
    clip: VideoClip,
    signals: ClipRankingSignals,
    config: FeedConfig
): number {
    let score = 0;
    const concept = clip.concept.toLowerCase();

    // 1. Weak Concept Boost
    const mastery = signals.userMastery[concept] ?? 0.5;
    if (mastery < 0.5) {
        const weaknessLevel = (0.5 - mastery) * 2; // 0-1 scale
        score += weaknessLevel * config.weakConceptBoost;
    }

    // 2. Upcoming Exam Boost
    for (const exam of signals.upcomingExams) {
        if (conceptMatches(concept, exam.topic)) {
            const urgency = Math.max(0, 1 - (exam.days_until / 30)); // More urgent as exam approaches
            score += urgency * config.upcomingExamBoost;
        }
    }

    // 3. Recent Failure Boost
    if (signals.failedConcepts.some(fc => conceptMatches(concept, fc))) {
        score += config.recentFailureBoost;
    }

    // 4. Importance Multiplier
    score += (clip.importance_score / 10) * config.importanceMultiplier;

    // 5. Difficulty Alignment
    const difficultyGap = Math.abs(clip.difficulty - signals.preferredDifficulty);
    if (difficultyGap === 0) {
        score += config.diversityBonus;
    } else {
        score -= difficultyGap * 0.3; // Penalty for mismatched difficulty
    }

    // 6. Mastered Penalty
    if (mastery > 0.8) {
        score += config.masteredPenalty;
    }

    // 7. Recent Skip Penalty
    if (signals.recentSkips.includes(clip.id)) {
        score += config.recentSkipPenalty;
    }

    // 8. Already Watched Penalty
    if (signals.watchedClips.has(clip.id)) {
        score -= 1.0;
    }

    // 9. Recent Like Boost
    if (signals.recentLikes.includes(clip.id)) {
        score += 1.5;
    }

    // Ensure minimum score of 0
    return Math.max(0, score);
}

/**
 * Generate human-readable reason for ranking
 */
function generateRankingReason(
    clip: VideoClip,
    signals: ClipRankingSignals
): string {
    const concept = clip.concept.toLowerCase();
    const mastery = signals.userMastery[concept] ?? 0.5;

    // Prioritize reasons
    if (mastery < 0.3) {
        return `Weak mastery in "${clip.concept}" (${Math.round(mastery * 100)}%)`;
    }

    const upcomingExam = signals.upcomingExams.find(e =>
        conceptMatches(concept, e.topic)
    );
    if (upcomingExam && upcomingExam.days_until <= 7) {
        return `Exam in ${upcomingExam.days_until} days: ${upcomingExam.topic}`;
    }

    if (signals.failedConcepts.some(fc => conceptMatches(concept, fc))) {
        return `Recent quiz failure in "${clip.concept}"`;
    }

    if (clip.importance_score >= 8) {
        return `High importance concept (${clip.importance_score}/10)`;
    }

    if (mastery < 0.5) {
        return `Building confidence in "${clip.concept}" (${Math.round(mastery * 100)}%)`;
    }

    return `Recommended for you`;
}

/**
 * Apply diversity filter to prevent too many same-concept clips in a row
 */
function applyDiversityFilter(
    clips: RankedClip[],
    maxSameConcept: number
): RankedClip[] {
    const filtered: RankedClip[] = [];
    const conceptWindow: string[] = [];

    for (const clip of clips) {
        // Check if this concept appears too many times in recent window
        const recentCount = conceptWindow.filter(c => c === clip.concept).length;

        if (recentCount < maxSameConcept) {
            filtered.push(clip);
            conceptWindow.push(clip.concept);

            // Keep window size limited
            if (conceptWindow.length > maxSameConcept * 2) {
                conceptWindow.shift();
            }
        }
    }

    return filtered;
}

/**
 * Get top N clips from ranked list
 */
export function getTopClips(
    rankedClips: RankedClip[],
    count: number
): RankedClip[] {
    return rankedClips.slice(0, count);
}

/**
 * Filter clips by minimum score threshold
 */
export function filterByMinScore(
    clips: RankedClip[],
    minScore: number
): RankedClip[] {
    return clips.filter(clip => clip.score >= minScore);
}

/**
 * Balance feed with mix of difficulties
 */
export function balanceDifficulty(
    clips: RankedClip[],
    targetCount: number
): RankedClip[] {
    // Group by difficulty
    const byDifficulty = new Map<number, RankedClip[]>();

    for (const clip of clips) {
        const diff = clip.difficulty;
        if (!byDifficulty.has(diff)) {
            byDifficulty.set(diff, []);
        }
        byDifficulty.get(diff)!.push(clip);
    }

    // Take proportionally from each difficulty
    const result: RankedClip[] = [];
    const perDifficulty = Math.ceil(targetCount / byDifficulty.size);

    for (const [_difficulty, diffClips] of byDifficulty) {
        result.push(...diffClips.slice(0, perDifficulty));
    }

    // Sort by score again
    result.sort((a, b) => b.score - a.score);

    return result.slice(0, targetCount);
}
