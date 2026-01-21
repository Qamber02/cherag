/**
 * Mind Map / Learning Roadmap Screen
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
    Modal,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useFiles } from '../../src/hooks';
import { generateMindMap, getTopicExplanation } from '../../src/lib/aiService';
import { Button, H3, Body, BodySmall, Card, LoadingSpinner } from '../../src/components';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';

interface RoadmapNode {
    title: string;
    description?: string;
    children?: RoadmapNode[];
}

interface NodeItemProps {
    node: RoadmapNode;
    level: number;
    isDark: boolean;
    onPress: (node: RoadmapNode) => void;
}

const NodeItem: React.FC<NodeItemProps> = ({ node, level, isDark, onPress }) => {
    const [expanded, setExpanded] = useState(true);
    const theme = isDark ? colors.dark : colors.light;
    const hasChildren = node.children && node.children.length > 0;

    const levelColors = [colors.primary[500], colors.accent[500], '#8b5cf6', colors.success];
    const color = levelColors[level % levelColors.length];

    return (
        <View style={styles.nodeContainer}>
            <TouchableOpacity
                style={[styles.nodeItem, { marginLeft: scale(level * 20) }]}
                onPress={() => onPress(node)}
                activeOpacity={0.7}
            >
                {hasChildren && (
                    <TouchableOpacity
                        onPress={() => setExpanded(!expanded)}
                        style={styles.expandButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={expanded ? 'chevron-down' : 'chevron-forward'}
                            size={scale(16)}
                            color={theme.textMuted}
                        />
                    </TouchableOpacity>
                )}
                <View style={[styles.nodeDot, { backgroundColor: color }]} />
                <View style={styles.nodeContent}>
                    <Body isDark={isDark} style={styles.nodeTitle}>{node.title}</Body>
                    {node.description && (
                        <BodySmall isDark={isDark} color={theme.textMuted} numberOfLines={2}>
                            {node.description}
                        </BodySmall>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={theme.textMuted} />
            </TouchableOpacity>

            {expanded && hasChildren && (
                <View style={styles.childrenContainer}>
                    {node.children!.map((child, index) => (
                        <NodeItem
                            key={`${child.title}-${index}`}
                            node={child}
                            level={level + 1}
                            isDark={isDark}
                            onPress={onPress}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

export default function MindMapScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const { user } = useAuth();
    const { getContext, hasContext, uploadFile, isParsing } = useFiles(user?.id);

    const [roadmap, setRoadmap] = useState<RoadmapNode | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
    const [explanation, setExplanation] = useState<string>('');
    const [isExplaining, setIsExplaining] = useState(false);

    const handleGenerate = async () => {
        const context = getContext();
        if (!context || context.length < 50) {
            setError('Please upload a document with more content.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await generateMindMap(context);
            setRoadmap(result);
        } catch (err: any) {
            setError(err.message || 'Failed to generate roadmap');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNodePress = async (node: RoadmapNode) => {
        setSelectedNode(node);
        setExplanation('');
        setIsExplaining(true);

        try {
            const result = await getTopicExplanation(node.title, node.description);
            setExplanation(result);
        } catch (err: any) {
            setExplanation('Failed to get explanation. Please try again.');
        } finally {
            setIsExplaining(false);
        }
    };

    const containerMaxWidth = isTablet() ? 700 : SCREEN_WIDTH;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scale(24)} color={theme.textPrimary} />
                </TouchableOpacity>
                <H3 isDark={isDark}>Learning Roadmap</H3>
                {roadmap && (
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: theme.surfaceLight }]}
                        onPress={() => setRoadmap(null)}
                    >
                        <Ionicons name="trash-outline" size={scale(20)} color={colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { maxWidth: containerMaxWidth }]}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <LoadingSpinner fullScreen message="Generating roadmap..." isDark={isDark} />
                ) : !hasContext ? (
                    <Card isDark={isDark}>
                        <View style={styles.emptyState}>
                            <Ionicons name="map-outline" size={scale(48)} color={theme.textMuted} />
                            <Body isDark={isDark} color={theme.textMuted} align="center" style={styles.emptyText}>
                                Upload a document to generate a learning roadmap
                            </Body>
                            <Button
                                title="Upload Document"
                                onPress={uploadFile}
                                loading={isParsing}
                                icon={<Ionicons name="cloud-upload" size={scale(18)} color="#fff" />}
                            />
                        </View>
                    </Card>
                ) : !roadmap ? (
                    <Card isDark={isDark}>
                        <View style={styles.emptyState}>
                            <Ionicons name="sparkles" size={scale(48)} color={colors.primary[500]} />
                            <Body isDark={isDark} align="center" style={styles.emptyText}>
                                Create a visual learning path from your document
                            </Body>
                            <Button
                                title="Generate Roadmap"
                                onPress={handleGenerate}
                                icon={<Ionicons name="sparkles" size={scale(18)} color="#fff" />}
                            />
                        </View>
                    </Card>
                ) : (
                    <View style={styles.roadmapContainer}>
                        <NodeItem
                            node={roadmap}
                            level={0}
                            isDark={isDark}
                            onPress={handleNodePress}
                        />

                        <Button
                            title="Regenerate"
                            variant="secondary"
                            onPress={handleGenerate}
                            fullWidth
                            icon={<Ionicons name="refresh" size={scale(18)} color={colors.primary[500]} />}
                            style={styles.regenerateButton}
                        />
                    </View>
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
            </ScrollView>

            {/* Explanation Modal */}
            <Modal
                visible={selectedNode !== null}
                animationType="slide"
                transparent
                onRequestClose={() => setSelectedNode(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.surface, maxWidth: containerMaxWidth }]}>
                        <View style={styles.modalHeader}>
                            <H3 isDark={isDark} numberOfLines={2}>{selectedNode?.title}</H3>
                            <TouchableOpacity onPress={() => setSelectedNode(null)} style={styles.closeButton}>
                                <Ionicons name="close" size={scale(24)} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {isExplaining ? (
                                <LoadingSpinner message="Getting explanation..." isDark={isDark} />
                            ) : (
                                <Body isDark={isDark}>{explanation}</Body>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    emptyState: {
        alignItems: 'center',
        paddingVertical: scale(spacing.xl),
    },
    emptyText: {
        marginVertical: scale(spacing.lg),
    },
    roadmapContainer: {},
    nodeContainer: {
        marginBottom: scale(spacing.xs),
    },
    nodeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(spacing.md),
        paddingHorizontal: scale(spacing.sm),
    },
    expandButton: {
        padding: scale(spacing.xs),
        marginRight: scale(spacing.xs),
    },
    nodeDot: {
        width: scale(12),
        height: scale(12),
        borderRadius: borderRadius.full,
        marginRight: scale(spacing.md),
    },
    nodeContent: {
        flex: 1,
    },
    nodeTitle: {
        fontWeight: '500',
    },
    childrenContainer: {
        borderLeftWidth: 2,
        borderLeftColor: colors.dark.border,
        marginLeft: scale(22),
    },
    regenerateButton: {
        marginTop: scale(spacing.xl),
    },
    errorCard: {
        marginTop: scale(spacing.md),
        borderColor: colors.error,
    },
    errorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.md),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: scale(spacing.xl),
        maxHeight: '70%',
        width: '100%',
        alignSelf: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: scale(spacing.lg),
    },
    closeButton: {
        padding: scale(spacing.xs),
    },
    modalScroll: {
        maxHeight: scale(400),
    },
});
