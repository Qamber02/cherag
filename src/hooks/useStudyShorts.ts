
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Video {
    id: string;
    youtube_id: string;
    title: string;
    thumbnail_url: string;
    channel?: string;
    relevanceScore?: number;
}

interface VideoResponse {
    id: string;
    title: string;
    thumbnail: string;
    channel?: string;
    relevanceScore?: number;
}

export function useStudyShorts(user: any, context: string) {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [currentTopic, setCurrentTopic] = useState<string>('');

    useEffect(() => {
        if (user) fetchVideos();
    }, [user]);

    const fetchVideos = async () => {
        const { data } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });
        setVideos(data as Video[] || []);
    };

    const mapResponseToVideo = (v: VideoResponse): Video => ({
        id: v.id,
        youtube_id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail,
        channel: v.channel,
        relevanceScore: v.relevanceScore
    });

    const generateShorts = async (customTopic?: string) => {
        if (!context && !customTopic) return;
        setIsLoading(true);
        setVideos([]); // Clear for fresh feel
        setNextPageToken(null);
        setHasMore(true);

        try {
            // Clear old videos from user's DB
            await supabase.from('videos').delete().eq('user_id', user.id);

            const topic = customTopic || context.slice(0, 200);
            setCurrentTopic(topic);

            // Use client-side video generation
            const { generateVideos } = await import('../lib/aiService');
            const data = await generateVideos(topic, null);

            const ytVideos: VideoResponse[] = data.result || [];
            setNextPageToken(data.nextPageToken || null);
            setHasMore(!!data.nextPageToken);

            if (ytVideos.length === 0) {
                console.log('[useStudyShorts] No verified videos found');
                setHasMore(false);
                return;
            }

            // Map and set
            const mapped = ytVideos.map(mapResponseToVideo);
            setVideos(mapped);

            // Save to DB
            const videosToInsert = mapped.map((v) => ({
                user_id: user.id,
                youtube_id: v.youtube_id,
                title: v.title,
                thumbnail_url: v.thumbnail_url
            }));

            await supabase.from('videos').insert(videosToInsert);

        } catch (err) {
            console.error('[useStudyShorts] Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || !nextPageToken) return;

        setIsLoadingMore(true);

        try {
            // Use client-side video generation
            const { generateVideos } = await import('../lib/aiService');
            const data = await generateVideos(currentTopic, nextPageToken);

            const ytVideos: VideoResponse[] = data.result || [];
            setNextPageToken(data.nextPageToken || null);
            setHasMore(!!data.nextPageToken && ytVideos.length > 0);

            if (ytVideos.length > 0) {
                const mapped = ytVideos.map(mapResponseToVideo);
                setVideos(prev => [...prev, ...mapped]);

                // Save new videos to DB
                const videosToInsert = mapped.map((v) => ({
                    user_id: user.id,
                    youtube_id: v.youtube_id,
                    title: v.title,
                    thumbnail_url: v.thumbnail_url
                }));

                await supabase.from('videos').insert(videosToInsert);
            }

        } catch (err) {
            console.error('[useStudyShorts] LoadMore error:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, nextPageToken, currentTopic, context, user]);

    return {
        videos,
        generateShorts,
        loadMore,
        isLoading,
        isLoadingMore,
        hasMore
    };
}
