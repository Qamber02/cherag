
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export interface Video {
    id: string;
    youtube_id: string;
    title: string;
    thumbnail: string;
    channel?: string;
    relevanceScore?: number;
    duration?: string;
}

export function useStudyShorts(user: User | null, context: string) {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastQuery, setLastQuery] = useState('');
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);

    // Load saved videos on mount
    useEffect(() => {
        if (!user) return;

        async function loadSavedVideos() {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('study_shorts')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!error && data && data.length > 0) {
                    const mappedVideos: Video[] = data.map((v: any) => ({
                        id: v.youtube_id || v.id,
                        youtube_id: v.youtube_id,
                        title: v.title,
                        thumbnail: v.thumbnail,
                        channel: v.channel,
                        relevanceScore: v.relevance_score,
                        duration: v.duration || '1:00'
                    }));
                    setVideos(mappedVideos);
                }
            } catch (err) {
                console.error('Error loading saved videos:', err);
            }
        }

        loadSavedVideos();
    }, [user]);

    // Save videos to database
    async function saveVideosToDatabase(videosToSave: Video[]) {
        if (!user) return;

        try {
            const videosForDb = videosToSave.map(v => ({
                user_id: user.id,
                youtube_id: v.youtube_id,
                title: v.title,
                thumbnail: v.thumbnail,
                channel: v.channel,
                relevance_score: v.relevanceScore,
                duration: v.duration,
            }));

            // Upsert to avoid duplicates
            const { error } = await supabase
                .from('study_shorts')
                .upsert(videosForDb, {
                    onConflict: 'user_id,youtube_id',
                    ignoreDuplicates: true
                });

            if (error) {
                console.warn('[StudyShorts] Save to DB failed (table may not exist):', error.message);
            } else {
                console.log(`[StudyShorts] Saved ${videosToSave.length} videos to database`);
            }
        } catch (err) {
            console.error('Error saving videos:', err);
        }
    }

    const generateShorts = async (topic?: string) => {
        if (!user) return;
        setIsLoading(true);
        setHasMore(true);
        setNextPageToken(null);

        try {
            const { generateVideos } = await import('../lib/aiService');
            // Use context as topic if no explicit topic
            const query = topic || context.slice(0, 200) || 'educational';
            setLastQuery(query);

            const { result, nextPageToken: token } = await generateVideos(query);
            setNextPageToken(token);

            const mappedVideos: Video[] = result.map((v: any) => ({
                id: v.id,
                youtube_id: v.id,
                title: v.title,
                thumbnail: v.thumbnail,
                channel: v.channel,
                relevanceScore: v.relevanceScore,
                duration: '1:00'
            }));

            setVideos(mappedVideos);

            // Save to database for Learning Reels
            saveVideosToDatabase(mappedVideos);
        } catch (err: any) {
            console.error('Error generating shorts:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMore = async () => {
        if (!user || isLoadingMore || !hasMore || !nextPageToken) return;
        setIsLoadingMore(true);
        try {
            const { generateVideos } = await import('../lib/aiService');
            const { result, nextPageToken: token } = await generateVideos(lastQuery, nextPageToken);

            setNextPageToken(token);
            if (!token) setHasMore(false);

            const mappedVideos: Video[] = result.map((v: any) => ({
                id: v.id,
                youtube_id: v.id,
                title: v.title,
                thumbnail: v.thumbnail,
                channel: v.channel,
                relevanceScore: v.relevanceScore,
                duration: '1:00'
            }));

            setVideos(prev => [...prev, ...mappedVideos]);

            // Save new videos to database
            saveVideosToDatabase(mappedVideos);

        } catch (err: any) {
            console.error('Error loading more shorts:', err);
            setHasMore(false);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Reset to initial state (clear all videos)
    const resetVideos = () => {
        setVideos([]);
        setLastQuery('');
        setNextPageToken(null);
        setHasMore(true);
    };

    return { videos, generateShorts, loadMore, resetVideos, isLoading, isLoadingMore, hasMore };
}
