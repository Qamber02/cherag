/**
 * useAuth Hook
 * Authentication state management
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, onAuthStateChange, signOut as supabaseSignOut } from '../lib/supabase';
import { preferencesStorage } from '../lib/storage';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        isLoading: true,
        isAuthenticated: false,
    });

    useEffect(() => {
        // Initial session check
        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                setState({
                    user: session?.user ?? null,
                    session: session,
                    isLoading: false,
                    isAuthenticated: !!session,
                });
            } catch (error) {
                console.error('[Auth] Init error:', error);
                setState((prev) => ({ ...prev, isLoading: false }));
            }
        };

        initializeAuth();

        // Subscribe to auth changes
        const { data: { subscription } } = onAuthStateChange((session) => {
            setState({
                user: session?.user ?? null,
                session: session,
                isLoading: false,
                isAuthenticated: !!session,
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = useCallback(async () => {
        try {
            const { error } = await supabaseSignOut();
            if (error) throw error;

            // Clear preferences on logout
            await preferencesStorage.set({ lastActiveTab: 'index' });

            setState({
                user: null,
                session: null,
                isLoading: false,
                isAuthenticated: false,
            });
        } catch (error) {
            console.error('[Auth] Sign out error:', error);
            throw error;
        }
    }, []);

    const refreshSession = useCallback(async () => {
        try {
            const { data: { session }, error } = await supabase.auth.refreshSession();
            if (error) throw error;

            setState({
                user: session?.user ?? null,
                session: session,
                isLoading: false,
                isAuthenticated: !!session,
            });

            return session;
        } catch (error) {
            console.error('[Auth] Refresh error:', error);
            return null;
        }
    }, []);

    return {
        ...state,
        signOut,
        refreshSession,
    };
}

export default useAuth;
