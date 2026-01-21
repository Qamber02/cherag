/**
 * Dashboard / Home Screen
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useFiles } from '../../src/hooks';
import { Card, H2, H3, Body, BodySmall, Button, DocumentItem, LoadingSpinner } from '../../src/components';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, getGridColumns, responsive } from '../../src/styles/responsive';

const QUICK_ACTIONS = [
    { id: 'summary', icon: 'document-text', label: 'Summary', color: colors.primary[500], route: '/(main)/summary' },
    { id: 'flashcards', icon: 'layers', label: 'Flashcards', color: colors.accent[500], route: '/(main)/flashcards' },
    { id: 'quizzes', icon: 'help-circle', label: 'Quiz', color: '#8b5cf6', route: '/(main)/quizzes' },
    { id: 'chat', icon: 'chatbubbles', label: 'Chat', color: colors.success, route: '/(main)/chat' },
    { id: 'mindmap', icon: 'map', label: 'Roadmap', color: '#ec4899', route: '/(main)/mindmap' },
    { id: 'videos', icon: 'play-circle', label: 'Videos', color: '#ef4444', route: '/(main)/videos' },
];

export default function DashboardScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const { user } = useAuth();
    const { files, isLoading, uploadFile, isParsing, fetchFiles, selectFile } = useFiles(user?.id);

    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchFiles();
        setRefreshing(false);
    };

    const handleDocumentPress = (doc: any) => {
        selectFile(doc);
        router.push('/(main)/summary');
    };

    const columns = responsive({ phone: 3, tablet: 6 });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View>
                    <BodySmall isDark={isDark}>Welcome back</BodySmall>
                    <H2 isDark={isDark}>{user?.email?.split('@')[0] || 'Student'}</H2>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: theme.surfaceLight }]}
                        onPress={() => router.push('/(main)/history')}
                    >
                        <Ionicons name="time-outline" size={scale(22)} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: theme.surfaceLight }]}
                        onPress={() => router.push('/(main)/settings')}
                    >
                        <Ionicons name="settings-outline" size={scale(22)} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
                }
            >
                {/* Quick Actions */}
                <View style={styles.section}>
                    <H3 isDark={isDark} style={styles.sectionTitle}>Quick Actions</H3>
                    <View style={[styles.actionsGrid, { gap: scale(spacing.md) }]}>
                        {QUICK_ACTIONS.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: action.color + '15',
                                        width: `${100 / columns - 2}%`,
                                    },
                                ]}
                                onPress={() => router.push(action.route as any)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                                    <Ionicons name={action.icon as any} size={scale(20)} color="#ffffff" />
                                </View>
                                <Text style={[styles.actionLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                                    {action.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Upload Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <H3 isDark={isDark}>Documents</H3>
                        <Button
                            title="Upload"
                            size="sm"
                            icon={<Ionicons name="cloud-upload" size={scale(16)} color="#fff" />}
                            onPress={uploadFile}
                            loading={isParsing}
                        />
                    </View>

                    {isLoading ? (
                        <LoadingSpinner message="Loading documents..." isDark={isDark} />
                    ) : files.length === 0 ? (
                        <Card variant="outlined" isDark={isDark}>
                            <View style={styles.emptyState}>
                                <Ionicons name="document-outline" size={scale(48)} color={theme.textMuted} />
                                <Body isDark={isDark} color={theme.textMuted} align="center" style={styles.emptyText}>
                                    No documents yet.{'\n'}Upload a PDF, DOCX, or TXT file to get started.
                                </Body>
                                <Button
                                    title="Upload Document"
                                    onPress={uploadFile}
                                    loading={isParsing}
                                    icon={<Ionicons name="add" size={scale(18)} color="#fff" />}
                                />
                            </View>
                        </Card>
                    ) : (
                        <View style={styles.documentsList}>
                            {files.slice(0, 5).map((doc) => (
                                <DocumentItem
                                    key={doc.id}
                                    id={doc.id}
                                    filename={doc.filename}
                                    fileType={doc.file_type}
                                    createdAt={doc.created_at}
                                    onPress={() => handleDocumentPress(doc)}
                                    isDark={isDark}
                                />
                            ))}
                            {files.length > 5 && (
                                <TouchableOpacity style={styles.viewAllButton}>
                                    <BodySmall color={colors.primary[500]}>View all {files.length} documents</BodySmall>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Tips Section */}
                <View style={styles.section}>
                    <Card isDark={isDark} style={styles.tipCard}>
                        <View style={styles.tipContent}>
                            <Ionicons name="bulb" size={scale(24)} color={colors.accent[500]} />
                            <View style={styles.tipText}>
                                <Body isDark={isDark} style={styles.tipTitle}>Pro Tip</Body>
                                <BodySmall isDark={isDark} color={theme.textSecondary}>
                                    Upload your study materials and use AI to generate summaries, flashcards, and quizzes automatically!
                                </BodySmall>
                            </View>
                        </View>
                    </Card>
                </View>
            </ScrollView>
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
    headerActions: {
        flexDirection: 'row',
        gap: scale(spacing.sm),
    },
    iconButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: scale(spacing.lg),
        paddingBottom: scale(spacing['3xl']),
    },
    section: {
        marginBottom: scale(spacing.xl),
    },
    sectionTitle: {
        marginBottom: scale(spacing.md),
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(spacing.md),
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    actionCard: {
        alignItems: 'center',
        padding: scale(spacing.md),
        borderRadius: borderRadius.lg,
    },
    actionIcon: {
        width: scale(44),
        height: scale(44),
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(spacing.sm),
    },
    actionLabel: {
        fontSize: fontScale(12),
        fontWeight: '500',
        textAlign: 'center',
    },
    documentsList: {},
    emptyState: {
        alignItems: 'center',
        paddingVertical: scale(spacing.xl),
    },
    emptyText: {
        marginVertical: scale(spacing.lg),
    },
    viewAllButton: {
        alignItems: 'center',
        paddingVertical: scale(spacing.md),
    },
    tipCard: {
        backgroundColor: colors.accent[500] + '10',
    },
    tipContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(spacing.md),
    },
    tipText: {
        flex: 1,
    },
    tipTitle: {
        fontWeight: '600',
        marginBottom: scale(spacing.xs),
    },
});
