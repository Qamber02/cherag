/**
 * Common Styles
 * Reusable style patterns used across the app
 */

import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows, typography } from './theme';
import { scale, moderateScale, fontScale, isTablet, responsive } from './responsive';

// Theme-aware styles factory
export const createThemedStyles = (isDark: boolean) => {
    const theme = isDark ? colors.dark : colors.light;

    return StyleSheet.create({
        // Containers
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },

        safeArea: {
            flex: 1,
            backgroundColor: theme.background,
        },

        screenPadding: {
            paddingHorizontal: scale(spacing.lg),
            paddingVertical: scale(spacing.md),
        },

        // Cards
        card: {
            backgroundColor: theme.surface,
            borderRadius: borderRadius.lg,
            padding: scale(spacing.lg),
            ...shadows.md,
        },

        cardOutline: {
            backgroundColor: 'transparent',
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: theme.border,
            padding: scale(spacing.lg),
        },

        // Flex utilities
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },

        rowBetween: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },

        rowCenter: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },

        center: {
            alignItems: 'center',
            justifyContent: 'center',
        },

        flexGrow: {
            flexGrow: 1,
        },

        // Typography
        h1: {
            fontSize: fontScale(typography.fontSize['4xl']),
            fontWeight: typography.fontWeight.bold,
            color: theme.textPrimary,
            lineHeight: fontScale(typography.fontSize['4xl']) * typography.lineHeight.tight,
        },

        h2: {
            fontSize: fontScale(typography.fontSize['3xl']),
            fontWeight: typography.fontWeight.bold,
            color: theme.textPrimary,
            lineHeight: fontScale(typography.fontSize['3xl']) * typography.lineHeight.tight,
        },

        h3: {
            fontSize: fontScale(typography.fontSize['2xl']),
            fontWeight: typography.fontWeight.semibold,
            color: theme.textPrimary,
            lineHeight: fontScale(typography.fontSize['2xl']) * typography.lineHeight.tight,
        },

        h4: {
            fontSize: fontScale(typography.fontSize.xl),
            fontWeight: typography.fontWeight.semibold,
            color: theme.textPrimary,
        },

        bodyLarge: {
            fontSize: fontScale(typography.fontSize.lg),
            fontWeight: typography.fontWeight.normal,
            color: theme.textPrimary,
            lineHeight: fontScale(typography.fontSize.lg) * typography.lineHeight.normal,
        },

        body: {
            fontSize: fontScale(typography.fontSize.base),
            fontWeight: typography.fontWeight.normal,
            color: theme.textPrimary,
            lineHeight: fontScale(typography.fontSize.base) * typography.lineHeight.normal,
        },

        bodySmall: {
            fontSize: fontScale(typography.fontSize.sm),
            fontWeight: typography.fontWeight.normal,
            color: theme.textSecondary,
            lineHeight: fontScale(typography.fontSize.sm) * typography.lineHeight.normal,
        },

        caption: {
            fontSize: fontScale(typography.fontSize.xs),
            fontWeight: typography.fontWeight.normal,
            color: theme.textMuted,
        },

        label: {
            fontSize: fontScale(typography.fontSize.sm),
            fontWeight: typography.fontWeight.medium,
            color: theme.textSecondary,
            marginBottom: spacing.xs,
        },

        // Input styles
        input: {
            backgroundColor: theme.surfaceLight,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: scale(spacing.lg),
            paddingVertical: scale(spacing.md),
            fontSize: fontScale(typography.fontSize.base),
            color: theme.textPrimary,
        },

        inputFocused: {
            borderColor: colors.primary[500],
        },

        inputError: {
            borderColor: colors.error,
        },

        // Divider
        divider: {
            height: 1,
            backgroundColor: theme.border,
            marginVertical: scale(spacing.md),
        },

        // Badge
        badge: {
            backgroundColor: colors.primary[500],
            borderRadius: borderRadius.full,
            paddingHorizontal: scale(spacing.sm),
            paddingVertical: scale(spacing.xs),
        },

        badgeText: {
            color: '#fff',
            fontSize: fontScale(typography.fontSize.xs),
            fontWeight: typography.fontWeight.semibold,
        },

        // Empty state
        emptyState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: scale(spacing['2xl']),
        },

        emptyStateText: {
            fontSize: fontScale(typography.fontSize.lg),
            color: theme.textMuted,
            textAlign: 'center',
            marginTop: scale(spacing.lg),
        },

        // Tablet-specific
        tabletContainer: {
            maxWidth: isTablet() ? 800 : undefined,
            alignSelf: 'center',
            width: '100%',
        },

        // Grid for tablets
        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -scale(spacing.sm),
        },

        gridItem: {
            paddingHorizontal: scale(spacing.sm),
            marginBottom: scale(spacing.md),
        },
    });
};

// Static common styles (theme-independent)
export const commonStyles = StyleSheet.create({
    absoluteFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    shadow: shadows.md,
    shadowLg: shadows.lg,

    roundedFull: {
        borderRadius: borderRadius.full,
    },

    overflowHidden: {
        overflow: 'hidden',
    },
});

// Gradient backgrounds (for use with expo-linear-gradient)
export const gradients = {
    primary: [colors.primary[600], colors.primary[400]],
    accent: [colors.accent[600], colors.accent[400]],
    dark: [colors.dark.background, colors.dark.surface],
    success: ['#059669', '#10b981'],
    error: ['#dc2626', '#ef4444'],
    purple: ['#7c3aed', '#a78bfa'],
    pink: ['#db2777', '#f472b6'],
};
