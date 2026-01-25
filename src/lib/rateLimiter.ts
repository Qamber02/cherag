// Token Bucket Rate Limiter with per-endpoint configuration
// Prevents API quota exhaustion and provides smooth rate limiting

interface RateLimitConfig {
    maxTokens: number;      // Maximum tokens in bucket
    refillRate: number;     // Tokens added per second
    refillInterval: number; // Interval in ms to refill tokens
}

interface TokenBucket {
    tokens: number;
    lastRefill: number;
    config: RateLimitConfig;
}

// Rate limit configurations per feature
const RATE_LIMITS: Record<string, RateLimitConfig> = {
    summary: { maxTokens: 5, refillRate: 5 / 60, refillInterval: 1000 },        // 5 per minute (was 10)
    flashcards: { maxTokens: 5, refillRate: 5 / 60, refillInterval: 1000 },     // 5 per minute (was 8)
    quizzes: { maxTokens: 5, refillRate: 5 / 60, refillInterval: 1000 },        // 5 per minute (was 8)

    mindmap: { maxTokens: 3, refillRate: 3 / 60, refillInterval: 1000 },        // 3 per minute (was 5)
    chat: { maxTokens: 10, refillRate: 10 / 60, refillInterval: 1000 },         // 10 per minute (was 15)
    videos: { maxTokens: 8, refillRate: 8 / 60, refillInterval: 1000 },         // 8 per minute (was 10)
    default: { maxTokens: 8, refillRate: 8 / 60, refillInterval: 1000 },        // Default: 8 per minute
};

class RateLimiter {
    private buckets: Map<string, TokenBucket> = new Map();

    private getBucket(endpoint: string): TokenBucket {
        if (!this.buckets.has(endpoint)) {
            const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
            this.buckets.set(endpoint, {
                tokens: config.maxTokens,
                lastRefill: Date.now(),
                config,
            });
        }
        return this.buckets.get(endpoint)!;
    }

    private refillTokens(bucket: TokenBucket): void {
        const now = Date.now();
        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = (timePassed / 1000) * bucket.config.refillRate;

        bucket.tokens = Math.min(
            bucket.config.maxTokens,
            bucket.tokens + tokensToAdd
        );
        bucket.lastRefill = now;
    }

    /**
     * Attempt to consume a token for the given endpoint
     * Returns true if allowed, false if rate limited
     */
    public tryConsume(endpoint: string): boolean {
        const bucket = this.getBucket(endpoint);
        this.refillTokens(bucket);

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            return true;
        }

        return false;
    }

    /**
     * Wait until a token is available (with timeout)
     * Throws error if rate limited for too long
     */
    public async waitForToken(endpoint: string, timeoutMs: number = 30000): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            if (this.tryConsume(endpoint)) {
                return;
            }

            // Wait a bit before trying again
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        throw new Error(`Rate limit exceeded for ${endpoint}. Please try again in a few moments.`);
    }

    /**
     * Get current rate limit status for an endpoint
     */
    public getStatus(endpoint: string): { available: number; max: number; refillRate: number } {
        const bucket = this.getBucket(endpoint);
        this.refillTokens(bucket);

        return {
            available: Math.floor(bucket.tokens),
            max: bucket.config.maxTokens,
            refillRate: bucket.config.refillRate * 60, // Convert to per minute
        };
    }

    /**
     * Reset rate limit for an endpoint (useful for testing)
     */
    public reset(endpoint?: string): void {
        if (endpoint) {
            this.buckets.delete(endpoint);
        } else {
            this.buckets.clear();
        }
    }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Decorator function to add rate limiting to async functions
 */
export function withRateLimit<A extends unknown[], R>(
    endpoint: string,
    fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
    return async (...args: A): Promise<R> => {
        await rateLimiter.waitForToken(endpoint);
        return fn(...args);
    };
}
