/**
 * useChat Hook
 * Chat message management with AI responses
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { chatWithAI } from '../lib/aiService';
import type { Message } from '../types/index';

interface UseChatState {
    messages: Message[];
    isLoading: boolean;
    error: string | null;
}

export function useChat(userId: string | undefined) {
    const [state, setState] = useState<UseChatState>({
        messages: [],
        isLoading: false,
        error: null,
    });

    // Send a message and get AI response
    const sendMessage = useCallback(
        async (content: string, context: string) => {
            if (!content.trim() || !userId) return;

            // Add user message optimistically
            const userMessage: Message = {
                id: `user_${Date.now()}`,
                role: 'user',
                content: content.trim(),
                created_at: new Date().toISOString(),
            };

            setState((prev) => ({
                ...prev,
                messages: [...prev.messages, userMessage],
                isLoading: true,
                error: null,
            }));

            try {
                // Get AI response
                const response = await chatWithAI(context, content);

                // Create AI message
                const aiMessage: Message = {
                    id: `ai_${Date.now()}`,
                    role: 'assistant',
                    content: response,
                    created_at: new Date().toISOString(),
                };

                // Update state with AI response
                setState((prev) => ({
                    ...prev,
                    messages: [...prev.messages, aiMessage],
                    isLoading: false,
                }));

                // Optionally save to database
                try {
                    // Save both messages to Supabase
                    const { data: chat } = await supabase
                        .from('chats')
                        .select('id')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    const chatId = chat?.id;

                    if (chatId) {
                        await supabase.from('messages').insert([
                            { chat_id: chatId, role: 'user', content: userMessage.content },
                            { chat_id: chatId, role: 'assistant', content: aiMessage.content },
                        ]);
                    }
                } catch (dbError) {
                    // Non-critical - just log
                    console.debug('[Chat] DB save failed:', dbError);
                }
            } catch (error: any) {
                console.error('[Chat] Error:', error);

                // Add error message
                const errorMessage: Message = {
                    id: `error_${Date.now()}`,
                    role: 'assistant',
                    content: "I'm sorry, I encountered an error. Please try again.",
                    created_at: new Date().toISOString(),
                };

                setState((prev) => ({
                    ...prev,
                    messages: [...prev.messages, errorMessage],
                    isLoading: false,
                    error: error.message || 'Failed to get response',
                }));
            }
        },
        [userId]
    );

    // Clear chat history
    const clearChat = useCallback(() => {
        setState({
            messages: [],
            isLoading: false,
            error: null,
        });
    }, []);

    // Load previous messages from database
    const loadMessages = useCallback(async () => {
        if (!userId) return;

        try {
            // Get latest chat
            const { data: chat } = await supabase
                .from('chats')
                .select('id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (chat?.id) {
                const { data: messages } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('chat_id', chat.id)
                    .order('created_at', { ascending: true })
                    .limit(50);

                if (messages && messages.length > 0) {
                    setState((prev) => ({
                        ...prev,
                        messages: messages.map((m) => ({
                            id: m.id,
                            role: m.role as 'user' | 'assistant',
                            content: m.content,
                            created_at: m.created_at,
                        })),
                    }));
                }
            }
        } catch (error) {
            console.debug('[Chat] Load messages failed:', error);
        }
    }, [userId]);

    return {
        ...state,
        sendMessage,
        clearChat,
        loadMessages,
        hasMessages: state.messages.length > 0,
    };
}

export default useChat;
