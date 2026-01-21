/**
 * Entry Point - Redirect based on auth state
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/styles/theme';

export default function Index() {
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated) {
                router.replace('/(main)');
            } else {
                router.replace('/(auth)/login');
            }
        }
    }, [isAuthenticated, isLoading]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.dark.background,
    },
});
