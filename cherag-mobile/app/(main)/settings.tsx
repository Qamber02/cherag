/**
 * Settings Screen
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks';
import { storage, cacheStorage } from '../../src/lib/storage';
import { H3, Body, BodySmall, Card } from '../../src/components';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';

interface SettingItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    isDark: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    iconColor,
    title,
    subtitle,
    onPress,
    rightElement,
    isDark,
}) => {
    const theme = isDark ? colors.dark : colors.light;

    return (
        <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={onPress}
            disabled={!onPress && !rightElement}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={[styles.settingIcon, { backgroundColor: (iconColor || colors.primary[500]) + '20' }]}>
                <Ionicons name={icon} size={scale(20)} color={iconColor || colors.primary[500]} />
            </View>
            <View style={styles.settingContent}>
                <Body isDark={isDark}>{title}</Body>
                {subtitle && <BodySmall isDark={isDark} color={theme.textMuted}>{subtitle}</BodySmall>}
            </View>
            {rightElement || (onPress && (
                <Ionicons name="chevron-forward" size={scale(20)} color={theme.textMuted} />
            ))}
        </TouchableOpacity>
    );
};

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const { user, signOut } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(isDark);

    const handleClearCache = () => {
        Alert.alert(
            'Clear Cache',
            'This will clear all cached AI responses. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await cacheStorage.clear();
                        Alert.alert('Done', 'Cache cleared successfully');
                    },
                },
            ]
        );
    };

    const handleClearData = () => {
        Alert.alert(
            'Clear All Data',
            'This will delete all your local data including preferences. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await storage.clear();
                        Alert.alert('Done', 'All local data cleared');
                    },
                },
            ]
        );
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    };

    const containerMaxWidth = isTablet() ? 600 : SCREEN_WIDTH;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scale(24)} color={theme.textPrimary} />
                </TouchableOpacity>
                <H3 isDark={isDark}>Settings</H3>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { maxWidth: containerMaxWidth }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Account Section */}
                <View style={styles.section}>
                    <BodySmall isDark={isDark} color={theme.textMuted} style={styles.sectionTitle}>
                        ACCOUNT
                    </BodySmall>
                    <Card isDark={isDark} padding="sm">
                        <SettingItem
                            icon="person-outline"
                            title="Email"
                            subtitle={user?.email || 'Not signed in'}
                            isDark={isDark}
                        />
                    </Card>
                </View>

                {/* Appearance Section */}
                <View style={styles.section}>
                    <BodySmall isDark={isDark} color={theme.textMuted} style={styles.sectionTitle}>
                        APPEARANCE
                    </BodySmall>
                    <Card isDark={isDark} padding="sm">
                        <SettingItem
                            icon="moon-outline"
                            iconColor="#8b5cf6"
                            title="Dark Mode"
                            subtitle="Use dark theme"
                            isDark={isDark}
                            rightElement={
                                <Switch
                                    value={isDarkMode}
                                    onValueChange={setIsDarkMode}
                                    trackColor={{ false: theme.border, true: colors.primary[600] }}
                                    thumbColor={isDarkMode ? colors.primary[400] : '#f4f3f4'}
                                />
                            }
                        />
                    </Card>
                </View>

                {/* Data Section */}
                <View style={styles.section}>
                    <BodySmall isDark={isDark} color={theme.textMuted} style={styles.sectionTitle}>
                        DATA
                    </BodySmall>
                    <Card isDark={isDark} padding="sm">
                        <SettingItem
                            icon="trash-outline"
                            iconColor={colors.warning}
                            title="Clear Cache"
                            subtitle="Remove cached AI responses"
                            onPress={handleClearCache}
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="warning-outline"
                            iconColor={colors.error}
                            title="Clear All Data"
                            subtitle="Delete all local data"
                            onPress={handleClearData}
                            isDark={isDark}
                        />
                    </Card>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <BodySmall isDark={isDark} color={theme.textMuted} style={styles.sectionTitle}>
                        ABOUT
                    </BodySmall>
                    <Card isDark={isDark} padding="sm">
                        <SettingItem
                            icon="information-circle-outline"
                            title="Version"
                            subtitle="1.0.0"
                            isDark={isDark}
                        />
                        <SettingItem
                            icon="sparkles"
                            iconColor={colors.accent[500]}
                            title="Cherág"
                            subtitle="AI Study Partner"
                            isDark={isDark}
                        />
                    </Card>
                </View>

                {/* Sign Out */}
                <View style={styles.section}>
                    <Card isDark={isDark} padding="sm">
                        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                            <Ionicons name="log-out-outline" size={scale(20)} color={colors.error} />
                            <Body color={colors.error}>Sign Out</Body>
                        </TouchableOpacity>
                    </Card>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.md),
        borderBottomWidth: 1,
    },
    backButton: {
        padding: scale(spacing.sm),
        marginLeft: -scale(spacing.sm),
    },
    placeholder: {
        width: scale(40),
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: scale(spacing.lg),
        alignSelf: 'center',
        width: '100%',
    },
    section: {
        marginBottom: scale(spacing.xl),
    },
    sectionTitle: {
        marginBottom: scale(spacing.sm),
        marginLeft: scale(spacing.xs),
        fontSize: fontScale(12),
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(spacing.md),
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    settingIcon: {
        width: scale(36),
        height: scale(36),
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(spacing.md),
    },
    settingContent: {
        flex: 1,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(spacing.md),
        gap: scale(spacing.sm),
    },
});
