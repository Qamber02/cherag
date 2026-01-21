/**
 * Study Shorts / Videos Screen
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    Modal,
    Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { searchVideos } from '../../src/lib/aiService';
import { VideoCard, Button, H3, Body, LoadingSpinner } from '../../src/components';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, getGridColumns, SCREEN_WIDTH } from '../../src/styles/responsive';

interface Video {
    id: string;
    title: string;
    thumbnail: string;
    channel?: string;
}

export default function VideosScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const [searchQuery, setSearchQuery] = useState('');
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);

    // Video player modal
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        setError(null);
        setVideos([]);
        setNextPageToken(null);

        try {
            const result = await searchVideos(searchQuery.trim());
            setVideos(result.result);
            setNextPageToken(result.nextPageToken);
        } catch (err: any) {
            setError(err.message || 'Failed to search videos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!nextPageToken || isLoading) return;

        setIsLoading(true);

        try {
            const result = await searchVideos(searchQuery.trim(), nextPageToken);
            setVideos((prev) => [...prev, ...result.result]);
            setNextPageToken(result.nextPageToken);
        } catch (err: any) {
            console.error('Load more error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVideoPress = (video: Video) => {
        setSelectedVideo(video);
    };

    const handleOpenYouTube = () => {
        if (selectedVideo) {
            Linking.openURL(`https://www.youtube.com/watch?v=${selectedVideo.id}`);
        }
    };

    const columns = isTablet() ? 2 : 1;
    const containerMaxWidth = isTablet() ? 900 : SCREEN_WIDTH;

    const renderItem = useCallback(
        ({ item }: { item: Video }) => (
            <VideoCard
                id={item.id}
                title={item.title}
                thumbnail={item.thumbnail}
                channel={item.channel}
                onPress={() => handleVideoPress(item)}
                isDark={isDark}
            />
        ),
        [isDark]
    );

    const renderEmptyState = () => {
        if (isLoading) return null;

        return (
            <View style={styles.emptyState}>
                <Ionicons name="play-circle-outline" size={scale(64)} color={theme.textMuted} />
                <Body isDark={isDark} color={theme.textMuted} align="center" style={styles.emptyText}>
                    Search for a topic to find{'\n'}educational videos
                </Body>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={scale(24)} color={theme.textPrimary} />
                </TouchableOpacity>
                <H3 isDark={isDark}>Study Shorts</H3>
                <View style={styles.placeholder} />
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
                <View style={[styles.searchInput, { backgroundColor: theme.surfaceLight }]}>
                    <Ionicons name="search" size={scale(20)} color={theme.textMuted} />
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder="Search topics (e.g., React hooks, calculus)"
                        placeholderTextColor={theme.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={scale(20)} color={theme.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>
                <Button
                    title="Search"
                    onPress={handleSearch}
                    loading={isLoading && videos.length === 0}
                    size="sm"
                />
            </View>

            {/* Videos List */}
            <FlatList
                data={videos}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { maxWidth: containerMaxWidth },
                    videos.length === 0 && styles.emptyList,
                ]}
                numColumns={columns}
                key={columns} // Force re-render on column change
                columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={() =>
                    nextPageToken ? (
                        <Button
                            title="Load More"
                            variant="secondary"
                            onPress={handleLoadMore}
                            loading={isLoading}
                            fullWidth
                            style={styles.loadMoreButton}
                        />
                    ) : null
                }
                showsVerticalScrollIndicator={false}
            />

            {/* Error */}
            {error && (
                <View style={[styles.errorBanner, { backgroundColor: colors.error }]}>
                    <Ionicons name="alert-circle" size={scale(20)} color="#fff" />
                    <Body color="#fff">{error}</Body>
                </View>
            )}

            {/* Video Player Modal */}
            <Modal
                visible={selectedVideo !== null}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setSelectedVideo(null)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={() => setSelectedVideo(null)} style={styles.closeButton}>
                            <Ionicons name="close" size={scale(28)} color={theme.textPrimary} />
                        </TouchableOpacity>
                        <View style={styles.modalTitleContainer}>
                            <Body isDark={isDark} numberOfLines={1}>{selectedVideo?.title}</Body>
                        </View>
                        <TouchableOpacity onPress={handleOpenYouTube} style={styles.youtubeButton}>
                            <Ionicons name="logo-youtube" size={scale(24)} color="#FF0000" />
                        </TouchableOpacity>
                    </View>

                    {selectedVideo && (
                        <WebView
                            source={{ uri: `https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1` }}
                            style={styles.webview}
                            allowsFullscreenVideo
                            mediaPlaybackRequiresUserAction={false}
                        />
                    )}
                </SafeAreaView>
            </Modal>
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.md),
        gap: scale(spacing.md),
        borderBottomWidth: 1,
    },
    searchInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        paddingHorizontal: scale(spacing.md),
        height: scale(44),
        gap: scale(spacing.sm),
    },
    input: {
        flex: 1,
        fontSize: fontScale(16),
    },
    listContent: {
        padding: scale(spacing.lg),
        alignSelf: 'center',
        width: '100%',
    },
    emptyList: {
        flexGrow: 1,
    },
    columnWrapper: {
        gap: scale(spacing.md),
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(spacing['3xl']),
    },
    emptyText: {
        marginTop: scale(spacing.lg),
    },
    loadMoreButton: {
        marginTop: scale(spacing.lg),
    },
    errorBanner: {
        position: 'absolute',
        bottom: scale(spacing.lg),
        left: scale(spacing.lg),
        right: scale(spacing.lg),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.sm),
        padding: scale(spacing.md),
        borderRadius: borderRadius.md,
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(spacing.md),
        paddingVertical: scale(spacing.sm),
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: scale(spacing.sm),
    },
    modalTitleContainer: {
        flex: 1,
        marginHorizontal: scale(spacing.md),
    },
    youtubeButton: {
        padding: scale(spacing.sm),
    },
    webview: {
        flex: 1,
    },
});
