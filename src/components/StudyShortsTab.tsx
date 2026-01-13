
import { useRef, useState, useEffect } from 'react';
import { Play, RefreshCw, Share2, Sparkles, Loader2, Search } from 'lucide-react';
import type { Video } from '../hooks/useStudyShorts';

interface StudyShortsTabProps {
    videos: Video[];
    isLoading: boolean;
    isLoadingMore?: boolean;
    hasMore?: boolean;
    onGenerate: (topic?: string) => void;
    onLoadMore?: () => void;
    hasUnknownContext: boolean;
}

export default function StudyShortsTab({
    videos,
    isLoading,
    isLoadingMore = false,
    hasMore = true,
    onGenerate,
    onLoadMore,
    hasUnknownContext
}: StudyShortsTabProps) {
    const [searchTopic, setSearchTopic] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!onLoadMore || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
                    console.log('[InfiniteScroll] Triggering loadMore');
                    onLoadMore();
                }
            },
            { threshold: 0.5 }
        );

        if (loadMoreTriggerRef.current) {
            observer.observe(loadMoreTriggerRef.current);
        }

        return () => observer.disconnect();
    }, [onLoadMore, hasMore, isLoadingMore]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTopic.trim()) {
            onGenerate(searchTopic.trim());
            setSearchTopic('');
            setShowSearch(false);
        }
    };

    // Empty State
    if (videos.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col h-full bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-600/20 z-0"></div>
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-8 text-center">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Play className="w-10 h-10 text-white fill-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Study Reels</h2>
                    <p className="text-white/60 mb-8 max-w-sm">
                        AI-verified short videos. Only strictly educational content passes our filters.
                    </p>

                    <button
                        onClick={() => onGenerate()}
                        disabled={isLoading || !hasUnknownContext}
                        className="group relative px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] disabled:opacity-50 disabled:hover:scale-100"
                    >
                        <div className="flex items-center space-x-2">
                            <Sparkles className="w-5 h-5" />
                            <span>Generate Verified Feed</span>
                        </div>
                    </button>

                    {/* Search Option */}
                    <form onSubmit={handleSearch} className="mt-8 w-full max-w-xs">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTopic}
                                onChange={(e) => setSearchTopic(e.target.value)}
                                placeholder="Or search a specific topic..."
                                className="w-full bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-12"
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 text-white"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </form>

                    {!hasUnknownContext && <p className="mt-4 text-xs text-red-400">Upload a document first!</p>}
                </div>
            </div>
        );
    }

    // Loading State
    if (isLoading && videos.length === 0) {
        return (
            <div className="flex flex-col h-full bg-black items-center justify-center">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-white/60">Verifying educational content...</p>
                <p className="text-white/40 text-sm mt-2">This may take a moment as we filter out irrelevant videos</p>
            </div>
        );
    }

    return (
        <div
            ref={scrollContainerRef}
            className="h-full w-full bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        >
            {/* Floating Controls */}
            <div className="fixed top-24 right-12 z-50 flex flex-col gap-3">
                <button
                    onClick={() => onGenerate()}
                    disabled={isLoading}
                    className="p-3 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all disabled:opacity-50 border border-white/10"
                    title="Refresh Feed"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="p-3 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all border border-white/10"
                    title="Search Topic"
                >
                    <Search className="w-5 h-5" />
                </button>
            </div>

            {/* Search Popup */}
            {showSearch && (
                <div className="fixed top-24 right-28 z-50 animate-in slide-in-from-right-2 fade-in duration-200">
                    <form onSubmit={handleSearch} className="flex gap-2 bg-black/80 backdrop-blur-xl p-3 rounded-xl border border-white/10">
                        <input
                            type="text"
                            value={searchTopic}
                            onChange={(e) => setSearchTopic(e.target.value)}
                            placeholder="Enter topic..."
                            className="bg-transparent text-white placeholder-white/50 focus:outline-none w-48 px-2"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="bg-amber-500 text-black px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-amber-400"
                        >
                            Go
                        </button>
                    </form>
                </div>
            )}

            {/* Video Feed */}
            {videos.map((video, index) => (
                <div
                    key={video.id}
                    className="h-full w-full snap-center relative flex items-center justify-center bg-black"
                >
                    <div className="h-full w-full md:max-w-[400px] relative bg-zinc-900 border-x border-zinc-800">
                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=0&controls=1&rel=0&modestbranding=1`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>

                        {/* Bottom Gradient */}
                        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"></div>

                        {/* Content Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                            <h3 className="text-lg font-bold line-clamp-2 leading-tight drop-shadow-md mb-2">{video.title}</h3>
                            <div className="flex items-center space-x-2 opacity-80 text-sm">
                                {video.channel && (
                                    <span className="text-white/70">@{video.channel}</span>
                                )}
                                <span className="bg-green-500/30 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-medium text-green-300">
                                    ✓ Verified
                                </span>
                            </div>
                        </div>

                        {/* Side Actions */}
                        <div className="absolute bottom-20 right-4 flex flex-col space-y-4 items-center z-20">
                            <div className="group flex flex-col items-center">
                                <button className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all">
                                    <Share2 className="w-6 h-6 text-white" />
                                </button>
                                <span className="text-xs text-white mt-1">Share</span>
                            </div>
                        </div>

                        {/* Video Counter */}
                        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm">
                            {index + 1} / {videos.length}
                        </div>
                    </div>
                </div>
            ))}

            {/* Load More Trigger / End of Feed */}
            <div
                ref={loadMoreTriggerRef}
                className="h-40 w-full snap-center flex items-center justify-center bg-black/90"
            >
                {isLoadingMore ? (
                    <div className="flex items-center gap-3 text-white/60">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading more verified videos...</span>
                    </div>
                ) : hasMore ? (
                    <div className="flex items-center gap-2 text-white/40">
                        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse"></div>
                        <span>Scroll for more</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-white/40">
                        <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                        <span>End of verified feed</span>
                    </div>
                )}
            </div>
        </div>
    );
}
