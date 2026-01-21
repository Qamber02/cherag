/**
 * Typography Components
 * Consistent text styling across the app
 */

import React from 'react';
import { Text, StyleSheet, TextProps, TextStyle } from 'react-native';
import { colors, typography } from '../../styles/theme';
import { fontScale } from '../../styles/responsive';

interface TypographyProps extends TextProps {
    isDark?: boolean;
    color?: string;
    align?: 'left' | 'center' | 'right';
}

// Heading 1
export const H1: React.FC<TypographyProps> = ({
    isDark = true,
    color,
    align = 'left',
    style,
    children,
    ...props
}) => {
    const theme = isDark ? colors.dark : colors.light;
    return (
        <Text
            style={[styles.h1, { color: color || theme.textPrimary, textAlign: align }, style]}
            {...props}
        >
            {children}
        </Text>
    );
};

// Heading 2
export const H2: React.FC<TypographyProps> = ({
    isDark = true,
    color,
    align = 'left',
    style,
    children,
    ...props
}) => {
    const theme = isDark ? colors.dark : colors.light;
    return (
        <Text
            style={[styles.h2, { color: color || theme.textPrimary, textAlign: align }, style]}
            {...props}
        >
            {children}
        </Text>
    );
};

// Heading 3
export const H3: React.FC<TypographyProps> = ({
    isDark = true,
    color,
    align = 'left',
    style,
    children,
    ...props
}) => {
    const theme = isDark ? colors.dark : colors.light;
    return (
        <Text
            style={[styles.h3, { color: color || theme.textPrimary, textAlign: align }, style]}
            {...props}
        >
            {children}
        </Text>
    );
};

// Body text
export const Body: React.FC<TypographyProps> = ({
    isDark = true,
    color,
    align = 'left',
    style,
    children,
    ...props
}) => {
    const theme = isDark ? colors.dark : colors.light;
    return (
        <Text
            style={[styles.body, { color: color || theme.textPrimary, textAlign: align }, style]}
            {...props}
        >
            {children}
        </Text>
    );
};

// Small body text
export const BodySmall: React.FC<TypographyProps> = ({
    isDark = true,
    color,
    align = 'left',
    style,
    children,
    ...props
}) => {
    const theme = isDark ? colors.dark : colors.light;
    return (
        <Text
            style={[styles.bodySmall, { color: color || theme.textSecondary, textAlign: align }, style]}
            {...props}
        >
            {children}
        </Text>
    );
};

// Caption text
export const Caption: React.FC<TypographyProps> = ({
    isDark = true,
    color,
    align = 'left',
    style,
    children,
    ...props
}) => {
    const theme = isDark ? colors.dark : colors.light;
    return (
        <Text
            style={[styles.caption, { color: color || theme.textMuted, textAlign: align }, style]}
            {...props}
        >
            {children}
        </Text>
    );
};

// Label text
export const Label: React.FC<TypographyProps> = ({
    isDark = true,
    color,
    align = 'left',
    style,
    children,
    ...props
}) => {
    const theme = isDark ? colors.dark : colors.light;
    return (
        <Text
            style={[styles.label, { color: color || theme.textSecondary, textAlign: align }, style]}
            {...props}
        >
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    h1: {
        fontSize: fontScale(typography.fontSize['4xl']),
        fontWeight: typography.fontWeight.bold,
        lineHeight: fontScale(typography.fontSize['4xl']) * typography.lineHeight.tight,
    },
    h2: {
        fontSize: fontScale(typography.fontSize['3xl']),
        fontWeight: typography.fontWeight.bold,
        lineHeight: fontScale(typography.fontSize['3xl']) * typography.lineHeight.tight,
    },
    h3: {
        fontSize: fontScale(typography.fontSize['2xl']),
        fontWeight: typography.fontWeight.semibold,
        lineHeight: fontScale(typography.fontSize['2xl']) * typography.lineHeight.tight,
    },
    body: {
        fontSize: fontScale(typography.fontSize.base),
        fontWeight: typography.fontWeight.normal,
        lineHeight: fontScale(typography.fontSize.base) * typography.lineHeight.normal,
    },
    bodySmall: {
        fontSize: fontScale(typography.fontSize.sm),
        fontWeight: typography.fontWeight.normal,
        lineHeight: fontScale(typography.fontSize.sm) * typography.lineHeight.normal,
    },
    caption: {
        fontSize: fontScale(typography.fontSize.xs),
        fontWeight: typography.fontWeight.normal,
    },
    label: {
        fontSize: fontScale(typography.fontSize.sm),
        fontWeight: typography.fontWeight.medium,
    },
});
