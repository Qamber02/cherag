import { z } from 'zod';

export const summaryOptionsSchema = z.object({
    length: z.enum(['short', 'medium', 'long']).optional(),
    style: z.enum(['bullet', 'paragraph', 'concise']).optional(),
    focus: z.string().max(100).optional(),
});

export const chatQuerySchema = z.object({
    context: z.string().min(1, "Context is required").max(100000, "Context too long"),
    query: z.string().min(1, "Query is required").max(1000, "Query too long"),
});

export const flashcardOptionsSchema = z.object({
    context: z.string().min(10, "Context is too short").max(100000, "Context too long")
});

export const quizOptionsSchema = z.object({
    context: z.string().min(10, "Context is too short").max(100000, "Context is too long"),
    count: z.number().min(1).max(20).optional().default(5),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
    forceRefresh: z.boolean().optional(),
});

// Helper to validate and throw error
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        // Format error message
        const error = result.error as any;
        const errorMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation Error: ${errorMessage}`);
    }
    return result.data;
}
