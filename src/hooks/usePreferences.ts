import { useState, useEffect } from 'react';
import { getPreferences, savePreferences } from '../lib/preferencesService';
import type { UserPreferences } from '../lib/preferencesService';

export function usePreferences() {
    const [preferences, setPreferencesState] = useState<UserPreferences>(getPreferences());

    useEffect(() => {
        const handlePreferenceChange = () => {
            setPreferencesState(getPreferences());
        };

        // Listen for custom event from service
        window.addEventListener('preferences_changed', handlePreferenceChange);

        // Listen for storage events (cross-tab sync)
        window.addEventListener('storage', handlePreferenceChange);

        return () => {
            window.removeEventListener('preferences_changed', handlePreferenceChange);
            window.removeEventListener('storage', handlePreferenceChange);
        };
    }, []);

    const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
        savePreferences({ [key]: value } as Partial<UserPreferences>);
    };

    return { preferences, updatePreference };
}
