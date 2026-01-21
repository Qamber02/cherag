/**
 * DocumentItem Component
 * Document list item with file info and actions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { scale, fontScale } from '../styles/responsive';

interface DocumentItemProps {
    id: string;
    filename: string;
    fileType: string;
    createdAt: string;
    onPress?: () => void;
    onDelete?: () => void;
    isSelected?: boolean;
    isDark?: boolean;
}

const FILE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    pdf: 'document-text',
    docx: 'document',
    doc: 'document',
    txt: 'document-outline',
    md: 'logo-markdown',
    default: 'document-outline',
};

const FILE_COLORS: Record<string, string> = {
    pdf: '#ef4444',
    docx: '#3b82f6',
    doc: '#3b82f6',
    txt: '#6b7280',
    md: '#10b981',
    default: '#6b7280',
};

export const DocumentItem: React.FC<DocumentItemProps> = ({
    id,
    filename,
    fileType,
    createdAt,
    onPress,
    onDelete,
    isSelected = false,
    isDark = true,
}) => {
    const theme = isDark ? colors.dark : colors.light;

    const icon = FILE_ICONS[fileType] || FILE_ICONS.default;
    const iconColor = FILE_COLORS[fileType] || FILE_COLORS.default;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isSelected && styles.selected,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name={icon} size={scale(24)} color={iconColor} />
            </View>

            {/* Info */}
            <View style={styles.info}>
                <Text style={[styles.filename, { color: theme.textPrimary }]} numberOfLines={1}>
                    {filename}
                </Text>
                <View style={styles.metaRow}>
                    <Text style={[styles.meta, { color: theme.textMuted }]}>
                        {fileType.toUpperCase()}
                    </Text>
                    <Text style={[styles.metaDot, { color: theme.textMuted }]}>•</Text>
                    <Text style={[styles.meta, { color: theme.textMuted }]}>{formatDate(createdAt)}</Text>
                </View>
            </View>

            {/* Actions */}
            {onDelete && (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="trash-outline" size={scale(20)} color={colors.error} />
                </TouchableOpacity>
            )}

            {/* Selection indicator */}
            {isSelected && (
                <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={scale(24)} color={colors.primary[500]} />
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(spacing.md),
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: scale(spacing.sm),
    },

    selected: {
        borderColor: colors.primary[500],
        borderWidth: 2,
    },

    iconContainer: {
        width: scale(48),
        height: scale(48),
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(spacing.md),
    },

    info: {
        flex: 1,
    },

    filename: {
        fontSize: fontScale(typography.fontSize.base),
        fontWeight: typography.fontWeight.medium,
        marginBottom: scale(spacing.xs),
    },

    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    meta: {
        fontSize: fontScale(typography.fontSize.sm),
    },

    metaDot: {
        marginHorizontal: scale(spacing.xs),
    },

    deleteButton: {
        padding: scale(spacing.sm),
    },

    checkmark: {
        marginLeft: scale(spacing.sm),
    },
});

export default DocumentItem;
