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
 * Validate if a string is a valid Clip ID (UUID or YouTube ID)
 */
function isValidClipId(id: string): boolean {
    if (!id) return false;
    if (id.startsWith('virtual-') || id.startsWith('demo-')) return true;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const youtubeRegex = /^[a-zA-Z0-9_-]{11}$/; // Basic YouTube ID format
    return uuidRegex.test(id) || youtubeRegex.test(id);
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
        const batch = [...pendingQueue]; // Snapshot

        try {
            await batchProcessInteractions(batch);
            // Only remove items that were in the batch
            setPendingQueue(prev => prev.filter(item => !batch.includes(item)));
            console.log(`[useClipInteractions] Synced ${batch.length} interactions`);
        } catch (error) {
            console.error('[useClipInteractions] Sync failed:', error);
            // Items stay in queue
        } finally {
            setIsSyncing(false);
        }
    }, [pendingQueue, isSyncing]);

    // Auto-sync when queue reaches batch size
    useEffect(() => {
        if (pendingQueue.length >= BATCH_SIZE && !isSyncing) {
            syncNow();
        }
    }, [pendingQueue.length, isSyncing, syncNow]);

    // Auto-sync on interval (stabilized)
    useEffect(() => {
        const timer = setInterval(() => {
            if (pendingQueue.length > 0 && !isSyncing) {
                syncNow();
            }
        }, SYNC_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [pendingQueue.length, isSyncing, syncNow]);

    /**
     * Record recall attempt
     */
    const recordRecall = useCallback(async (
        clipId: string,
        questionId: string,
        correct: boolean,
        timeTaken: number
    ) => {
        if (!user || !isValidClipId(clipId)) return;

        try {
            await recordRecallAttempt(
                user.id,
                clipId,
                questionId,
                0, // selected_index placeholder (needs UI update to pass real index)
                0, // correct_index placeholder
                timeTaken
            );
        } catch (error) {
            console.error('[useClipInteractions] Failed to record recall:', error);
        }
    }, [user]);

    // ... wrappers ...
    const recordWatch = useCallback((clipId: string, duration: number, totalDuration: number) => {
        if (!user || !isValidClipId(clipId)) return;
        addToPending({ userId: user.id, clipId, action: 'watch', metadata: { watchDuration: duration, totalDuration }, timestamp: Date.now() });
    }, [user, addToPending]);

    const recordSkip = useCallback((clipId: string) => {
        if (!user || !isValidClipId(clipId)) return;
        addToPending({ userId: user.id, clipId, action: 'skip', timestamp: Date.now() });
    }, [user, addToPending]);

    const recordReplay = useCallback((clipId: string) => {
        if (!user || !isValidClipId(clipId)) return;
        addToPending({ userId: user.id, clipId, action: 'replay', timestamp: Date.now() });
    }, [user, addToPending]);

    const recordLike = useCallback((clipId: string) => {
        if (!user || !isValidClipId(clipId)) return;
        addToPending({ userId: user.id, clipId, action: 'like', timestamp: Date.now() });
    }, [user, addToPending]);

    const recordPause = useCallback((clipId: string) => {
        if (!user || !isValidClipId(clipId)) return;
        addToPending({ userId: user.id, clipId, action: 'pause', timestamp: Date.now() });
    }, [user, addToPending]);

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
