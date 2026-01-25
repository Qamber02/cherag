// Key Manager for AI Service Redundancy
// Handles rotation of API keys for multiple providers (Gemini, OpenRouter, DeepSeek)
// Automatically switches keys when one hits a rate limit (429)

type AIProvider = 'gemini' | 'openrouter' | 'deepseek' | 'huggingface';

interface KeyState {
    key: string;
    isRateLimited: boolean;
    rateLimitedUntil: number; // Timestamp
}

class KeyManager {
    private keys: Record<AIProvider, KeyState[]>;
    private activeKeyIndex: Record<AIProvider, number>;

    constructor() {
        this.keys = {
            gemini: this.loadKeys('VITE_GEMINI_API_KEY'),
            openrouter: this.loadKeys('VITE_OPENROUTER_API_KEY'),
            deepseek: this.loadKeys('VITE_DEEPSEEK_API_KEY'),
            huggingface: this.loadKeys('VITE_HUGGINGFACE_API_KEY'),
        };

        this.activeKeyIndex = {
            gemini: 0,
            openrouter: 0,
            deepseek: 0,
            huggingface: 0,
        };
    }

    private loadKeys(baseEnvVar: string): KeyState[] {
        const keys: string[] = [];
        const env = import.meta.env;

        // Check base key
        if (env[baseEnvVar]) keys.push(env[baseEnvVar]);

        // Check suffixes _2 to _5
        for (let i = 2; i <= 5; i++) {
            const variant = `${baseEnvVar}_${i}`;
            if (env[variant]) {
                keys.push(env[variant]);
            }
        }

        return keys.map(k => ({
            key: k,
            isRateLimited: false,
            rateLimitedUntil: 0
        }));
    }

    /**
     * Get the current active key for a provider
     * Returns null if no keys are available or all are rate limited
     */
    public getKey(provider: AIProvider): string | null {
        const providerKeys = this.keys[provider];
        if (!providerKeys || providerKeys.length === 0) return null;

        // Check if current key is valid
        let currentIndex = this.activeKeyIndex[provider];
        let currentKey = providerKeys[currentIndex];

        // If current key is rate limited, check if it should be reset
        if (currentKey.isRateLimited) {
            if (Date.now() > currentKey.rateLimitedUntil) {
                // Cooldown expired, reset
                console.log(`[KeyManager] Cooldown expired for ${provider} key ${currentIndex + 1}`);
                currentKey.isRateLimited = false;
                currentKey.rateLimitedUntil = 0;
                return currentKey.key;
            } else {
                // Try to find another key
                return this.rotateKey(provider);
            }
        }

        return currentKey.key;
    }

    /**
     * Mark the current key as rate limited and rotate to the next one
     * @param provider The AI provider
     * @param cooldownMinutes How long to disable this key (default 2 minutes)
     */
    public markRateLimited(provider: AIProvider, cooldownMinutes: number = 2): string | null {
        const providerKeys = this.keys[provider];
        if (!providerKeys || providerKeys.length === 0) return null;

        const currentIndex = this.activeKeyIndex[provider];

        console.warn(`[KeyManager] ⚠️ Rate limit reported for ${provider} key ${currentIndex + 1}`);

        // Mark current key as limited
        providerKeys[currentIndex].isRateLimited = true;
        providerKeys[currentIndex].rateLimitedUntil = Date.now() + (cooldownMinutes * 60 * 1000);

        // Rotate
        return this.rotateKey(provider);
    }

    /**
     * Force rotate to the next available key
     */
    private rotateKey(provider: AIProvider): string | null {
        const providerKeys = this.keys[provider];
        const startIndex = this.activeKeyIndex[provider];
        let nextIndex = (startIndex + 1) % providerKeys.length;

        // Loop through all keys to find a non-limited one
        while (nextIndex !== startIndex) {
            const keyState = providerKeys[nextIndex];

            // Check if this key is ready
            if (keyState.isRateLimited && Date.now() > keyState.rateLimitedUntil) {
                keyState.isRateLimited = false; // Reset if expired
            }

            if (!keyState.isRateLimited) {
                console.log(`[KeyManager] 🔄 Switching ${provider} to key ${nextIndex + 1}`);
                this.activeKeyIndex[provider] = nextIndex;
                return keyState.key;
            }

            nextIndex = (nextIndex + 1) % providerKeys.length;
        }

        // If we get here, all keys are rate limited
        console.error(`[KeyManager] ❌ ALL keys for ${provider} are rate limited!`);
        return null;
    }

    public getStatus(provider: AIProvider) {
        return {
            totalKeys: this.keys[provider].length,
            activeKeyIndex: this.activeKeyIndex[provider],
            keys: this.keys[provider].map((k, i) => ({
                index: i,
                status: k.isRateLimited ? 'limited' : 'active',
                readyIn: k.isRateLimited ? Math.ceil((k.rateLimitedUntil - Date.now()) / 1000) + 's' : '0s'
            }))
        };
    }
}

export const keyManager = new KeyManager();
