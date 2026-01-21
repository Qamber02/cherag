/**
 * Forgot Password Screen
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../../src/lib/supabase';
import { Button, Input, H1, Body } from '../../src/components/ui';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const handleReset = async () => {
        if (!email.trim()) {
            setError('Please enter your email');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { error: resetError } = await resetPassword(email.trim());

            if (resetError) {
                setError(resetError.message);
                return;
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setIsLoading(false);
        }
    };

    const containerMaxWidth = isTablet() ? 500 : SCREEN_WIDTH;

    if (success) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.successContainer, { maxWidth: containerMaxWidth }]}>
                    <View style={[styles.successIcon, { backgroundColor: colors.primary[600] + '20' }]}>
                        <Ionicons name="mail" size={scale(60)} color={colors.primary[500]} />
                    </View>
                    <H1 isDark={isDark} align="center" style={styles.successTitle}>
                        Check Your Email
                    </H1>
                    <Body isDark={isDark} color={theme.textSecondary} align="center">
                        We've sent password reset instructions to {email}
                    </Body>
                    <Button
                        title="Back to Login"
                        onPress={() => router.replace('/(auth)/login')}
                        fullWidth
                        size="lg"
                        style={styles.successButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={[styles.content, { maxWidth: containerMaxWidth }]}>
                    {/* Back button */}
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={scale(24)} color={theme.textPrimary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <H1 isDark={isDark}>Reset Password</H1>
                        <Body isDark={isDark} color={theme.textSecondary}>
                            Enter your email to receive reset instructions
                        </Body>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {error && (
                            <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
                                <Ionicons name="alert-circle" size={scale(20)} color={colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <Input
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            leftIcon="mail-outline"
                            isDark={isDark}
                        />

                        <Button
                            title="Send Reset Link"
                            onPress={handleReset}
                            loading={isLoading}
                            fullWidth
                            size="lg"
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: scale(spacing.xl),
        alignSelf: 'center',
        width: '100%',
    },
    backButton: {
        width: scale(40),
        height: scale(40),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(spacing.md),
    },
    header: {
        marginBottom: scale(spacing['2xl']),
    },
    form: {},
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(spacing.md),
        borderRadius: borderRadius.md,
        marginBottom: scale(spacing.lg),
        gap: scale(spacing.sm),
    },
    errorText: {
        color: colors.error,
        fontSize: fontScale(14),
        flex: 1,
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(spacing.xl),
        alignSelf: 'center',
        width: '100%',
    },
    successIcon: {
        width: scale(100),
        height: scale(100),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(spacing.xl),
    },
    successTitle: {
        marginBottom: scale(spacing.md),
    },
    successButton: {
        marginTop: scale(spacing['2xl']),
    },
});
