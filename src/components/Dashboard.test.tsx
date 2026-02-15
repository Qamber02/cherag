import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
    })),
}));

vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        }
    }
}));

describe('Dashboard Component', () => {
    it('renders without crashing', () => {
        render(
            <MemoryRouter>
                <Dashboard session={{
                    user: { id: 'test-user', email: 'test@example.com' },
                    access_token: 'token',
                    refresh_token: 'refresh',
                    expires_in: 3600,
                    token_type: 'bearer'
                } as any} />
            </MemoryRouter>
        );
        // Basic check - since Dashboard has many async states, we just smoke test the render
        // Logic might need adjusted based on auth state mocks
        expect(document.body).toBeTruthy();
    });
});
