// useLearningReels - Main feed orchestration hook
// Manages feed state, navigation, and loading

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { generateLearningFeed, refreshFeed } from '../lib/premium/videoIntelligence/feedGenerator';
import type { FeedItem, UseLearningReelsReturn } from '../types/videoIntelligence.types';

/**
 * Main hook for Learning Reels feed
 */
export function useLearningReels(): UseLearningReelsReturn {
    const { user } = useAuth();

    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currentItem = feed[currentIndex] || null;

    /**
     * Load initial feed
     */
    const loadFeed = useCallback(async () => {
        if (!user) {
            setError('User not authenticated');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newFeed = await generateLearningFeed(user.id, 20);

            if (newFeed.length === 0) {
                setError('No clips available. Try uploading documents or generating Study Shorts first.');
                setHasMore(false);
            } else {
                setFeed(newFeed);
                setCurrentIndex(0);
                setHasMore(newFeed.length >= 20);
            }

        } catch (err) {
            console.error('[useLearningReels] Failed to load feed:', err);
            setError('Failed to load feed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    /**
     * Navigate to next item
     */
    const nextItem = useCallback(() => {
        if (currentIndex < feed.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else if (hasMore) {
            // TODO: Load more items
            console.log('[useLearningReels] Need to load more items');
        }
    }, [currentIndex, feed.length, hasMore]);

    /**
     * Navigate to previous item
     */
    const prevItem = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    /**
     * Refresh feed with new rankings
     */
    const refreshFeedCallback = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            // Get IDs of already watched clips
            const watchedIds = feed
                .slice(0, currentIndex + 1)
                .filter(item => item.type === 'clip')
                .map(item => (item.data as import('../types/videoIntelligence.types').VideoClip).id);

            const newFeed = await refreshFeed(user.id, watchedIds);

            if (newFeed.length > 0) {
                setFeed(newFeed);
                setCurrentIndex(0);
                setHasMore(newFeed.length >= 20);
            } else {
                // Empty feed from refresh - keep current feed but signal no more items
                setHasMore(false);
            }

        } catch (err) {
            console.error('[useLearningReels] Failed to refresh:', err);
            setError('Failed to refresh feed');
        } finally {
            setIsLoading(false);
        }
    }, [user, feed, currentIndex]);

    /**
     * Go to specific index
     */
    const goToIndex = useCallback((index: number) => {
        if (index >= 0 && index < feed.length) {
            setCurrentIndex(index);
        }
    }, [feed.length]);

    // Load feed on mount
    useEffect(() => {
        if (user && feed.length === 0 && !isLoading) {
            loadFeed();
        }
    }, [user, feed.length, isLoading, loadFeed]);

    return {
        feed,
        currentIndex,
        currentItem,
        isLoading,
        hasMore,
        error,
        loadFeed,
        nextItem,
        prevItem,
        refreshFeed: refreshFeedCallback,
        goToIndex,
    };
}
