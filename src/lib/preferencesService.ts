// Preferences Service - Stores user preferences in localStorage/cookies
// Persists theme, last tab, sidebar state, and other UI preferences

const PREFS_KEY = 'cherag_preferences';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    lastActiveTab: string;
    sidebarExpanded: boolean;
    lastVisit: number;
    summaryOptions?: {
        length?: string;
        style?: string;
    };
}

const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'system',
    lastActiveTab: 'dashboard',
    sidebarExpanded: true,
    lastVisit: Date.now(),
};

/**
 * Get all user preferences
 */
export function getPreferences(): UserPreferences {
    try {
        const stored = localStorage.getItem(PREFS_KEY);
        if (stored) {
            return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        }
    } catch {
        // Ignore parse errors
    }
    return DEFAULT_PREFERENCES;
}

/**
 * Save all preferences
 */
export function savePreferences(prefs: Partial<UserPreferences>): void {
    try {
        const current = getPreferences();
        const updated = { ...current, ...prefs, lastVisit: Date.now() };
        localStorage.setItem(PREFS_KEY, JSON.stringify(updated));

        // Also save theme to cookie for SSR/initial load
        if (prefs.theme) {
            setCookie('theme', prefs.theme, COOKIE_MAX_AGE);
        }
    } catch (err) {
        console.warn('[Preferences] Save failed:', err);
    }
}

/**
 * Get a specific preference
 */
export function getPreference<K extends keyof UserPreferences>(
    key: K
): UserPreferences[K] {
    return getPreferences()[key];
}

/**
 * Set a specific preference
 */
export function setPreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
): void {
    savePreferences({ [key]: value } as Partial<UserPreferences>);
}

/**
 * Set a cookie
 */
export function setCookie(name: string, value: string, maxAge: number = COOKIE_MAX_AGE): void {
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string): void {
    document.cookie = `${name}=; max-age=0; path=/`;
}

/**
 * Initialize theme from preferences/cookies on app load
 */
export function initializeTheme(): void {
    // Try cookie first for faster initial load
    let theme = getCookie('theme') as 'light' | 'dark' | 'system' | null;

    // Fallback to localStorage
    if (!theme) {
        theme = getPreference('theme');
    }

    applyTheme(theme || 'system');
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: 'light' | 'dark' | 'system'): void {
    const root = document.documentElement;

    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
    } else {
        root.classList.toggle('dark', theme === 'dark');
    }

    // Save for persistence
    setPreference('theme', theme);
}

/**
 * Get session storage item with fallback
 */
export function getSessionItem<T>(key: string, defaultValue: T): T {
    try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
}

/**
 * Set session storage item
 */
export function setSessionItem<T>(key: string, value: T): void {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore errors
    }
}

/**
 * Clear all preferences (for logout/reset)
 */
export function clearPreferences(): void {
    localStorage.removeItem(PREFS_KEY);
    deleteCookie('theme');
}
