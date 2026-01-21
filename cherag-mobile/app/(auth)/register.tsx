/**
 * Register Screen
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signUp } from '../../src/lib/supabase';
import { Button, Input, H1, Body, BodySmall } from '../../src/components/ui';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const handleRegister = async () => {
        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await signUp(email.trim(), password);

            if (authError) {
                setError(authError.message);
                return;
            }

            // Show success message
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const containerMaxWidth = isTablet() ? 500 : SCREEN_WIDTH;

    if (success) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={[styles.successContainer, { maxWidth: containerMaxWidth }]}>
                    <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="checkmark-circle" size={scale(60)} color={colors.success} />
                    </View>
                    <H1 isDark={isDark} align="center" style={styles.successTitle}>
                        Check Your Email
                    </H1>
                    <Body isDark={isDark} color={theme.textSecondary} align="center">
                        We've sent a confirmation link to {email}. Please verify your email to continue.
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
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { maxWidth: containerMaxWidth }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back button */}
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={scale(24)} color={theme.textPrimary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <H1 isDark={isDark}>Create Account</H1>
                        <Body isDark={isDark} color={theme.textSecondary}>
                            Start your learning journey today
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

                        <Input
                            label="Password"
                            placeholder="Create a password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="new-password"
                            leftIcon="lock-closed-outline"
                            isDark={isDark}
                        />

                        <Input
                            label="Confirm Password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoComplete="new-password"
                            leftIcon="lock-closed-outline"
                            isDark={isDark}
                        />

                        <Button
                            title="Create Account"
                            onPress={handleRegister}
                            loading={isLoading}
                            fullWidth
                            size="lg"
                        />
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <BodySmall isDark={isDark}>Already have an account? </BodySmall>
                        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                            <BodySmall color={colors.primary[400]} style={styles.link}>
                                Sign In
                            </BodySmall>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    scrollContent: {
        flexGrow: 1,
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
    form: {
        marginBottom: scale(spacing.xl),
    },
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 'auto',
        paddingBottom: scale(spacing.lg),
    },
    link: {
        fontWeight: '600',
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
