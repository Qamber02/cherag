// Cache Service - Provides localStorage caching with TTL for AI responses
// Reduces redundant API calls and improves response time

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

interface CacheConfig {
    ttl: number; // Time to live in milliseconds
    maxEntries: number;
}

// Default cache configurations per feature
const CACHE_CONFIG: Record<string, CacheConfig> = {
    summary: { ttl: 30 * 60 * 1000, maxEntries: 10 },      // 30 minutes
    flashcards: { ttl: 60 * 60 * 1000, maxEntries: 10 },   // 1 hour
    quizzes: { ttl: 60 * 60 * 1000, maxEntries: 10 },      // 1 hour
    mindmap: { ttl: 60 * 60 * 1000, maxEntries: 5 },       // 1 hour
    chat: { ttl: 5 * 60 * 1000, maxEntries: 50 },          // 5 minutes
    default: { ttl: 15 * 60 * 1000, maxEntries: 20 },      // 15 minutes
};

const CACHE_PREFIX = 'cherag_cache_v2_';

/**
 * Generate a hash key from content for cache lookup
 * Uses a simple but effective string hashing algorithm
 */
export function generateCacheKey(content: string, type: string): string {
    // Simple hash function for content
    let hash = 0;
    const str = content.slice(0, 1000); // Use first 1000 chars for hashing
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return `${CACHE_PREFIX}${type}_${Math.abs(hash).toString(36)}`;
}

/**
 * Get cached data if valid (not expired)
 */
export function getFromCache<T>(key: string): T | null {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const entry: CacheEntry<T> = JSON.parse(cached);

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            localStorage.removeItem(key);
            return null;
        }

        console.log(`[Cache] HIT: ${key.slice(0, 30)}...`);
        return entry.data;
    } catch {
        return null;
    }
}

/**
 * Save data to cache with TTL
 */
export function saveToCache<T>(key: string, data: T, type: string = 'default'): void {
    try {
        const config = CACHE_CONFIG[type] || CACHE_CONFIG.default;

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + config.ttl,
        };

        localStorage.setItem(key, JSON.stringify(entry));
        console.log(`[Cache] SAVE: ${key.slice(0, 30)}... (TTL: ${config.ttl / 60000}min)`);

        // Cleanup old entries if too many
        cleanupCache(type, config.maxEntries);
    } catch (err) {
        console.warn('[Cache] Save failed:', err);
    }
}

/**
 * Remove expired entries and limit total entries per type
 */
function cleanupCache(type: string, maxEntries: number): void {
    try {
        const prefix = `${CACHE_PREFIX}${type}_`;
        const keys: { key: string; timestamp: number }[] = [];

        // Find all keys for this type
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                try {
                    const entry = JSON.parse(localStorage.getItem(key) || '{}');

                    // Remove expired
                    if (entry.expiresAt && Date.now() > entry.expiresAt) {
                        localStorage.removeItem(key);
                    } else {
                        keys.push({ key, timestamp: entry.timestamp || 0 });
                    }
                } catch {
                    localStorage.removeItem(key);
                }
            }
        }

        // Remove oldest entries if over limit
        if (keys.length > maxEntries) {
            keys.sort((a, b) => a.timestamp - b.timestamp);
            const toRemove = keys.slice(0, keys.length - maxEntries);
            toRemove.forEach(({ key }) => localStorage.removeItem(key));
        }
    } catch {
        // Ignore cleanup errors
    }
}

/**
 * Clear all cache entries
 */
export function clearCache(type?: string): void {
    try {
        const prefix = type ? `${CACHE_PREFIX}${type}_` : CACHE_PREFIX;
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`[Cache] Cleared ${keysToRemove.length} entries`);
    } catch {
        // Ignore errors
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { totalEntries: number; totalSize: string } {
    let totalEntries = 0;
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            totalEntries++;
            totalSize += (localStorage.getItem(key) || '').length;
        }
    }

    return {
        totalEntries,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`
    };
}
