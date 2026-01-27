// useClipInteractions - Track and sync user interactions
// Batches interactions locally and syncs to database

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
    recordRecallAttempt,
    batchProcessInteractions,
} from '../lib/premium/videoIntelligence/interactionAnalyzer';
import type { UseClipInteractionsReturn } from '../types/videoIntelligence.types';

/**
 * Validate if a string is a valid UUID format
 * Prevents "invalid input syntax for type uuid" errors when passing YouTube IDs
 */
function isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

interface PendingInteraction {
    userId: string;
    clipId: string;
    action: 'watch' | 'skip' | 'replay' | 'like' | 'pause';
    metadata?: any;
    timestamp: number;
}

const BATCH_SIZE = 5; // Sync every 5 interactions
const SYNC_INTERVAL_MS = 30000; // Also sync every 30 seconds

/**
 * Hook for tracking clip interactions with batch syncing
 */
export function useClipInteractions(): UseClipInteractionsReturn {
    const { user } = useAuth();

    const [pendingQueue, setPendingQueue] = useState<PendingInteraction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Add interaction to pending queue
     */
    const addToPending = useCallback((interaction: PendingInteraction) => {
        setPendingQueue(prev => [...prev, interaction]);
    }, []);

    /**
     * Sync pending interactions to database
     */
    const syncNow = useCallback(async () => {
        if (pendingQueue.length === 0 || isSyncing) return;

        setIsSyncing(true);

        try {
            await batchProcessInteractions(pendingQueue);
            setPendingQueue([]); // Clear queue after successful sync
            console.log(`[useClipInteractions] Synced ${pendingQueue.length} interactions`);
        } catch (error) {
            console.error('[useClipInteractions] Sync failed:', error);
            // Keep interactions in queue for retry
        } finally {
            setIsSyncing(false);
        }
    }, [pendingQueue, isSyncing]);

    /**
     * Record watch interaction
     */
    const recordWatch = useCallback((clipId: string, duration: number, totalDuration: number) => {
        if (!user || !isValidUUID(clipId)) return; // Skip client-side pseudo-clips

        addToPending({
            userId: user.id,
            clipId,
            action: 'watch',
            metadata: { watchDuration: duration, totalDuration },
            timestamp: Date.now(),
        });
    }, [user, addToPending]);

    /**
     * Record skip interaction
     */
    const recordSkip = useCallback((clipId: string) => {
        if (!user || !isValidUUID(clipId)) return; // Skip client-side pseudo-clips

        addToPending({
            userId: user.id,
            clipId,
            action: 'skip',
            timestamp: Date.now(),
        });
    }, [user, addToPending]);

    /**
     * Record replay interaction
     */
    const recordReplay = useCallback((clipId: string) => {
        if (!user || !isValidUUID(clipId)) return; // Skip client-side pseudo-clips

        addToPending({
            userId: user.id,
            clipId,
            action: 'replay',
            timestamp: Date.now(),
        });
    }, [user, addToPending]);

    /**
     * Record like interaction
     */
    const recordLike = useCallback((clipId: string) => {
        if (!user || !isValidUUID(clipId)) return; // Skip client-side pseudo-clips

        addToPending({
            userId: user.id,
            clipId,
            action: 'like',
            timestamp: Date.now(),
        });
    }, [user, addToPending]);

    /**
     * Record pause interaction
     */
    const recordPause = useCallback((clipId: string) => {
        if (!user || !isValidUUID(clipId)) return; // Skip client-side pseudo-clips

        addToPending({
            userId: user.id,
            clipId,
            action: 'pause',
            timestamp: Date.now(),
        });
    }, [user, addToPending]);

    /**
     * Record recall attempt (sync immediately - important signal)
     */
    const recordRecall = useCallback(async (
        clipId: string,
        questionId: string,
        correct: boolean,
        timeTaken: number
    ) => {
        if (!user || !isValidUUID(clipId)) return; // Skip client-side pseudo-clips

        // Recall attempts are synced immediately due to importance
        try {
            await recordRecallAttempt(
                user.id,
                clipId,
                questionId,
                correct ? 0 : 1, // Simplified - assume first option if correct
                0, // correctIndex placeholder
                timeTaken
            );
        } catch (error) {
            console.error('[useClipInteractions] Failed to record recall:', error);
        }
    }, [user]);

    // Auto-sync when queue reaches batch size
    useEffect(() => {
        if (pendingQueue.length >= BATCH_SIZE) {
            syncNow();
        }
    }, [pendingQueue.length, syncNow]);

    // Auto-sync on interval
    useEffect(() => {
        syncTimerRef.current = setInterval(() => {
            if (pendingQueue.length > 0) {
                syncNow();
            }
        }, SYNC_INTERVAL_MS);

        return () => {
            if (syncTimerRef.current) {
                clearInterval(syncTimerRef.current);
            }
        };
    }, [pendingQueue.length, syncNow]);

    // Sync remaining interactions on unmount
    useEffect(() => {
        return () => {
            if (pendingQueue.length > 0) {
                // Fire and forget - can't await in cleanup
                batchProcessInteractions(pendingQueue);
            }
        };
    }, [pendingQueue]);

    return {
        pendingSync: pendingQueue.length,
        isSyncing,
        recordWatch,
        recordSkip,
        recordReplay,
        recordLike,
        recordPause,
        recordRecall,
        syncNow,
    };
}
