// Activity History Service - Saves study activities to database
// Gracefully handles missing table or columns
import { supabase } from './supabaseClient';

export interface ActivityRecord {
    user_id: string;
    activity_type: 'summary' | 'flashcard' | 'quiz' | 'diagram' | 'mindmap' | 'chat' | 'video';
    title: string;
    content_preview: string;
}

// Save activity to history - gracefully handles errors
export async function saveActivity(activity: ActivityRecord): Promise<void> {
    try {
        // Only save basic required fields
        const { error } = await supabase
            .from('activity_history')
            .insert({
                user_id: activity.user_id,
                activity_type: activity.activity_type,
                title: activity.title,
                content_preview: activity.content_preview?.slice(0, 200) || ''
            });

        if (error) {
            // Silently fail - don't break the app
            console.debug('[ActivityHistory] Could not save:', error.code);
        }
    } catch {
        // Silently fail
    }
}

// Get saved content - returns null if not available
export async function getSavedContent(_userId: string, _type: string): Promise<string | null> {
    // Disabled for now - table schema doesn't support full content storage
    return null;
}

// Save diagram - just logs activity, doesn't persist full content
export async function saveDiagram(userId: string, _diagramCode: string): Promise<void> {
    await saveActivity({
        user_id: userId,
        activity_type: 'diagram',
        title: 'Generated Flowchart',
        content_preview: 'Flowchart diagram generated'
    });
}

// Save mindmap/roadmap - just logs activity
export async function saveRoadmap(userId: string, roadmap: any): Promise<void> {
    await saveActivity({
        user_id: userId,
        activity_type: 'mindmap',
        title: roadmap?.title || 'Learning Roadmap',
        content_preview: `Roadmap with ${roadmap?.children?.length || 0} topics`
    });
}

// Save summary - just logs activity
export async function saveSummary(userId: string, summary: string): Promise<void> {
    await saveActivity({
        user_id: userId,
        activity_type: 'summary',
        title: 'Document Summary',
        content_preview: summary?.slice(0, 100) || 'Summary generated'
    });
}

// These return null since we can't persist full content without proper schema
export async function getLastDiagram(_userId: string): Promise<string | null> {
    return null;
}

export async function getLastRoadmap(_userId: string): Promise<any | null> {
    return null;
}

export async function getLastSummary(_userId: string): Promise<string | null> {
    return null;
}
