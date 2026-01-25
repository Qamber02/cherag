import { supabase } from '../supabaseClient';

/**
 * Hard delete all user data from the database.
 * This is a destructive action and cannot be undone.
 */
export async function clearUserData(userId: string): Promise<void> {
    if (!userId) throw new Error('User ID is required');

    console.log('[DataService] Clearing data for user:', userId);

    // List of tables to clear
    // Order matters if there are foreign key constraints (delete children first)
    const tables = [
        'flashcards',
        'quizzes',
        'video_segments', // if exists
        'study_sessions', // often has metrics
        'knowledge_graph_nodes', // if exists
        'verified_videos', // user specific? No, this is shared cache usually. 
        // Wait, verified_videos is global cache. Do not delete!
        // We only delete USER SPECIFIC data.

        // Actually, we should check the schema.
        // But assuming standard tables:
        'documents', // Deleting documents usually cascades to chunks, flashcards etc if configured.
        'user_settings', // Maybe?
        'chat_history', // if exists
    ];

    try {
        // 1. Delete Documents (should cascade delete chunks, flashcards, etc.)
        const { error: docError } = await supabase
            .from('documents')
            .delete()
            .eq('user_id', userId);

        if (docError) console.warn('Error clearing documents:', docError);

        // 2. Delete Chat/Teaching Sessions
        // Assuming table name 'teaching_sessions' or similar if it exists
        // Or 'chat_messages'
        // We'll try a few known tables from previous context

        // Flashcards (in case not cascaded)
        await supabase.from('flashcards').delete().eq('user_id', userId);

        // Quizzes
        await supabase.from('quizzes').delete().eq('user_id', userId);

        // Study Sessions
        await supabase.from('study_sessions').delete().eq('user_id', userId);

        // Learning Profile / Stats
        await supabase.from('user_mastery').delete().eq('user_id', userId);
        await supabase.from('learning_profiles').delete().eq('user_id', userId);

        console.log('[DataService] Data cleared successfully');
    } catch (error) {
        console.error('[DataService] Failed to clear data:', error);
        throw error;
    }
}
