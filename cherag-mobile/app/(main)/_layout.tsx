/**
 * Main App Layout
 * Bottom tab navigation for authenticated users
 */

import { Tabs } from 'expo-router';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../src/styles/theme';
import { scale, isTablet } from '../../src/styles/responsive';

export default function MainLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                    height: scale(60) + (isTablet() ? 10 : 0),
                    paddingBottom: scale(spacing.sm),
                    paddingTop: scale(spacing.xs),
                },
                tabBarActiveTintColor: colors.primary[500],
                tabBarInactiveTintColor: theme.textMuted,
                tabBarLabelStyle: {
                    fontSize: scale(11),
                    fontWeight: '500',
                },
            }}
        >
            {/* Main tabs */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={scale(size)} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubbles" size={scale(size)} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="summary"
                options={{
                    title: 'Summary',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text" size={scale(size)} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="flashcards"
                options={{
                    title: 'Cards',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="layers" size={scale(size)} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="quizzes"
                options={{
                    title: 'Quiz',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="help-circle" size={scale(size)} color={color} />
                    ),
                }}
            />

            {/* Hidden tabs (accessible via navigation) */}
            <Tabs.Screen
                name="mindmap"
                options={{
                    href: null, // Hide from tab bar
                }}
            />
            <Tabs.Screen
                name="videos"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
