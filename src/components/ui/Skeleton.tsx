// Skeleton Loader Components
// Reusable loading states for a premium perceived-speed experience

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div className={`skeleton ${className}`} />
    );
}

export function SkeletonText({ className = '', lines = 3 }: SkeletonProps & { lines?: number }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton skeleton-text"
                    style={{ width: i === lines - 1 ? '70%' : '100%' }}
                />
            ))}
        </div>
    );
}

export function SkeletonTitle({ className = '' }: SkeletonProps) {
    return <div className={`skeleton skeleton-title ${className}`} />;
}

export function SkeletonAvatar({ className = '' }: SkeletonProps) {
    return <div className={`skeleton skeleton-avatar ${className}`} />;
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
    return (
        <div className={`card-mobile space-y-4 ${className}`}>
            <SkeletonTitle />
            <SkeletonText lines={3} />
        </div>
    );
}

// Pre-built loading states for common patterns
export function SkeletonChatMessage() {
    return (
        <div className="flex gap-3 p-4">
            <SkeletonAvatar />
            <div className="flex-1 space-y-2">
                <SkeletonTitle />
                <SkeletonText lines={2} />
            </div>
        </div>
    );
}

export function SkeletonVideoCard() {
    return (
        <div className="card-mobile space-y-3">
            <div className="skeleton aspect-video rounded-lg" />
            <SkeletonTitle />
            <Skeleton className="h-4 w-1/3" />
        </div>
    );
}

export function SkeletonFlashcard() {
    return (
        <div className="card-mobile aspect-[3/2] flex items-center justify-center">
            <div className="space-y-4 w-full max-w-sm">
                <SkeletonTitle className="mx-auto" />
                <SkeletonText lines={2} className="text-center" />
            </div>
        </div>
    );
}

export function SkeletonQuizOption() {
    return (
        <div className="skeleton h-14 rounded-xl w-full" />
    );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                    <SkeletonAvatar />
                    <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}
