/**
 * Input Component
 * Text input with label, error state, and icons
 */

import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';
import { scale, fontScale } from '../../styles/responsive';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    isDark?: boolean;
    containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    isDark = true,
    containerStyle,
    secureTextEntry,
    style,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const theme = isDark ? colors.dark : colors.light;

    const inputContainerStyles: ViewStyle[] = [
        styles.inputContainer,
        { backgroundColor: theme.surfaceLight, borderColor: theme.border },
        isFocused && styles.focused,
        error && styles.error,
    ];

    const isPassword = secureTextEntry !== undefined;
    const showPassword = isPassword && !isPasswordVisible;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}

            <View style={inputContainerStyles}>
                {leftIcon && (
                    <Ionicons
                        name={leftIcon}
                        size={scale(20)}
                        color={theme.textMuted}
                        style={styles.leftIcon}
                    />
                )}

                <TextInput
                    style={[
                        styles.input,
                        { color: theme.textPrimary },
                        leftIcon && styles.inputWithLeftIcon,
                        (rightIcon || isPassword) && styles.inputWithRightIcon,
                        style,
                    ]}
                    placeholderTextColor={theme.textMuted}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={showPassword}
                    {...props}
                />

                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={styles.rightIcon}
                    >
                        <Ionicons
                            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={scale(20)}
                            color={theme.textMuted}
                        />
                    </TouchableOpacity>
                )}

                {rightIcon && !isPassword && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        style={styles.rightIcon}
                        disabled={!onRightIconPress}
                    >
                        <Ionicons name={rightIcon} size={scale(20)} color={theme.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: scale(spacing.md),
    },

    label: {
        fontSize: fontScale(typography.fontSize.sm),
        fontWeight: typography.fontWeight.medium,
        marginBottom: scale(spacing.xs),
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        minHeight: scale(48),
    },

    input: {
        flex: 1,
        fontSize: fontScale(typography.fontSize.base),
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.md),
    },

    inputWithLeftIcon: {
        paddingLeft: scale(spacing.xs),
    },

    inputWithRightIcon: {
        paddingRight: scale(spacing.xs),
    },

    leftIcon: {
        marginLeft: scale(spacing.md),
    },

    rightIcon: {
        padding: scale(spacing.md),
    },

    focused: {
        borderColor: colors.primary[500],
        borderWidth: 2,
    },

    error: {
        borderColor: colors.error,
    },

    errorText: {
        color: colors.error,
        fontSize: fontScale(typography.fontSize.sm),
        marginTop: scale(spacing.xs),
    },
});

export default Input;
