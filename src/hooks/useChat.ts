
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Message {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
}

export function useChat(user: any) {
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
        if (!chatId) return;

        const userMsg: Message = { role: 'user', content };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // Save User Message
            await supabase.from('messages').insert({ chat_id: chatId, role: 'user', content });

            // Call client-side AI Service
            const { chatWithAI } = await import('../lib/aiService');
            const aiContent = await chatWithAI(context, content) || "Sorry, I couldn't process that.";
            const aiMsg: Message = { role: 'assistant', content: aiContent };

            setMessages(prev => [...prev, aiMsg]);

            // Save AI Message
            await supabase.from('messages').insert({ chat_id: chatId, role: 'assistant', content: aiContent });

        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, { role: 'assistant', content: "Error communicating with AI." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return { messages, sendMessage, isLoading };
}
