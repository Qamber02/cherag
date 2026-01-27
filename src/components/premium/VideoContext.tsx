import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface VideoContextType {
    activePlayerId: string | null;
    setActivePlayerId: (id: string | null) => void;
    activeTab: string | null;
    setActiveTab: (tab: string | null) => void;
    registerPlayer: (id: string) => void;
    unregisterPlayer: (id: string) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: React.ReactNode }) {
    const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const registerPlayer = useCallback((_id: string) => {
        // Placeholder for future multi-player logic
    }, []);

    const unregisterPlayer = useCallback((id: string) => {
        if (activePlayerId === id) {
            setActivePlayerId(null);
        }
    }, [activePlayerId]);

    // Pause all videos when tab changes away from videos
    useEffect(() => {
        if (activeTab && activeTab !== 'videos') {
            setActivePlayerId(null);
        }
    }, [activeTab]);

    // Cleanup on unmount or visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setActivePlayerId(null);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return (
        <VideoContext.Provider value={{ activePlayerId, setActivePlayerId, activeTab, setActiveTab, registerPlayer, unregisterPlayer }}>
            {children}
        </VideoContext.Provider>
    );
}

export function useVideoContext() {
    return useContext(VideoContext);
}
