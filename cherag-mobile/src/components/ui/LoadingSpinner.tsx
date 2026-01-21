/**
 * LoadingSpinner Component
 * Centered loading indicator with optional message
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/theme';
import { scale, fontScale } from '../../styles/responsive';

interface LoadingSpinnerProps {
    size?: 'small' | 'large';
    color?: string;
    message?: string;
    fullScreen?: boolean;
    isDark?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'large',
    color,
    message,
    fullScreen = false,
    isDark = true,
}) => {
    const theme = isDark ? colors.dark : colors.light;
    const spinnerColor = color || colors.primary[500];

    return (
        <View style={[styles.container, fullScreen && styles.fullScreen]}>
            <ActivityIndicator size={size} color={spinnerColor} />
            {message && (
                <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(spacing.xl),
    },

    fullScreen: {
        flex: 1,
    },

    message: {
        marginTop: scale(spacing.md),
        fontSize: fontScale(typography.fontSize.base),
        textAlign: 'center',
    },
});

export default LoadingSpinner;
