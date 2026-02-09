'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

// Environment variable validation
function getEnvOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

// Create client-side Supabase instance with validated env vars
const supabaseUrl = getEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvOrThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuthProviderProps {
    children: (session: Session) => ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let subscription: { unsubscribe: () => void } | null = null;

        // Set up auth state subscription FIRST
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });
        subscription = data.subscription;

        // Then fetch current session with error handling
        const fetchSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
            } catch (error) {
                console.error('Failed to get session:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSession();

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // Handle redirect in useEffect instead of during render
    useEffect(() => {
        if (!loading && !session) {
            navigate('/auth');
        }
    }, [loading, session, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        // Return null while redirecting (redirect handled in useEffect)
        return null;
    }

    return <>{children(session)}</>;
}
