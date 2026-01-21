/**
 * VideoCard Component
 * YouTube video thumbnail card with title and channel
 */

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { scale, fontScale, isTablet, getCardWidth } from '../styles/responsive';

interface VideoCardProps {
    id: string;
    title: string;
    thumbnail: string;
    channel?: string;
    relevanceScore?: number;
    onPress: () => void;
    isDark?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({
    id,
    title,
    thumbnail,
    channel,
    relevanceScore,
    onPress,
    isDark = true,
}) => {
    const theme = isDark ? colors.dark : colors.light;

    // Calculate card width for tablet grid
    const columns = isTablet() ? 2 : 1;
    const cardWidth = isTablet() ? getCardWidth(columns, scale(spacing.lg)) : '100%';

    return (
        <TouchableOpacity
            style={[styles.container, { width: cardWidth, backgroundColor: theme.surface }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Thumbnail */}
            <View style={styles.thumbnailContainer}>
                <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />
                <View style={styles.playOverlay}>
                    <View style={styles.playButton}>
                        <Ionicons name="play" size={scale(24)} color="#ffffff" />
                    </View>
                </View>
                {/* Relevance badge */}
                {relevanceScore && relevanceScore > 70 && (
                    <View style={styles.relevanceBadge}>
                        <Ionicons name="checkmark-circle" size={scale(14)} color="#ffffff" />
                        <Text style={styles.relevanceText}>{relevanceScore}%</Text>
                    </View>
                )}
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={2}>
                    {title}
                </Text>
                {channel && (
                    <View style={styles.channelRow}>
                        <Ionicons name="person-circle-outline" size={scale(14)} color={theme.textMuted} />
                        <Text style={[styles.channel, { color: theme.textMuted }]} numberOfLines={1}>
                            {channel}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: scale(spacing.md),
        ...shadows.md,
    },

    thumbnailContainer: {
        aspectRatio: 16 / 9,
        backgroundColor: colors.dark.surfaceLight,
        position: 'relative',
    },

    thumbnail: {
        width: '100%',
        height: '100%',
    },

    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    playButton: {
        width: scale(48),
        height: scale(48),
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary[600],
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.lg,
    },

    relevanceBadge: {
        position: 'absolute',
        top: scale(spacing.sm),
        right: scale(spacing.sm),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: scale(spacing.sm),
        paddingVertical: scale(spacing.xs),
        borderRadius: borderRadius.full,
        gap: scale(4),
    },

    relevanceText: {
        color: '#ffffff',
        fontSize: fontScale(typography.fontSize.xs),
        fontWeight: typography.fontWeight.semibold,
    },

    info: {
        padding: scale(spacing.md),
    },

    title: {
        fontSize: fontScale(typography.fontSize.base),
        fontWeight: typography.fontWeight.medium,
        lineHeight: fontScale(typography.fontSize.base) * 1.3,
        marginBottom: scale(spacing.xs),
    },

    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.xs),
    },

    channel: {
        fontSize: fontScale(typography.fontSize.sm),
        flex: 1,
    },
});

export default VideoCard;
