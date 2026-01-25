// Learning Analytics Service
// Tracks user learning patterns, calculates confidence, and manages spaced repetition

import { supabase } from '../supabaseClient';

// ============================================
// TYPES
// ============================================

export interface LearningSession {
    id?: string;
    userId: string;
    conceptId: string;
    confidenceScore: number;
    attempts: number;
    lastReviewed: Date;
    nextReview: Date;
}

export interface ConceptDependency {
    id?: string;
    userId: string;
    concept: string;
    dependsOn: string[];
    masteryLevel: number;
    stressTested: boolean;
}

export interface LearningProfile {
    id?: string;
    userId: string;
    learningStyle: string;
    peakHours: number[];
    cognitiveStrengths: string[];
    preferredDifficulty: string;
}

export interface SessionMetrics {
    startTime: Date;
    duration: number;
    correctAnswers: number;
    totalAnswers: number;
    responseTimes: number[];
    conceptsTouched: string[];
}

// ============================================
// CONFIDENCE CALCULATION
// ============================================

/**
 * Calculate confidence score using SM-2 like algorithm
 * Factors: correctness, response time, recency, consistency
 */
export function calculateConfidence(
    previousConfidence: number,
    isCorrect: boolean,
    responseTimeMs: number,
    averageResponseTimeMs: number
): number {
    // Base adjustment
    let adjustment = isCorrect ? 0.1 : -0.2;

    // Speed bonus (faster than average = better recall)
    if (isCorrect && responseTimeMs < averageResponseTimeMs * 0.8) {
        adjustment += 0.05; // Fast correct answer
    } else if (isCorrect && responseTimeMs > averageResponseTimeMs * 1.5) {
        adjustment -= 0.03; // Slow but correct - hesitant
    }

    // Apply adjustment with bounds
    const newConfidence = Math.max(0, Math.min(100, previousConfidence + adjustment * 100));

    return Math.round(newConfidence * 10) / 10;
}

/**
 * Calculate next review date using spaced repetition
 * Based on confidence level and previous intervals
 */
export function calculateNextReview(
    confidence: number,
    previousIntervalDays: number = 1
): Date {
    let interval: number;

    if (confidence < 20) {
        interval = 0; // Same day
    } else if (confidence < 40) {
        interval = 1; // Tomorrow
    } else if (confidence < 60) {
        interval = Math.max(3, previousIntervalDays * 1.5);
    } else if (confidence < 80) {
        interval = Math.max(7, previousIntervalDays * 2);
    } else {
        interval = Math.max(14, previousIntervalDays * 2.5);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + Math.floor(interval));
    return nextReview;
}

// ============================================
// SESSION TRACKING
// ============================================

interface ActiveSession {
    startTime: Date;
    metrics: SessionMetrics;
    errors: number[];
    responseTimes: number[];
}

let currentSession: ActiveSession | null = null;

/**
 * Start a new study session
 */
export function startSession(): void {
    currentSession = {
        startTime: new Date(),
        metrics: {
            startTime: new Date(),
            duration: 0,
            correctAnswers: 0,
            totalAnswers: 0,
            responseTimes: [],
            conceptsTouched: [],
        },
        errors: [],
        responseTimes: [],
    };
    console.log('[Analytics] Session started');
}

/**
 * Record an interaction (quiz answer, flashcard flip, etc.)
 */
export function recordInteraction(
    isCorrect: boolean,
    responseTimeMs: number,
    conceptId?: string
): void {
    if (!currentSession) {
        startSession();
    }

    currentSession!.metrics.totalAnswers++;
    if (isCorrect) {
        currentSession!.metrics.correctAnswers++;
    }

    currentSession!.metrics.responseTimes.push(responseTimeMs);
    currentSession!.errors.push(isCorrect ? 0 : 1);
    currentSession!.responseTimes.push(responseTimeMs);

    if (conceptId && !currentSession!.metrics.conceptsTouched.includes(conceptId)) {
        currentSession!.metrics.conceptsTouched.push(conceptId);
    }
}

/**
 * Get current session metrics for cognitive load analysis
 */
export function getSessionMetrics(): {
    sessionMinutes: number;
    errorRateTrend: number[];
    responseTimesMs: number[];
    contentSwitches: number;
} | null {
    if (!currentSession) return null;

    const now = new Date();
    const sessionMinutes = Math.round(
        (now.getTime() - currentSession.startTime.getTime()) / 60000
    );

    return {
        sessionMinutes,
        errorRateTrend: currentSession.errors.slice(-10), // Last 10 answers
        responseTimesMs: currentSession.responseTimes.slice(-10),
        contentSwitches: currentSession.metrics.conceptsTouched.length,
    };
}

/**
 * End session and return summary
 */
