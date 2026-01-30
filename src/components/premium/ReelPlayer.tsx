// Reel Player - Individual clip video player with YouTube iframe
// Handles playback, time bounds, and interaction tracking

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReelPlayerProps } from '../../types/videoIntelligence.types';
import ReelOverlay from './ReelOverlay';
import { useVideoContext } from './VideoContext';

export default function ReelPlayer({
    clip,
    isActive = false, // Add strict active state
    onComplete,
    onSkip,
    onReplay,
    onLike,
    onPause,
    onWatchProgress,
}: ReelPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [watchProgress, setWatchProgress] = useState(0);
    const [showWhyTooltip] = useState(false); // setShowWhyTooltip is unused
    const [isPlayerReady, setIsPlayerReady] = useState(false);



    const iframeRef = useRef<HTMLIFrameElement>(null);
    const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const watchStartTimeRef = useRef<number>(Date.now());

    const clipDuration = clip.end_time - clip.start_time;
    // Add origin to fix localhost playback issues
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Use centralized video context
    const { activePlayerId, activeTab } = useVideoContext() || {};

    // Determine play state: 
    // 1. Must be EXPLICITLY on the videos tab.
    // 2. Must be active prop from parent (scroll position)
    // 3. Must match global active ID (single player enforcement) OR be the only active player
    const isOnVideosTab = activeTab === 'videos';
    const shouldPlay = isOnVideosTab && isActive && (activePlayerId === clip.id || activePlayerId === null);

    // Note: We use autoplay=0 initially and control via postMessage to prevent race conditions
    const youtubeUrlRef = useRef(`https://www.youtube.com/embed/${clip.video_id}?enablejsapi=1&version=3&playerapiid=ytplayer&autoplay=0&controls=1&rel=0&modestbranding=1&playsinline=1&start=${clip.start_time}&end=${clip.end_time}&origin=${origin}`);

    // Command helper - safely sends messages
    const sendCommand = (func: string, args: any[] = [], force = false) => {
        if (!iframeRef.current || !iframeRef.current.contentWindow) return;
        if (!isPlayerReady && !force) return;

        try {
            iframeRef.current.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: func,
                args: args
            }), '*');
        } catch (e) {
            // Ignore potential cross-origin errors during unload
        }
    };

    // Handle active state changes
    useEffect(() => {
        if (!shouldPlay) {
            // Force pause regardless of ready state if we have the ref
            sendCommand('pauseVideo', [], true);
            setIsPlaying(false);
            return;
        }

        if (!isPlayerReady) return;

        // Slight delay to ensure smooth transition
        const timer = setTimeout(() => {
            sendCommand('playVideo');
            setIsPlaying(true);
        }, 100); // Faster reaction time

        return () => clearTimeout(timer);
    }, [shouldPlay, isPlayerReady]);

    // Track watch progress
    useEffect(() => {
        if (isPlaying && isActive) {
            progressTimerRef.current = setInterval(() => {
                const elapsed = (Date.now() - watchStartTimeRef.current) / 1000;
                const progress = Math.min(1, elapsed / clipDuration);
                setWatchProgress(progress);

                if (onWatchProgress) {
                    onWatchProgress(elapsed);
                }

                // Auto-complete when clip ends
                if (progress >= 0.95 && onComplete) {
                    onComplete();
                }
            }, 500);
        } else {
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
            }
        }

        return () => {
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
            }
        };
    }, [isPlaying, isActive, clipDuration, onComplete, onWatchProgress]);

    // YouTube iframe API messages - use callback to avoid stale closures
    const handleIframeMessage = useCallback((event: MessageEvent) => {
        // Only accept messages from YouTube
        if (event.origin !== 'https://www.youtube.com') return;

        try {
            const data = JSON.parse(event.data);

            // Any message from YouTube means the player is somewhat ready
            if (!isPlayerReady) {
                setIsPlayerReady(true);
            }

            if (data.event === 'onStateChange') {
                // 1 = playing, 2 = paused, 0 = ended
                if (data.info === 1) {
                    setIsPlaying(true);
                    watchStartTimeRef.current = Date.now();
                } else if (data.info === 2) {
                    setIsPlaying(false);
                    if (onPause) onPause();
                } else if (data.info === 0) {
                    setIsPlaying(false);
                    if (onComplete) onComplete();
                }
            } else if (data.event === 'initialDelivery') {
                setIsPlayerReady(true);
            }
        } catch (error) {
            // Ignore parse errors
        }
    }, [isPlayerReady, onPause, onComplete]);

    useEffect(() => {
        window.addEventListener('message', handleIframeMessage);
        return () => window.removeEventListener('message', handleIframeMessage);
    }, [handleIframeMessage]);

    // Handle replay
    const handleReplay = () => {
        // Reset progress
        setWatchProgress(0);
        watchStartTimeRef.current = Date.now();

        // Seek to start and play
        sendCommand('seekTo', [clip.start_time, true]);
        sendCommand('playVideo');

        if (onReplay) onReplay();
    };

    return (
        <div className="h-full w-full max-w-full md:max-w-[min(100%,calc(100vh*9/16))] relative bg-zinc-900 mx-auto">
            {/* Safety Check for Missing ID */}
            {!clip.video_id ? (
                <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                    Unable to load video (Invalid ID)
                </div>
            ) : (
                <iframe
                    ref={iframeRef}
                    className="w-full h-full"
                    src={youtubeUrlRef.current}
                    title={clip.concept}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => {
                        // Fallback: assume ready after load + short delay if no message received
                        setTimeout(() => setIsPlayerReady(true), 1000);
                    }}
                />
            )}


            {/* Overlay UI */}
            <ReelOverlay
                clip={clip}
                isPlaying={isPlaying}
                watchProgress={watchProgress}
                onLike={onLike}
                onReplay={handleReplay}
                showWhyTooltip={showWhyTooltip}
                whyReason={(clip.metadata as any)?.why_recommended || 'Recommended for you'}
            />

            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

            {/* Concept info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-purple-600/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold">
                        {clip.concept}
                    </span>
                    <div className="flex gap-0.5">
                        {Array.from({ length: clip.difficulty }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" />
                        ))}
                    </div>
                </div>
                {clip.metadata?.video_title && (
                    <p className="text-xs text-white/60 line-clamp-1">
                        {clip.metadata.video_title}
                    </p>
                )}
            </div>

            {/* Skip button (swipe up) */}
            {onSkip && (
                <button
                    onClick={onSkip}
                    className="absolute bottom-40 left-1/2 -translate-x-1/2 pointer-events-auto px-6 py-2 bg-black/50 backdrop-blur-md text-white/60 rounded-full text-sm hover:bg-black/70 transition-all"
                >
                    Skip ↑
                </button>
            )}
        </div>
    );
}
