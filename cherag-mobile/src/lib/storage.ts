/**
 * Storage Service
 * Wrapper around SecureStore and AsyncStorage for data persistence
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_PREFIX = 'cherag_';

/**
 * Secure Storage - for sensitive data like tokens
 */
export const secureStorage = {
    async get(key: string): Promise<string | null> {
        try {
            if (Platform.OS === 'web') {
                return localStorage.getItem(STORAGE_PREFIX + key);
            }
            return await SecureStore.getItemAsync(STORAGE_PREFIX + key);
        } catch (error) {
            console.warn('[SecureStorage] Get error:', error);
            return null;
        }
    },

    async set(key: string, value: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(STORAGE_PREFIX + key, value);
                return;
            }
            await SecureStore.setItemAsync(STORAGE_PREFIX + key, value);
        } catch (error) {
            console.warn('[SecureStorage] Set error:', error);
        }
    },

    async remove(key: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                localStorage.removeItem(STORAGE_PREFIX + key);
                return;
            }
            await SecureStore.deleteItemAsync(STORAGE_PREFIX + key);
        } catch (error) {
            console.warn('[SecureStorage] Remove error:', error);
        }
    },
};

/**
 * Regular Storage - for preferences and cached data
 */
export const storage = {
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await AsyncStorage.getItem(STORAGE_PREFIX + key);
            if (value) {
                return JSON.parse(value) as T;
            }
            return null;
        } catch (error) {
            console.warn('[Storage] Get error:', error);
            return null;
        }
    },

    async set<T>(key: string, value: T): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        } catch (error) {
            console.warn('[Storage] Set error:', error);
        }
    },

    async remove(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(STORAGE_PREFIX + key);
        } catch (error) {
            console.warn('[Storage] Remove error:', error);
        }
    },

    async clear(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cheragKeys = keys.filter((key) => key.startsWith(STORAGE_PREFIX));
            await AsyncStorage.multiRemove(cheragKeys);
        } catch (error) {
            console.warn('[Storage] Clear error:', error);
        }
    },

    async getAllKeys(): Promise<string[]> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            return keys
                .filter((key) => key.startsWith(STORAGE_PREFIX))
                .map((key) => key.replace(STORAGE_PREFIX, ''));
        } catch (error) {
            console.warn('[Storage] GetAllKeys error:', error);
            return [];
        }
    },
};

/**
 * User Preferences Storage
 */
export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    lastActiveTab: string;
    lastVisit: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'system',
    lastActiveTab: 'index',
    lastVisit: Date.now(),
};

export const preferencesStorage = {
    async get(): Promise<UserPreferences> {
        const prefs = await storage.get<UserPreferences>('preferences');
        return { ...DEFAULT_PREFERENCES, ...prefs };
    },

    async set(prefs: Partial<UserPreferences>): Promise<void> {
        const current = await this.get();
        await storage.set('preferences', { ...current, ...prefs, lastVisit: Date.now() });
    },

    async getTheme(): Promise<UserPreferences['theme']> {
        const prefs = await this.get();
        return prefs.theme;
    },

    async setTheme(theme: UserPreferences['theme']): Promise<void> {
        await this.set({ theme });
    },
};

/**
 * Cache storage with TTL
 */
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

export const cacheStorage = {
    async get<T>(key: string): Promise<T | null> {
        try {
            const entry = await storage.get<CacheEntry<T>>(`cache_${key}`);
            if (entry && Date.now() < entry.expiresAt) {
                return entry.data;
            }
            // Expired or not found
            if (entry) {
                await this.remove(key);
            }
            return null;
        } catch (error) {
            console.warn('[CacheStorage] Get error:', error);
            return null;
        }
    },

    async set<T>(key: string, data: T, ttlMs: number = 30 * 60 * 1000): Promise<void> {
        try {
            const entry: CacheEntry<T> = {
                data,
                expiresAt: Date.now() + ttlMs,
            };
            await storage.set(`cache_${key}`, entry);
        } catch (error) {
            console.warn('[CacheStorage] Set error:', error);
        }
    },

    async remove(key: string): Promise<void> {
        await storage.remove(`cache_${key}`);
    },

    async clear(): Promise<void> {
        const keys = await storage.getAllKeys();
        const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
        await Promise.all(cacheKeys.map((key) => storage.remove(key)));
    },
};
