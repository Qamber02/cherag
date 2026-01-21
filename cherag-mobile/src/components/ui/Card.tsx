/**
 * Card Component
 * Container with consistent styling, shadows, and variants
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';
import { scale } from '../../styles/responsive';

type CardVariant = 'elevated' | 'outlined' | 'filled';

interface CardProps extends ViewProps {
    variant?: CardVariant;
    padding?: keyof typeof spacing;
    isDark?: boolean;
    children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
    variant = 'elevated',
    padding = 'lg',
    isDark = true,
    style,
    children,
    ...props
}) => {
    const theme = isDark ? colors.dark : colors.light;

    const cardStyles: ViewStyle[] = [
        styles.base,
        { padding: scale(spacing[padding]) },
        variant === 'elevated' && [styles.elevated, { backgroundColor: theme.surface }],
        variant === 'outlined' && [styles.outlined, { borderColor: theme.border }],
        variant === 'filled' && { backgroundColor: theme.surfaceLight },
        style as ViewStyle,
    ];

    return (
        <View style={cardStyles} {...props}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    base: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    elevated: {
        ...shadows.md,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
});

export default Card;
