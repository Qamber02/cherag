import { supabase } from './supabaseClient';

const API_BASE = (() => {
    const url = import.meta.env.VITE_API_BASE_URL;
    if (url) return url;
    if (import.meta.env.DEV) return 'http://localhost:8000';
    throw new Error('VITE_API_BASE_URL environment variable is required in production');
})();

async function getAuthHeaders(): Promise<Headers> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
        throw new Error('Authentication required. Please log in.');
    }
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${session.access_token}`);
    return headers;
}

export async function endStudySession(
    courseId: string,
    sessionTranscript: string
): Promise<{ status: string; summary: string; id?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('User not authenticated');
    }

    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/session/end`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            student_id: user.id,
            course_id: courseId,
            session_transcript: sessionTranscript
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to end study session');
    }

    return response.json();
}
