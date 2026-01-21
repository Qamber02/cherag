/**
 * Button Component
 * Customizable button with variants, sizes, and loading state
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    TouchableOpacityProps,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { scale, fontScale, moderateScale } from '../../styles/responsive';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    style,
    ...props
}) => {
    const isDisabled = disabled || loading;

    const containerStyles: ViewStyle[] = [
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style as ViewStyle,
    ];

    const textStyles: TextStyle[] = [
        styles.text,
        styles[`text_${variant}`],
        styles[`textSize_${size}`],
    ];

    return (
        <TouchableOpacity
            style={containerStyles}
            disabled={isDisabled}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'primary' ? '#fff' : colors.primary[500]}
                />
            ) : (
                <>
                    {icon && iconPosition === 'left' && icon}
                    <Text style={textStyles}>{title}</Text>
                    {icon && iconPosition === 'right' && icon}
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(spacing.sm),
        borderRadius: borderRadius.md,
    },

    fullWidth: {
        width: '100%',
    },

    disabled: {
        opacity: 0.5,
    },

    // Variants
    variant_primary: {
        backgroundColor: colors.primary[600],
    },
    variant_secondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary[500],
    },
    variant_ghost: {
        backgroundColor: 'transparent',
    },
    variant_danger: {
        backgroundColor: colors.error,
    },
    variant_success: {
        backgroundColor: colors.success,
    },

    // Sizes
    size_sm: {
        paddingVertical: scale(spacing.sm),
        paddingHorizontal: scale(spacing.md),
    },
    size_md: {
        paddingVertical: scale(spacing.md),
        paddingHorizontal: scale(spacing.lg),
    },
    size_lg: {
        paddingVertical: scale(spacing.lg),
        paddingHorizontal: scale(spacing.xl),
    },

    // Text
    text: {
        fontWeight: typography.fontWeight.semibold,
        textAlign: 'center',
    },
    text_primary: {
        color: '#ffffff',
    },
    text_secondary: {
        color: colors.primary[500],
    },
    text_ghost: {
        color: colors.primary[500],
    },
    text_danger: {
        color: '#ffffff',
    },
    text_success: {
        color: '#ffffff',
    },

    // Text sizes
    textSize_sm: {
        fontSize: fontScale(typography.fontSize.sm),
    },
    textSize_md: {
        fontSize: fontScale(typography.fontSize.base),
    },
    textSize_lg: {
        fontSize: fontScale(typography.fontSize.lg),
    },
});

export default Button;
