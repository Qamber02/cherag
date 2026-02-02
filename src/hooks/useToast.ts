import { useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

let toastCounter = 0;

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Cleanup all timeouts on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
            timeoutRefs.current.clear();
        };
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = `toast-${++toastCounter}`;
        setToasts(prev => [...prev, { id, message, type }]);

        const timeoutId = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
            timeoutRefs.current.delete(id);
        }, duration);

        timeoutRefs.current.set(id, timeoutId);
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        // Clear the timeout when manually removing
        const timeout = timeoutRefs.current.get(id);
        if (timeout) {
            clearTimeout(timeout);
            timeoutRefs.current.delete(id);
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
    const error = useCallback((message: string) => addToast(message, 'error', 6000), [addToast]);
    const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);
    const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

    return { toasts, addToast, removeToast, success, error, warning, info };
}

export type { Toast, ToastType };

