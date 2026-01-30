// Activity History Service - Saves study activities to database
// Gracefully handles missing table or columns
import { supabase } from './supabaseClient';

export interface ActivityRecord {
    user_id: string;
    activity_type: 'summary' | 'flashcard' | 'quiz' | 'mindmap' | 'chat' | 'video' | 'teaching_session';
    title: string;
    content_preview: string;
    content_full?: string;
    metadata?: any;
}

// Save activity to history - gracefully handles errors
export async function saveActivity(activity: ActivityRecord): Promise<void> {
    try {
        const { error } = await supabase
            .from('activity_history')
            .insert({
                user_id: activity.user_id,
                activity_type: activity.activity_type,
                title: activity.title,
                // content_preview and content_full might strictly trigger 400 if columns don't exist
                // content_preview: activity.content_preview?.slice(0, 200) || '',
                // content_full: activity.content_full || activity.content_preview || '',
                metadata: {
                    ...(activity.metadata || {}),
                    content_preview: activity.content_preview?.slice(0, 200) || '',
                    content_full: activity.content_full || activity.content_preview || '',
                    content_backup: activity.content_full || activity.content_preview || ''
                }
            });

        if (error) {
            console.error('[ActivityHistory] Could not save:', error);
        }
    } catch (e) {
        console.error('[ActivityHistory] Unexpected error:', e);
    }
}

// Get saved content - returns null if not available
export async function getSavedContent(userId: string, type: string): Promise<string | null> {
    try {
        const { data } = await supabase
            .from('activity_history')
            .select('*') // Select all to avoid 400 if content_full column is missing
            .eq('user_id', userId)
            .eq('activity_type', type)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return data?.content_full || data?.metadata?.content_backup || null;
    } catch {
        return null;
    }
}


// Save mindmap/roadmap - just logs activity
export async function saveRoadmap(userId: string, roadmap: any): Promise<void> {
    await saveActivity({
        user_id: userId,
        activity_type: 'mindmap',
        title: roadmap?.title || 'Learning Roadmap',
        content_preview: `Roadmap with ${roadmap?.children?.length || 0} topics`,
        metadata: roadmap
    });
}

// Save summary - just logs activity
export async function saveSummary(userId: string, summary: string): Promise<void> {
    await saveActivity({
        user_id: userId,
        activity_type: 'summary',
        title: 'Document Summary',
        content_preview: summary?.slice(0, 100) + '...' || 'Summary generated',
        content_full: summary
    });
}



export async function getLastRoadmap(userId: string): Promise<any | null> {
    try {
        const { data } = await supabase
            .from('activity_history')
            .select('metadata')
            .eq('user_id', userId)
            .eq('activity_type', 'mindmap')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return data?.metadata || null;
    } catch {
        return null;
    }
}

export async function getLastSummary(userId: string): Promise<string | null> {
    return getSavedContent(userId, 'summary');
}

// Mental Model Persistence
export async function saveMentalModel(userId: string, model: string, input: string, result: any): Promise<void> {
    await saveActivity({
        user_id: userId,
        activity_type: 'mental_model' as any,
        title: `Mental Model: ${model}`,
        content_preview: result.definition,
        content_full: JSON.stringify({ input, model, result }), // Store full state
        metadata: { input, model }
    });
}

export async function getLastMentalModel(userId: string): Promise<any | null> {
    const content = await getSavedContent(userId, 'mental_model');
    if (!content) return null;
    try {
        return JSON.parse(content);
    } catch {
        return null;
    }
}

// Teaching Session Persistence
export async function saveTeachingSessionState(userId: string, concept: string, messages: any[], evaluation: any): Promise<void> {
    await saveActivity({
        user_id: userId,
        activity_type: 'teaching_session',
        title: `Teaching Session: ${concept}`,
        content_preview: `Teaching session on ${concept}`,
        content_full: JSON.stringify({ concept, messages, evaluation }),
        metadata: { concept, evaluation }
    });
}

export async function getLastTeachingSessionState(userId: string): Promise<any | null> {
    const content = await getSavedContent(userId, 'teaching_session');
    if (!content) return null;
    try {
        return JSON.parse(content);
    } catch {
        return null;
    }
}

// Quiz Activity
export async function saveQuizActivity(userId: string, topic: string, score: number, total: number): Promise<void> {
    await saveActivity({
        user_id: userId,
        activity_type: 'quiz',
        title: `Quiz: ${topic}`,
        content_preview: `Score: ${score}/${total} (${Math.round((score / total) * 100)}%)`,
        content_full: JSON.stringify({ score, total, topic }),
        metadata: { score, total, topic }
    });
}
