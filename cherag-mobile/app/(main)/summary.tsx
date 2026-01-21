/**
 * Summary Screen
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useAuth, useFiles } from '../../src/hooks';
import { generateSummary } from '../../src/lib/aiService';
import { Button, H3, Body, BodySmall, Card, LoadingSpinner } from '../../src/components';
import { colors, spacing, borderRadius, typography } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';

type SummaryLength = 'short' | 'medium' | 'detailed';
type SummaryStyle = 'bullet' | 'paragraph' | 'mixed';

export default function SummaryScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const { user } = useAuth();
    const { getContext, hasContext, uploadFile, isParsing, selectedFile } = useFiles(user?.id);

    const [summary, setSummary] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [length, setLength] = useState<SummaryLength>('medium');
    const [style, setStyle] = useState<SummaryStyle>('mixed');
    const [showOptions, setShowOptions] = useState(false);

    const handleGenerate = async () => {
        const context = getContext();
        if (!context || context.length < 50) {
            setError('Please upload a document with more content.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const result = await generateSummary(context, { length, style });
            setSummary(result);
        } catch (err: any) {
            setError(err.message || 'Failed to generate summary');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!summary) return;
        try {
            await Share.share({
                message: summary,
                title: 'Summary from Cherág',
            });
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    const markdownStyles = {
        body: {
            color: theme.textPrimary,
            fontSize: fontScale(typography.fontSize.base),
            lineHeight: fontScale(typography.fontSize.base) * 1.6,
        },
        heading1: {
            color: theme.textPrimary,
            fontSize: fontScale(typography.fontSize['2xl']),
            fontWeight: typography.fontWeight.bold,
            marginTop: scale(spacing.lg),
            marginBottom: scale(spacing.sm),
        },
        heading2: {
            color: theme.textPrimary,
            fontSize: fontScale(typography.fontSize.xl),
            fontWeight: typography.fontWeight.semibold,
            marginTop: scale(spacing.md),
            marginBottom: scale(spacing.xs),
        },
        strong: {
            color: colors.primary[400],
            fontWeight: typography.fontWeight.bold,
        },
        bullet_list: {
            marginVertical: scale(spacing.sm),
        },
        list_item: {
            marginBottom: scale(spacing.xs),
        },
    };

    const containerMaxWidth = isTablet() ? 700 : SCREEN_WIDTH;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <H3 isDark={isDark}>Summary</H3>
                <View style={styles.headerActions}>
                    {summary && (
                        <>
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: theme.surfaceLight }]}
                                onPress={handleShare}
                            >
                                <Ionicons name="share-outline" size={scale(20)} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: theme.surfaceLight }]}
                                onPress={() => setShowOptions(!showOptions)}
                            >
                                <Ionicons name="options-outline" size={scale(20)} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { maxWidth: containerMaxWidth }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Options Panel */}
                {showOptions && (
                    <Card isDark={isDark} style={styles.optionsCard}>
                        <BodySmall isDark={isDark} style={styles.optionLabel}>Length</BodySmall>
                        <View style={styles.optionRow}>
                            {(['short', 'medium', 'detailed'] as SummaryLength[]).map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[
                                        styles.optionChip,
                                        { backgroundColor: length === opt ? colors.primary[600] : theme.surfaceLight },
                                    ]}
                                    onPress={() => setLength(opt)}
                                >
                                    <BodySmall color={length === opt ? '#fff' : theme.textPrimary}>
                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </BodySmall>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <BodySmall isDark={isDark} style={styles.optionLabel}>Style</BodySmall>
                        <View style={styles.optionRow}>
                            {(['bullet', 'paragraph', 'mixed'] as SummaryStyle[]).map((opt) => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[
                                        styles.optionChip,
                                        { backgroundColor: style === opt ? colors.primary[600] : theme.surfaceLight },
                                    ]}
                                    onPress={() => setStyle(opt)}
                                >
                                    <BodySmall color={style === opt ? '#fff' : theme.textPrimary}>
                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </BodySmall>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>
                )}

                {/* Content */}
                {!hasContext ? (
                    <Card isDark={isDark} style={styles.emptyCard}>
                        <View style={styles.emptyState}>
                            <Ionicons name="document-outline" size={scale(48)} color={theme.textMuted} />
                            <Body isDark={isDark} color={theme.textMuted} align="center" style={styles.emptyText}>
                                Upload a document to generate a summary
                            </Body>
                            <Button
                                title="Upload Document"
                                onPress={uploadFile}
                                loading={isParsing}
                                icon={<Ionicons name="cloud-upload" size={scale(18)} color="#fff" />}
                            />
                        </View>
                    </Card>
                ) : isGenerating ? (
                    <LoadingSpinner fullScreen message="Generating summary..." isDark={isDark} />
                ) : summary ? (
                    <Card isDark={isDark} style={styles.summaryCard}>
                        <Markdown style={markdownStyles}>{summary}</Markdown>
                    </Card>
                ) : (
                    <Card isDark={isDark} style={styles.emptyCard}>
                        <View style={styles.emptyState}>
                            <Ionicons name="sparkles" size={scale(48)} color={colors.primary[500]} />
                            <Body isDark={isDark} align="center" style={styles.emptyText}>
                                {selectedFile
                                    ? `Ready to summarize: ${selectedFile.filename}`
                                    : 'Document loaded! Generate a summary to get started.'}
                            </Body>
                            <Button
                                title="Generate Summary"
                                onPress={handleGenerate}
                                icon={<Ionicons name="sparkles" size={scale(18)} color="#fff" />}
                            />
                        </View>
                    </Card>
                )}

                {/* Error */}
                {error && (
                    <Card variant="outlined" isDark={isDark} style={styles.errorCard}>
                        <View style={styles.errorContent}>
                            <Ionicons name="alert-circle" size={scale(24)} color={colors.error} />
                            <Body color={colors.error}>{error}</Body>
                        </View>
                    </Card>
                )}

                {/* Regenerate button */}
                {summary && !isGenerating && (
                    <Button
                        title="Regenerate"
                        variant="secondary"
                        onPress={handleGenerate}
                        fullWidth
                        icon={<Ionicons name="refresh" size={scale(18)} color={colors.primary[500]} />}
                        style={styles.regenerateButton}
                    />
                )}
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
        alignSelf: 'center',
        width: '100%',
    },
    optionsCard: {
        marginBottom: scale(spacing.lg),
    },
    optionLabel: {
        marginBottom: scale(spacing.xs),
        marginTop: scale(spacing.sm),
    },
    optionRow: {
        flexDirection: 'row',
        gap: scale(spacing.sm),
    },
    optionChip: {
        paddingHorizontal: scale(spacing.md),
        paddingVertical: scale(spacing.sm),
        borderRadius: borderRadius.full,
    },
    emptyCard: {},
    emptyState: {
        alignItems: 'center',
        paddingVertical: scale(spacing.xl),
    },
    emptyText: {
        marginVertical: scale(spacing.lg),
    },
    summaryCard: {},
    errorCard: {
        marginTop: scale(spacing.md),
        borderColor: colors.error,
    },
    errorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.md),
    },
    regenerateButton: {
        marginTop: scale(spacing.lg),
    },
});
