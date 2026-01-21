/**
 * ChatBubble Component
 * Message bubble for user and AI messages
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../styles/responsive';

interface ChatBubbleProps {
    content: string;
    role: 'user' | 'assistant';
    timestamp?: string;
    isDark?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
    content,
    role,
    timestamp,
    isDark = true,
}) => {
    const [copied, setCopied] = useState(false);
    const theme = isDark ? colors.dark : colors.light;
    const isUser = role === 'user';

    const handleCopy = async () => {
        // Note: For production, install and use @react-native-clipboard/clipboard
        // For now, we just show the copied state
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const bubbleMaxWidth = isTablet() ? SCREEN_WIDTH * 0.6 : SCREEN_WIDTH * 0.75;

    const markdownStyles = {
        body: {
            color: isUser ? '#ffffff' : theme.textPrimary,
            fontSize: fontScale(typography.fontSize.base),
            lineHeight: fontScale(typography.fontSize.base) * 1.5,
        },
        strong: {
            fontWeight: typography.fontWeight.bold as any,
            color: isUser ? '#ffffff' : colors.primary[400],
        },
        bullet_list: {
            marginVertical: scale(spacing.sm),
        },
        list_item: {
            marginBottom: scale(spacing.xs),
        },
        code_inline: {
            backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : theme.surfaceLight,
            borderRadius: borderRadius.sm,
            paddingHorizontal: scale(spacing.xs),
            fontFamily: 'monospace',
        },
        code_block: {
            backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : theme.surfaceLight,
            borderRadius: borderRadius.md,
            padding: scale(spacing.md),
            marginVertical: scale(spacing.sm),
        },
    };

    return (
        <View style={[styles.container, isUser && styles.userContainer]}>
            {/* Avatar */}
            {!isUser && (
                <View style={[styles.avatar, { backgroundColor: colors.primary[600] }]}>
                    <Ionicons name="sparkles" size={scale(16)} color="#ffffff" />
                </View>
            )}

            {/* Bubble */}
            <View
                style={[
                    styles.bubble,
                    { maxWidth: bubbleMaxWidth },
                    isUser
                        ? { backgroundColor: colors.primary[600] }
                        : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
                ]}
            >
                {/* Header for AI messages */}
                {!isUser && (
                    <View style={styles.header}>
                        <Text style={[styles.senderName, { color: colors.primary[400] }]}>Cherág</Text>
                        <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
                            <Ionicons
                                name={copied ? 'checkmark' : 'copy-outline'}
                                size={scale(16)}
                                color={theme.textMuted}
                            />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Content */}
                {isUser ? (
                    <Text style={styles.userText}>{content}</Text>
                ) : (
                    <Markdown style={markdownStyles}>{content}</Markdown>
                )}

                {/* Timestamp */}
                {timestamp && (
                    <Text
                        style={[
                            styles.timestamp,
                            { color: isUser ? 'rgba(255,255,255,0.6)' : theme.textMuted },
                        ]}
                    >
                        {timestamp}
                    </Text>
                )}
            </View>

            {/* User avatar placeholder for alignment */}
            {isUser && <View style={styles.avatarPlaceholder} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: scale(spacing.md),
        paddingHorizontal: scale(spacing.md),
    },

    userContainer: {
        flexDirection: 'row-reverse',
    },

    avatar: {
        width: scale(32),
        height: scale(32),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(spacing.sm),
    },

    avatarPlaceholder: {
        width: scale(32),
        marginLeft: scale(spacing.sm),
    },

    bubble: {
        borderRadius: borderRadius.lg,
        padding: scale(spacing.md),
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(spacing.xs),
    },

    senderName: {
        fontSize: fontScale(typography.fontSize.sm),
        fontWeight: typography.fontWeight.semibold,
    },

    copyButton: {
        padding: scale(spacing.xs),
    },

    userText: {
        color: '#ffffff',
        fontSize: fontScale(typography.fontSize.base),
        lineHeight: fontScale(typography.fontSize.base) * 1.5,
    },

    timestamp: {
        fontSize: fontScale(typography.fontSize.xs),
        marginTop: scale(spacing.xs),
        textAlign: 'right',
    },
});

export default ChatBubble;
