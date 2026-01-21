/**
 * Chat Screen
 */

import React, { useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useFiles, useChat } from '../../src/hooks';
import { ChatBubble, H3, Body, LoadingSpinner } from '../../src/components';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale } from '../../src/styles/responsive';

export default function ChatScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const { user } = useAuth();
    const { getContext, hasContext } = useFiles(user?.id);
    const { messages, sendMessage, isLoading, clearChat, loadMessages } = useChat(user?.id);

    const [inputText, setInputText] = React.useState('');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        // Scroll to bottom when new messages arrive
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    const handleSend = () => {
        if (!inputText.trim()) return;

        const context = getContext();
        sendMessage(inputText.trim(), context);
        setInputText('');
    };

    const renderMessage = ({ item }: { item: any }) => (
        <ChatBubble
            content={item.content}
            role={item.role}
            timestamp={new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            isDark={isDark}
        />
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary[600] + '20' }]}>
                <Ionicons name="chatbubbles" size={scale(48)} color={colors.primary[500]} />
            </View>
            <H3 isDark={isDark} align="center">Start a Conversation</H3>
            <Body isDark={isDark} color={theme.textSecondary} align="center" style={styles.emptyText}>
                {hasContext
                    ? 'Ask questions about your uploaded documents and I\'ll help you understand them better.'
                    : 'Upload a document first to get context-aware responses, or just ask me anything!'}
            </Body>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={styles.headerLeft}>
                    <View style={[styles.avatarContainer, { backgroundColor: colors.primary[600] }]}>
                        <Ionicons name="sparkles" size={scale(20)} color="#ffffff" />
                    </View>
                    <View>
                        <H3 isDark={isDark} style={styles.headerTitle}>Cherág</H3>
                        <Body isDark={isDark} color={theme.textMuted} style={styles.headerSubtitle}>
                            AI Study Assistant
                        </Body>
                    </View>
                </View>
                {messages.length > 0 && (
                    <TouchableOpacity
                        style={[styles.clearButton, { backgroundColor: theme.surfaceLight }]}
                        onPress={clearChat}
                    >
                        <Ionicons name="trash-outline" size={scale(20)} color={colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.chatContainer}
                keyboardVerticalOffset={0}
            >
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messagesList}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                />

                {/* Typing indicator */}
                {isLoading && (
                    <View style={styles.typingIndicator}>
                        <LoadingSpinner size="small" message="Thinking..." isDark={isDark} />
                    </View>
                )}

                {/* Input */}
                <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.surfaceLight, color: theme.textPrimary }]}
                        placeholder="Ask a question..."
                        placeholderTextColor={theme.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                        editable={!isLoading}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            { backgroundColor: inputText.trim() ? colors.primary[600] : theme.surfaceLight },
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || isLoading}
                    >
                        <Ionicons
                            name="send"
                            size={scale(20)}
                            color={inputText.trim() ? '#ffffff' : theme.textMuted}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.md),
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.md),
    },
    avatarContainer: {
        width: scale(44),
        height: scale(44),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        marginBottom: 0,
    },
    headerSubtitle: {
        fontSize: fontScale(12),
    },
    clearButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatContainer: {
        flex: 1,
    },
    messagesList: {
        padding: scale(spacing.md),
        flexGrow: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(spacing.xl),
        paddingVertical: scale(spacing['3xl']),
    },
    emptyIcon: {
        width: scale(80),
        height: scale(80),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(spacing.lg),
    },
    emptyText: {
        marginTop: scale(spacing.sm),
    },
    typingIndicator: {
        paddingHorizontal: scale(spacing.lg),
        paddingBottom: scale(spacing.sm),
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: scale(spacing.md),
        gap: scale(spacing.sm),
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: borderRadius.lg,
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.md),
        fontSize: fontScale(16),
        maxHeight: scale(100),
    },
    sendButton: {
        width: scale(44),
        height: scale(44),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
