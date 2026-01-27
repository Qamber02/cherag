// StudyShortsTab - Video reels viewer with infinite scroll
// Powered by ReelPlayer Engine
import { useRef, useState, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, Loader2, Search, X, Home, RotateCcw } from 'lucide-react';
import type { Video } from '../hooks/useStudyShorts';
import type { VideoClip } from '../types/videoIntelligence.types';
import ReelPlayer from './premium/ReelPlayer';
import RecallPrompt from './premium/RecallPrompt';
import { useClipInteractions } from '../hooks/useClipInteractions';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { useVideoContext } from './premium/VideoContext';

interface StudyShortsTabProps {
    videos: Video[];
    isLoading: boolean;
    isLoadingMore?: boolean;
    hasMore?: boolean;
    onGenerate: (topic?: string) => void;
    onLoadMore?: () => void;
    onReset?: () => void;
    onExit?: () => void;
    hasUnknownContext: boolean;
}

export default function StudyShortsTab({
    videos,
    isLoading,
    isLoadingMore = false,
    hasMore = true,
    onGenerate,
    onLoadMore,
    onReset,
    onExit,
    hasUnknownContext
}: StudyShortsTabProps) {
    const [searchTopic, setSearchTopic] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [hasInitializedScroll, setHasInitializedScroll] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const interactions = useClipInteractions();

    // Map videos to VideoClip format
    const feedItems = useMemo(() => {
        return videos.map((video, index) => {
            // Parse duration "MM:SS" to seconds
            let durationSecs = 60;
            if (video.duration) {
                const parts = video.duration.split(':').map(Number);
                if (parts.length === 2) durationSecs = parts[0] * 60 + parts[1];
                else if (parts.length === 3) durationSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }

            const clip: VideoClip = {
                id: video.id || `video-${index}`,
                video_id: video.youtube_id,
                concept: video.title,
                start_time: 0,
                end_time: durationSecs,
                difficulty: 3,
                importance_score: video.relevanceScore || 5,
                prerequisites: [],
                metadata: {
                    title: video.title,
                    channel: video.channel,
                    thumbnail_url: video.thumbnail
                },
                created_at: new Date().toISOString()
            };

            // Inject recall questions occasionally (every 5 videos)
            // For MVP we just use clips, but structure is ready for interspersing
            return {
                type: 'clip' as const,
                data: clip,
                index
            };
        });
    }, [videos]);

    // Create IntersectionObserver once
    useEffect(() => {
        const observerOptions = {
            root: scrollContainerRef.current,
            threshold: 0.6 // Video must be 60% visible to count as active
        };

        const observerCallback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Extract index from data attribute for reliability
                    const indexAttr = entry.target.getAttribute('data-index');
                    if (indexAttr) {
                        const index = parseInt(indexAttr, 10);
                        if (!isNaN(index)) {
                            setCurrentIndex(index);
                        }
                    }
                }
            });
        };

        observerRef.current = new IntersectionObserver(observerCallback, observerOptions);

        // Observe all currently registered items
        itemRefs.current.forEach((el) => {
            observerRef.current?.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, []); // Only create once

    // Ref callback for each item - handles observation
    const setItemRef = useCallback((index: number, id: string) => (el: HTMLDivElement | null) => {
        const key = `${id}-${index}`;
        if (el) {
            itemRefs.current.set(key, el);
            observerRef.current?.observe(el);
        } else {
            const existing = itemRefs.current.get(key);
            if (existing) {
                observerRef.current?.unobserve(existing);
                itemRefs.current.delete(key);
            }
        }
    }, []);

    // Scroll to first item when videos are loaded (initial position)
    useLayoutEffect(() => {
        if (feedItems.length > 0 && scrollContainerRef.current && !hasInitializedScroll) {
            // Ensure we start at the top (first video)
            scrollContainerRef.current.scrollTop = 0;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentIndex(0);
             
            setHasInitializedScroll(true);
        }
    }, [feedItems.length, hasInitializedScroll]);

    // Reset scroll state when videos change completely (new search)
    useEffect(() => {
        if (videos.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHasInitializedScroll(false);
        }
    }, [videos.length]);

    // Sync current index with global video context
    const { setActivePlayerId } = useVideoContext() || {};

    useEffect(() => {
        if (feedItems[currentIndex] && feedItems[currentIndex].type === 'clip') {
            const clipId = (feedItems[currentIndex].data as VideoClip).id;
            setActivePlayerId?.(clipId);
        } else {
            setActivePlayerId?.(null);
        }
    }, [currentIndex, feedItems, setActivePlayerId]);

    // Infinite scroll trigger
    useEffect(() => {
        if (!onLoadMore || !hasMore || isLoadingMore) return;
        if (currentIndex >= feedItems.length - 2) {
            onLoadMore();
        }
    }, [currentIndex, feedItems.length, hasMore, isLoadingMore, onLoadMore]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTopic.trim()) {
            onGenerate(searchTopic.trim());
            setSearchTopic('');
            setShowSearch(false);
        }
    };

    const nextItem = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: (currentIndex + 1) * scrollContainerRef.current.clientHeight,
                behavior: 'smooth'
            });
        }
    };

    // Loading State (Initial)
    if (isLoading && videos.length === 0) {
        return (
            <div className="flex flex-col h-full bg-black items-center justify-center">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-white/60">Curating your customized feed...</p>
                <p className="text-white/40 text-sm mt-2">Finding the best educational shorts</p>
            </div>
        );
    }

    // Empty State
    if (videos.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col h-full bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-600/20 z-0"></div>
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-8 text-center">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Study Shorts</h2>
                    <p className="text-white/60 mb-8 max-w-sm">
                        AI-verified short videos. Only strictly educational content passes our filters.
                    </p>

                    <form onSubmit={handleSearch} className="w-full max-w-sm mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTopic}
                                onChange={(e) => setSearchTopic(e.target.value)}
                                placeholder="Enter topic..."
                                className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-14"
                            />
                            <button
                                type="submit"
                                disabled={!searchTopic.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-amber-500 rounded-full hover:bg-amber-400 text-white disabled:opacity-50"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                    </form>

                    {hasUnknownContext && (
                        <button
                            onClick={() => onGenerate()}
                            disabled={isLoading}
                            className="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-all"
                        >
                            Generate from Document
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={scrollContainerRef}
            className="h-full w-full bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {/* Floating Controls */}
            <div className="fixed top-16 md:top-20 right-3 md:right-8 z-50 flex flex-col gap-2 md:gap-3">
                {/* Home/Exit Button - Always visible for clear exit */}
                {onExit && (
                    <button
                        onClick={onExit}
                        className="p-3 bg-black/70 backdrop-blur-md text-white rounded-full hover:bg-white/20 active:bg-white/30 transition-all border border-white/20 shadow-lg"
                        title="Back to Dashboard"
                    >
                        <Home className="w-5 h-5" />
                    </button>
                )}

                {/* Restart Button - Clear videos and go back to initial state */}
                {onReset && (
                    <button
                        onClick={onReset}
                        className="p-3 bg-amber-500/80 backdrop-blur-md text-white rounded-full hover:bg-amber-400 active:bg-amber-600 transition-all border border-white/20 shadow-lg"
                        title="Start Over - Generate New Shorts"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                )}

                <button
                    onClick={() => onGenerate()}
                    disabled={isLoading}
                    className="p-3 bg-black/70 backdrop-blur-md text-white rounded-full hover:bg-white/20 active:bg-white/30 transition-all border border-white/20 shadow-lg"
                    title="Refresh Feed"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="p-3 bg-black/70 backdrop-blur-md text-white rounded-full hover:bg-white/20 active:bg-white/30 transition-all border border-white/20 shadow-lg"
                    title="Search Topic"
                >
                    <Search className="w-5 h-5" />
                </button>
            </div>

            {/* Search Popup */}
            {showSearch && (
                <div className="fixed top-20 left-4 right-16 md:right-20 z-50">
                    <form onSubmit={handleSearch} className="flex gap-2 bg-black/90 backdrop-blur-xl p-3 rounded-xl border border-white/20 shadow-xl">
                        <input
                            type="text"
                            value={searchTopic}
                            onChange={(e) => setSearchTopic(e.target.value)}
                            placeholder="Enter topic..."
                            className="bg-transparent text-white placeholder-white/50 focus:outline-none flex-1 px-2"
                            autoFocus
                        />
                        <button type="submit" className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold">Go</button>
                        <button type="button" onClick={() => setShowSearch(false)} className="p-2 text-white/70"><X className="w-5 h-5" /></button>
                    </form>
                </div>
            )}

            {/* Virtualized Feed */}
            {feedItems.map((item, index) => {
                // Optimization: Only render current and adjacent slides
                const shouldRender = Math.abs(index - currentIndex) <= 2;

                if (!shouldRender) {
                    return (
                        <div key={`placeholder-${index}`} className="h-screen w-full snap-center bg-black" />
                    );
                }

                return (
                    <div
                        ref={setItemRef(index, item.data.id)}
                        id={`item-${item.data.id}-${index}`}
                        key={`item-${item.data.id}-${index}`}
                        data-index={index}
                        className="h-screen w-full snap-center relative flex items-center justify-center bg-black"
                    >
                        {item.type === 'clip' ? (
                            <ErrorBoundary>
                                <ReelPlayer
                                    clip={item.data as VideoClip}
                                    isActive={index === currentIndex}
                                    onComplete={() => nextItem()}
                                    onSkip={() => {
                                        interactions.recordSkip(item.data.id);
                                        nextItem();
                                    }}
                                    onReplay={() => interactions.recordReplay(item.data.id)}
                                    onLike={() => interactions.recordLike(item.data.id)}
                                    onPause={() => interactions.recordPause(item.data.id)}
                                    onWatchProgress={(duration) => {
                                        const total = (item.data as VideoClip).end_time;
                                        interactions.recordWatch(item.data.id, duration, total);
                                    }}
                                />
                            </ErrorBoundary>
                        ) : (
                            <RecallPrompt
                                clip={(item.data as any).clip}
                                question={(item.data as any).question}
                                onAnswer={() => {
                                    // Handle answer
                                    setTimeout(nextItem, 1500);
                                }}
                                onSkip={nextItem}
                            />
                        )}

                        {/* Feed Progress Indicator */}
                        <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-white/80 text-xs">
                            {index + 1} / {feedItems.length}
                        </div>
                    </div>
                );
            })}

            {/* Load More Indicator */}
            {hasMore && (
                <div className="h-40 w-full snap-center flex items-center justify-center bg-black">
                    {isLoadingMore ? <Loader2 className="w-8 h-8 text-amber-500 animate-spin" /> : <p className="text-white/40">Scroll for more</p>}
                </div>
            )}
        </div>
    );
}
