// Learning Reels - TypeScript Type Definitions
// Types for video clips, interactions, and feed generation

// ============================================
// Database Entity Types
// ============================================

export interface VideoClip {
    id: string;
    video_id: string; // YouTube video ID
    concept: string;
    start_time: number; // seconds
    end_time: number; // seconds
    difficulty: 1 | 2 | 3 | 4 | 5;
    importance_score: number; // 1-10
    prerequisites: string[];
    metadata: {
        title?: string;
        channel?: string;
        thumbnail_url?: string;
        video_title?: string;
    };
    created_at: string;
}

export interface ClipInteraction {
    id: string;
    user_id: string;
    clip_id: string;
    watch_duration: number;
    total_duration: number;
    replay_count: number;
    skipped: boolean;
    liked: boolean;
    pause_count: number;
    last_watched: string;
    next_review: string | null;
    review_interval: number;
    confusion_score: number; // 0-1
    mastery_delta: number;
    created_at: string;
    updated_at: string;
}

export interface RecallQuestion {
    id: string;
    clip_id: string;
    question: string;
    options: string[]; // Always 4 options
    correct_index: number; // 0-3
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
    question_type: 'conceptual' | 'application' | 'recall';
    created_at: string;
}

export interface RecallAttempt {
    id: string;
    user_id: string;
    clip_id: string;
    question_id: string;
    selected_index: number;
    is_correct: boolean;
    time_taken_ms: number;
    created_at: string;
}

// ============================================
// Service Layer Types
// ============================================

export interface ClipExtractionResult {
    clips: Omit<VideoClip, 'id' | 'created_at'>[];
    video_id: string;
    total_clips: number;
}

export interface ClipRankingSignals {
    // User context
    userMastery: Record<string, number>; // concept -> mastery (0-1)
    weakConcepts: string[]; // concepts with mastery < 0.5
    upcomingExams: Array<{ topic: string; days_until: number }>;

    // Interaction history
    recentSkips: string[]; // clip_ids skipped in last session
    recentLikes: string[]; // clip_ids liked
    watchedClips: string[]; // already watched clip_ids

    // Quiz/flashcard performance
    failedConcepts: string[]; // from recent quizzes

    // Preferences
    preferredDifficulty: 1 | 2 | 3 | 4 | 5;
    learningStyle: string; // from Learning DNA
}

export interface RankedClip extends VideoClip {
    score: number; // Final ranking score
    reason: string; // Why this clip was ranked high
    rank: number; // Position in feed
}

export interface FeedConfig {
    // Ranking weights
    weakConceptBoost: number; // Default: 3.0
    upcomingExamBoost: number; // Default: 2.5
    recentFailureBoost: number; // Default: 2.0
    importanceMultiplier: number; // Default: 1.5
    diversityBonus: number; // Default: 1.0
    masteredPenalty: number; // Default: -2.0
    recentSkipPenalty: number; // Default: -1.5

    // Feed parameters
    minClipsPerFeed: number; // Default: 10
    maxClipsPerFeed: number; // Default: 50
    recallPromptInterval: number; // Show recall every N clips (3-5)
    diversityThreshold: number; // Max same-concept clips in a row
}

export interface FeedItem {
    type: 'clip' | 'recall';
    data: VideoClip | RecallPrompt;
    index: number;
}

export interface RecallPrompt {
    clip: VideoClip;
    question: RecallQuestion;
    type: 'recall';
}

// ============================================
// Component Props Types
// ============================================

export interface LearningReelsTabProps {
    // Optional initial config
    config?: Partial<FeedConfig>;
}

export interface ReelPlayerProps {
    clip: VideoClip;
    autoPlay?: boolean;
    isActive?: boolean; // New strict active state
    onComplete?: () => void;
    onSkip?: () => void;
    onReplay?: () => void;
    onLike?: () => void;
    onPause?: () => void;
    onWatchProgress?: (duration: number) => void;
}

export interface ReelOverlayProps {
    clip: VideoClip;
    isPlaying: boolean;
    watchProgress: number; // 0-1
    onLike?: () => void;
    onReplay?: () => void;
    onShare?: () => void;
    showWhyTooltip?: boolean;
    whyReason?: string;
}

export interface RecallPromptProps {
    clip: VideoClip;
    question: RecallQuestion;
    onAnswer: (selectedIndex: number, timeTaken: number) => void;
    onSkip: () => void;
    timeoutSeconds?: number; // Default: 10
}

// ============================================
// Hook Return Types
// ============================================

export interface UseLearningReelsReturn {
    // State
    feed: FeedItem[];
    currentIndex: number;
    currentItem: FeedItem | null;
    isLoading: boolean;
    hasMore: boolean;
    error: string | null;

    // Methods
    loadFeed: () => Promise<void>;
    nextItem: () => void;
    prevItem: () => void;
    refreshFeed: () => Promise<void>;
    goToIndex: (index: number) => void;
}

export interface UseClipInteractionsReturn {
    // State
    pendingSync: number; // Number of interactions waiting to sync
    isSyncing: boolean;

    // Methods
    recordWatch: (clipId: string, duration: number, totalDuration: number) => void;
    recordSkip: (clipId: string) => void;
    recordReplay: (clipId: string) => void;
    recordLike: (clipId: string) => void;
    recordPause: (clipId: string) => void;
    recordRecall: (clipId: string, questionId: string, correct: boolean, timeTaken: number) => void;

    // Manual sync
    syncNow: () => Promise<void>;
}

// ============================================
// AI Service Types
// ============================================

export interface ClipExtractionPromptData {
    transcript: string;
    video_id: string;
    video_title: string;
}

export interface RecallGenerationPromptData {
    clip: VideoClip;
    transcript_segment: string;
}

// ============================================
// Spaced Repetition Types
// ============================================

export interface SpacedRepetitionResult {
    next_review: string;
    review_interval: number; // days
    ease_factor: number;
}

export interface ReviewInput {
    current_interval: number;
    ease_factor: number;
    quality: 0 | 1 | 2 | 3 | 4 | 5; // 0=fail, 5=perfect
}
