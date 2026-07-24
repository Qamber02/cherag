import { supabase } from './supabaseClient';

export type BeliefCorrectness = 'correct' | 'partially_correct' | 'misconception' | 'unknown';

export interface BeliefConcept {
    concept_id: string;
    concept_label: string;
}

export interface BeliefNode {
    id?: string;
    student_id: string;
    course_id: string;
    concept_id: string;
    concept_label: string;
    belief_statement: string | null;
    correctness: BeliefCorrectness;
    confidence: number;
    last_updated: string | null;
}

export interface BeliefEdge {
    id?: string;
    course_id: string;
    from_concept: string;
    to_concept: string;
    relationship: 'depends_on' | 'commonly_confused_with' | 'prerequisite_of';
}

export interface BeliefHistoryEntry {
    id: string;
    student_id: string;
    concept_id: string;
    belief_statement: string | null;
    correctness: BeliefCorrectness;
    confidence: number;
    triggering_answer: string | null;
    created_at: string;
}

export const RECURSION_CONCEPTS: BeliefConcept[] = [
    { concept_id: 'recursion.base_case', concept_label: 'Base case as termination requirement' },
    { concept_id: 'recursion.recursive_call', concept_label: 'Recursive call structure' },
    { concept_id: 'recursion.call_stack', concept_label: 'Call stack and stack depth' },
    { concept_id: 'recursion.stack_overflow', concept_label: 'Stack overflow causes' },
    { concept_id: 'recursion.mutual_recursion', concept_label: 'Mutual recursion' },
    { concept_id: 'recursion.tail_recursion', concept_label: 'Tail recursion optimization' },
];

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

export async function fetchBeliefGraph(studentId: string, courseId = 'recursion') {
    const [{ data: nodes, error: nodesError }, { data: edges, error: edgesError }] = await Promise.all([
        supabase
            .from('belief_nodes')
            .select('*')
            .eq('student_id', studentId)
            .eq('course_id', courseId),
        supabase
            .from('belief_edges')
            .select('*')
            .eq('course_id', courseId),
    ]);

    if (nodesError) throw nodesError;
    if (edgesError) throw edgesError;

    const nodeByConcept = new Map((nodes || []).map((node: BeliefNode) => [node.concept_id, node]));
    const mergedNodes = RECURSION_CONCEPTS.map((concept) => ({
        student_id: studentId,
        course_id: courseId,
        belief_statement: null,
        correctness: 'unknown' as BeliefCorrectness,
        confidence: 0,
        last_updated: null,
        ...concept,
        ...(nodeByConcept.get(concept.concept_id) || {}),
    }));

    return {
        nodes: mergedNodes,
        edges: (edges || []) as BeliefEdge[],
    };
}

export async function fetchBeliefHistory(studentId: string, conceptId: string): Promise<BeliefHistoryEntry[]> {
    const { data, error } = await supabase
        .from('belief_history')
        .select('*')
        .eq('student_id', studentId)
        .eq('concept_id', conceptId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as BeliefHistoryEntry[];
}

export async function updateBelief(
    studentId: string,
    courseId: string,
    conceptId: string,
    studentAnswer: string
): Promise<BeliefNode> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/belief/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            student_id: studentId,
            course_id: courseId,
            concept_id: conceptId,
            student_answer: studentAnswer,
        }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Belief update failed');
    }

    return response.json();
}

export function updateBeliefInBackground(
    studentId: string,
    courseId: string,
    conceptId: string,
    studentAnswer: string
) {
    updateBelief(studentId, courseId, conceptId, studentAnswer).catch((error) => {
        console.warn('[BeliefGraph] Background update failed:', error);
    });
}

export function detectRecursionConceptId(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('stack overflow') || lower.includes('overflow')) return 'recursion.stack_overflow';
    if (lower.includes('call stack') || lower.includes('stack frame') || lower.includes('stack depth')) return 'recursion.call_stack';
    if (lower.includes('tail recursion') || lower.includes('tail-recursive')) return 'recursion.tail_recursion';
    if (lower.includes('mutual recursion') || lower.includes('mutually recursive')) return 'recursion.mutual_recursion';
    if (lower.includes('base case') || lower.includes('termination') || lower.includes('stop condition')) return 'recursion.base_case';
    if (lower.includes('recursive call') || lower.includes('calls itself') || lower.includes('recursion')) return 'recursion.recursive_call';
    return 'recursion.recursive_call';
}
