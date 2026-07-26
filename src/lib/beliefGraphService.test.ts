import { describe, it, expect, vi } from 'vitest';
import { detectRecursionConceptId, resolveConceptId, RECURSION_CONCEPTS, fetchBeliefGraph } from './beliefGraphService';

vi.mock('./supabaseClient', () => ({
    supabase: {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col, val) => {
                if (col === 'course_id') {
                    return Promise.resolve({ data: [], error: null });
                }
                return {
                    eq: vi.fn().mockResolvedValue({ data: [], error: null })
                };
            })
        })
    }
}));

describe('beliefGraphService', () => {
    describe('detectRecursionConceptId', () => {
        it('detects stack overflow concept', () => {
            expect(detectRecursionConceptId('What causes a stack overflow?')).toBe('recursion.stack_overflow');
        });

        it('detects call stack concept', () => {
            expect(detectRecursionConceptId('How does the call stack manage stack frames?')).toBe('recursion.call_stack');
        });

        it('detects tail recursion concept', () => {
            expect(detectRecursionConceptId('Explain tail-recursive optimization.')).toBe('recursion.tail_recursion');
        });

        it('detects mutual recursion concept', () => {
            expect(detectRecursionConceptId('Functions that are mutually recursive')).toBe('recursion.mutual_recursion');
        });

        it('detects base case concept', () => {
            expect(detectRecursionConceptId('What is the stop condition or base case?')).toBe('recursion.base_case');
        });

        it('maps "calls itself" to recursive_call', () => {
            expect(detectRecursionConceptId('What happens when a function calls itself?')).toBe('recursion.recursive_call');
        });

        it('does not map generic "recursion" to recursive_call', () => {
            const result = resolveConceptId('Explain recursion in Python');
            // Should go through dynamic resolution, not hardcode to recursive_call
            expect(result.conceptId).not.toBe('recursion.recursive_call');
        });
    });

    describe('resolveConceptId', () => {
        it('resolves recursion sub-concepts correctly', () => {
            const res = resolveConceptId('What causes a stack overflow?');
            expect(res).toEqual({
                courseId: 'recursion',
                conceptId: 'recursion.stack_overflow'
            });
        });

        it('resolves non-recursion topics dynamically without hardcoding recursion.recursive_call', () => {
            const res = resolveConceptId('Which component interprets instructions?', 'Computer Architecture');
            expect(res.courseId).toBe('computer_architecture');
            expect(res.conceptId).toContain('computer_architecture.');
            expect(res.conceptId).not.toContain('recursion');
        });
    });

    describe('RECURSION_CONCEPTS', () => {
        it('defines all 6 core recursion concepts', () => {
            expect(RECURSION_CONCEPTS).toHaveLength(6);
            const conceptIds = RECURSION_CONCEPTS.map(c => c.concept_id);
            expect(conceptIds).toContain('recursion.base_case');
            expect(conceptIds).toContain('recursion.recursive_call');
            expect(conceptIds).toContain('recursion.call_stack');
            expect(conceptIds).toContain('recursion.stack_overflow');
            expect(conceptIds).toContain('recursion.mutual_recursion');
            expect(conceptIds).toContain('recursion.tail_recursion');
        });
    });
});