export function endSession(): SessionMetrics | null {
    if (!currentSession) return null;

    const now = new Date();
    currentSession.metrics.duration = Math.round(
        (now.getTime() - currentSession.startTime.getTime()) / 60000
    );

    const metrics = { ...currentSession.metrics };
    currentSession = null;
    console.log('[Analytics] Session ended', metrics);
    return metrics;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Get or create learning session for a concept
 */
export async function getConceptSession(
    userId: string,
    conceptId: string
): Promise<LearningSession | null> {
    const { data, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[Analytics] Error fetching session:', error);
        return null;
    }

    if (!data) return null;

    return {
        id: data.id,
        userId: data.user_id,
        conceptId: data.concept_id,
        confidenceScore: data.confidence_score,
        attempts: data.attempts,
        lastReviewed: new Date(data.last_reviewed),
        nextReview: new Date(data.next_review),
    };
}

/**
 * Update learning session with new confidence
 */
export async function updateConceptSession(
    userId: string,
    conceptId: string,
    confidenceScore: number
): Promise<void> {
    const nextReview = calculateNextReview(confidenceScore);

    const { error } = await supabase
        .from('learning_sessions')
        .upsert({
            user_id: userId,
            concept_id: conceptId,
            confidence_score: confidenceScore,
            attempts: 1, // Will be incremented by trigger
            last_reviewed: new Date().toISOString(),
            next_review: nextReview.toISOString(),
        }, {
            onConflict: 'user_id,concept_id',
        });

    if (error) {
        console.error('[Analytics] Error updating session:', error);
    }
}

/**
 * Get concepts due for review
 */
export async function getDueForReview(userId: string): Promise<LearningSession[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .lte('next_review', now)
        .order('next_review', { ascending: true })
        .limit(10);

    if (error) {
        console.error('[Analytics] Error fetching due reviews:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        conceptId: row.concept_id,
        confidenceScore: row.confidence_score,
        attempts: row.attempts,
        lastReviewed: new Date(row.last_reviewed),
        nextReview: new Date(row.next_review),
    }));
}

/**
 * Get user's learning profile
 */
export async function getLearningProfile(userId: string): Promise<LearningProfile | null> {
    const { data, error } = await supabase
        .from('learning_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('[Analytics] Error fetching profile:', error);
        return null;
    }

    return {
        id: data.id,
        userId: data.user_id,
        learningStyle: data.learning_style,
        peakHours: data.peak_hours,
        cognitiveStrengths: data.cognitive_strengths,
        preferredDifficulty: data.preferred_difficulty,
    };
}

/**
 * Save learning profile
 */
export async function saveLearningProfile(profile: LearningProfile): Promise<void> {
    const { error } = await supabase
        .from('learning_profiles')
        .upsert({
            user_id: profile.userId,
            learning_style: profile.learningStyle,
            peak_hours: profile.peakHours,
            cognitive_strengths: profile.cognitiveStrengths,
            preferred_difficulty: profile.preferredDifficulty,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id',
        });

    if (error) {
        console.error('[Analytics] Error saving profile:', error);
    }
}

/**
 * Get all mastery levels for a user (for knowledge radar)
 */
export async function getUserMastery(userId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
        .from('learning_sessions')
        .select('concept_id, confidence_score')
        .eq('user_id', userId);

    if (error) {
        console.error('[Analytics] Error fetching mastery:', error);
        return {};
    }

    const mastery: Record<string, number> = {};
    for (const row of data || []) {
        mastery[row.concept_id] = row.confidence_score;
    }
    return mastery;
}

// ============================================
// ACTIVITY HISTORY
// ============================================

/**
 * Get recent learning activity for DNA profile
 */
export async function getActivityHistory(
    userId: string,
    days: number = 30
): Promise<Array<{
    startTime: string;
    durationMinutes: number;
    performanceScore: number;
    contentTypes: string[];
}>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // This would typically query an activity log table
    // For now, we'll derive from existing data
    const { data, error } = await supabase
        .from('learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('last_reviewed', since.toISOString())
        .order('last_reviewed', { ascending: false });

    if (error || !data) {
        return [];
    }

    // Group by day and aggregate
    const sessionsMap = new Map<string, {
        startTime: string;
        durationMinutes: number;
        performanceScore: number;
        contentTypes: Set<string>;
    }>();

    for (const row of data) {
        const dateKey = row.last_reviewed.split('T')[0];
        if (!sessionsMap.has(dateKey)) {
            sessionsMap.set(dateKey, {
                startTime: row.last_reviewed,
                durationMinutes: 30, // Estimate
                performanceScore: row.confidence_score,
                contentTypes: new Set(['concept_review']),
            });
        } else {
            const existing = sessionsMap.get(dateKey)!;
            existing.performanceScore = (existing.performanceScore + row.confidence_score) / 2;
            existing.durationMinutes += 5;
        }
    }

    return Array.from(sessionsMap.values()).map(s => ({
        ...s,
        contentTypes: Array.from(s.contentTypes),
    }));
}
