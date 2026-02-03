
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export function useChat(user: User | null) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);

    // Initialize or fetch latest chat
    useEffect(() => {
        if (!user) return;

        const loadChat = async () => {
            // For simplicity, load the most recent chat or create new
            const { data: chats } = await supabase.from('chats').select('id').order('created_at', { ascending: false }).limit(1);

            let currentChatId = chats?.[0]?.id;

            if (!currentChatId) {
                const { data: newChat } = await supabase.from('chats').insert({ user_id: user.id }).select().single();
                currentChatId = newChat?.id;
            }

            setChatId(currentChatId);

            if (currentChatId) {
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('chat_id', currentChatId)
                    .order('created_at', { ascending: true });
                setMessages(msgs || []);
            }
        };

        loadChat();
    }, [user]);

    const sendMessage = async (content: string, context: string) => {
        if (!content.trim() || !user) return;

        // Optimistic update
        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // Save user message
            await supabase.from('messages').insert({
                chat_id: chatId || user.id, // simplified
                role: 'user',
                content
            });

            // Use new aiService (FastAPI Backend)
            const { chatWithAI } = await import('../lib/aiService');
            // Legacy import removed
            const response = await chatWithAI(context, content);

            const aiMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response,
                created_at: new Date().toISOString()
            };

            setMessages(prev => [...prev, aiMsg]);

            // Save AI response
            await supabase.from('messages').insert({
                chat_id: chatId || user.id,
                role: 'assistant',
                content: response
            });

        } catch (err: unknown) {
            console.error('[Chat Error]', err);
            // Add error message to chat
            const errorMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "I'm sorry, I encountered an error processing your request.",
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return { messages, sendMessage, isLoading };
}
