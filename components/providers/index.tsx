'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/src/components/ui/ToastContext';
import { VideoProvider } from '@/src/components/premium/VideoContext';

interface ProvidersProps {
    children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <ToastProvider>
            <VideoProvider>
                {children}
            </VideoProvider>
        </ToastProvider>
    );
}
