import { describe, it, expect } from 'vitest';
import { validate, summaryOptionsSchema, chatQuerySchema } from './validation';

describe('Validation Library', () => {
    it('validates correct summary options', () => {
        const input = { length: 'short', style: 'bullet' };
        const result = validate(summaryOptionsSchema, input);
        expect(result).toEqual(input);
    });

    it('throws error for invalid summary options', () => {
        const input = { length: 'extra-long' };
        expect(() => validate(summaryOptionsSchema, input)).toThrow('Validation Error');
    });

    it('validates correct chat query', () => {
        const input = { context: 'Hello', query: 'World' };
        const result = validate(chatQuerySchema, input);
        expect(result).toEqual(input);
    });

    it('throws error for empty chat query', () => {
        const input = { context: 'Hello', query: '' };
        expect(() => validate(chatQuerySchema, input)).toThrow('Validation Error');
    });
});
