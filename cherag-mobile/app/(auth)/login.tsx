/**
 * Login Screen
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
    Image,
    useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '../../src/lib/supabase';
import { Button, Input, H1, Body, BodySmall } from '../../src/components/ui';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter email and password');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await signIn(email.trim(), password);

            if (authError) {
                setError(authError.message);
                return;
            }

            if (data.session) {
                router.replace('/(main)');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const containerMaxWidth = isTablet() ? 500 : SCREEN_WIDTH;

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
                    {/* Logo & Header */}
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, { backgroundColor: colors.primary[600] }]}>
                            <Ionicons name="sparkles" size={scale(40)} color="#ffffff" />
                        </View>
                        <H1 isDark={isDark} align="center" style={styles.title}>
                            Welcome to Cherág
                        </H1>
                        <Body isDark={isDark} color={theme.textSecondary} align="center">
                            Your AI-powered study partner
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
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="password"
                            leftIcon="lock-closed-outline"
                            isDark={isDark}
                        />

                        <TouchableOpacity
                            onPress={() => router.push('/(auth)/forgot-password')}
                            style={styles.forgotPassword}
                        >
                            <BodySmall color={colors.primary[400]}>Forgot Password?</BodySmall>
                        </TouchableOpacity>

                        <Button
                            title="Sign In"
                            onPress={handleLogin}
                            loading={isLoading}
                            fullWidth
                            size="lg"
                        />
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <BodySmall isDark={isDark}>Don't have an account? </BodySmall>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <BodySmall color={colors.primary[400]} style={styles.link}>
                                Sign Up
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
    header: {
        alignItems: 'center',
        marginTop: scale(spacing['3xl']),
        marginBottom: scale(spacing['2xl']),
    },
    logoContainer: {
        width: scale(80),
        height: scale(80),
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(spacing.lg),
    },
    title: {
        marginBottom: scale(spacing.sm),
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: scale(spacing.lg),
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
});
