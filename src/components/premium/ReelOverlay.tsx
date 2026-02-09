// Reel Overlay - UI overlay on video clips
// Shows metadata, controls, progress ring

import { Heart, RotateCcw, Share2, Info } from 'lucide-react';
import { useState } from 'react';
import type { ReelOverlayProps } from '../../types/videoIntelligence.types';

export default function ReelOverlay({
    clip,
    isPlaying,
    watchProgress,
    onLike,
    onReplay,
    // showWhyTooltip is available for future use
    whyReason = 'Recommended for you',
}: ReelOverlayProps) {
    const [liked, setLiked] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    const handleLike = () => {
        if (!liked && onLike) {
            onLike();
            setLiked(true);
        }
    };

    return (
        <>
            {/* Side action buttons */}
            <div className="absolute bottom-24 right-4 flex flex-col space-y-4 items-center z-20">
                {/* Progress ring + Like */}
                <div className="relative">
                    {/* Progress ring */}
                    <svg className="w-14 h-14 -rotate-90 absolute inset-0">
                        <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="3"
                            fill="none"
                        />
                        <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="rgba(168,85,247,0.8)"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - watchProgress)}`}
                            strokeLinecap="round"
                            className="transition-all duration-300"
                        />
                    </svg>

                    {/* Like button in center */}
                    <button
                        type="button"
                        onClick={handleLike}
                        className="relative w-14 h-14 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 active:scale-95 transition-all"
                    >
                        <Heart
                            className={`w-6 h-6 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`}
                        />
                    </button>
                </div>

                {/* Replay button */}
                {onReplay && (
                    <button
                        type="button"
                        onClick={onReplay}
                        className="w-14 h-14 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 active:scale-95 transition-all"
                    >
                        <RotateCcw className="w-6 h-6 text-white" />
                    </button>
                )}

                {/* Share button */}
                <button
                    type="button"
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(
                                `Check out this clip: ${clip.concept}`
                            );
                        } catch (err) {
                            console.error('[ReelOverlay] Clipboard write failed:', err);
                        }
                    }}
                    className="w-14 h-14 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 active:scale-95 transition-all"
                >
                    <Share2 className="w-6 h-6 text-white" />
                </button>

                {/* "Why am I seeing this?" button */}
                <button
                    type="button"
                    onClick={() => setShowTooltip(!showTooltip)}
                    className="w-14 h-14 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 active:scale-95 transition-all"
                >
                    <Info className="w-6 h-6 text-white" />
                </button>
            </div>

            {/* Why tooltip */}
            {showTooltip && (
                <div className="absolute right-20 bottom-24 z-30 bg-black/90 backdrop-blur-xl p-4 rounded-xl border border-white/20 max-w-xs pointer-events-none">
                    <p className="text-white text-sm font-bold mb-1">Why this clip?</p>
                    <p className="text-white/70 text-xs">{whyReason}</p>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-3 h-3 bg-black/90 border-r border-t border-white/20 rotate-45" />
                </div>
            )}

            {/* Importance indicator */}
            {clip.importance_score >= 8 && (
                <div className="absolute top-4 left-4 bg-amber-500/80 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-1">
                    ⭐ High Priority
                </div>
            )}

            {/* Playing indicator */}
            {isPlaying && (
                <div className="absolute top-4 right-4 bg-green-500/80 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Live
                </div>
            )}
        </>
    );
}
