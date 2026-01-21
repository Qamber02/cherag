/**
 * Activity History Screen
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { H3, Body, BodySmall, Card } from '../../src/components';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';

type ActivityType = 'summary' | 'flashcard' | 'quiz' | 'mindmap' | 'chat' | 'video';

interface ActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    preview: string;
    createdAt: string;
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    summary: { icon: 'document-text', color: colors.primary[500], label: 'Summary' },
    flashcard: { icon: 'layers', color: colors.accent[500], label: 'Flashcards' },
    quiz: { icon: 'help-circle', color: '#8b5cf6', label: 'Quiz' },
    mindmap: { icon: 'map', color: '#ec4899', label: 'Roadmap' },
    chat: { icon: 'chatbubbles', color: colors.success, label: 'Chat' },
    video: { icon: 'play-circle', color: '#ef4444', label: 'Video' },
};

// Mock data - in real app, fetch from Supabase
const MOCK_ACTIVITIES: ActivityItem[] = [
    {
        id: '1',
        type: 'summary',
        title: 'Chapter 5 Summary',
        preview: 'Key concepts covered include data structures, algorithms, and computational complexity...',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
        id: '2',
        type: 'flashcard',
        title: '10 Flashcards Generated',
        preview: 'Study cards on machine learning fundamentals',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
        id: '3',
        type: 'quiz',
        title: 'Quiz Completed',
        preview: 'Scored 4/5 on data science concepts',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
        id: '4',
        type: 'chat',
        title: 'AI Chat Session',
        preview: 'Discussed neural network architectures and deep learning',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
];

export default function HistoryScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const [activities] = useState<ActivityItem[]>(MOCK_ACTIVITIES);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const containerMaxWidth = isTablet() ? 600 : SCREEN_WIDTH;

    const renderItem = ({ item }: { item: ActivityItem }) => {
        const config = ACTIVITY_CONFIG[item.type];

        return (
            <Card isDark={isDark} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                    <View style={[styles.activityIcon, { backgroundColor: config.color + '20' }]}>
                        <Ionicons name={config.icon} size={scale(20)} color={config.color} />
                    </View>
                    <View style={styles.activityInfo}>
                        <View style={styles.activityTitleRow}>
                            <Body isDark={isDark} style={styles.activityTitle}>{item.title}</Body>
                            <BodySmall isDark={isDark} color={theme.textMuted}>{formatDate(item.createdAt)}</BodySmall>
                        </View>
                        <BodySmall isDark={isDark} color={config.color}>{config.label}</BodySmall>
                    </View>
                </View>
                <BodySmall isDark={isDark} color={theme.textSecondary} numberOfLines={2} style={styles.preview}>
                    {item.preview}
                </BodySmall>
            </Card>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={scale(64)} color={theme.textMuted} />
            <Body isDark={isDark} color={theme.textMuted} align="center" style={styles.emptyText}>
                No activity yet.{'\n'}Start studying to see your history here!
            </Body>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scale(24)} color={theme.textPrimary} />
                </TouchableOpacity>
                <H3 isDark={isDark}>Activity History</H3>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={activities}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { maxWidth: containerMaxWidth },
                    activities.length === 0 && styles.emptyList,
                ]}
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
            />
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
    backButton: {
        padding: scale(spacing.sm),
        marginLeft: -scale(spacing.sm),
    },
    placeholder: {
        width: scale(40),
    },
    listContent: {
        padding: scale(spacing.lg),
        alignSelf: 'center',
        width: '100%',
    },
    emptyList: {
        flexGrow: 1,
    },
    activityCard: {
        marginBottom: scale(spacing.md),
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(spacing.sm),
    },
    activityIcon: {
        width: scale(40),
        height: scale(40),
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(spacing.md),
    },
    activityInfo: {
        flex: 1,
    },
    activityTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activityTitle: {
        fontWeight: '500',
        flex: 1,
    },
    preview: {
        marginLeft: scale(40 + spacing.md),
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(spacing['3xl']),
    },
    emptyText: {
        marginTop: scale(spacing.lg),
    },
});
