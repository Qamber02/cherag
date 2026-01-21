/**
 * Flashcards Screen
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useFiles, useFlashcards } from '../../src/hooks';
import { FlashcardItem, Button, H3, H2, Body, BodySmall, Card, LoadingSpinner } from '../../src/components';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';

export default function FlashcardsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const { user } = useAuth();
    const { getContext, hasContext, uploadFile, isParsing } = useFiles(user?.id);
    const {
        flashcards,
        currentCard,
        currentIndex,
        totalCards,
        progress,
        knownCount,
        isLoading,
        error,
        generateFlashcards,
        nextCard,
        prevCard,
        markAsKnown,
        resetProgress,
        clearFlashcards,
        shuffleCards,
        hasFlashcards,
        isFirstCard,
        isLastCard,
    } = useFlashcards();

    const [isStudyMode, setIsStudyMode] = useState(false);

    const handleGenerate = async () => {
        const context = getContext();
        await generateFlashcards(context);
        setIsStudyMode(true);
    };

    const handleStartStudy = () => {
        resetProgress();
        setIsStudyMode(true);
    };

    const handleExitStudy = () => {
        setIsStudyMode(false);
    };

    const containerMaxWidth = isTablet() ? 600 : SCREEN_WIDTH;

    // Study mode view
    if (isStudyMode && hasFlashcards && currentCard) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={handleExitStudy} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={scale(24)} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Body isDark={isDark}>
                        {currentIndex + 1} / {totalCards}
                    </Body>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: theme.surfaceLight }]}
                            onPress={shuffleCards}
                        >
                            <Ionicons name="shuffle" size={scale(20)} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { backgroundColor: theme.surfaceLight }]}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${progress}%`, backgroundColor: colors.success },
                            ]}
                        />
                    </View>
                    <BodySmall isDark={isDark} color={theme.textMuted}>
                        {knownCount} known
                    </BodySmall>
                </View>

                {/* Current card */}
                <View style={[styles.cardContainer, { maxWidth: containerMaxWidth }]}>
                    <FlashcardItem
                        question={currentCard.question}
                        answer={currentCard.answer}
                        isDark={isDark}
                        onMarkKnown={markAsKnown}
                    />
                </View>

                {/* Navigation */}
                <View style={styles.navigation}>
                    <TouchableOpacity
                        style={[
                            styles.navButton,
                            { backgroundColor: theme.surfaceLight },
                            isFirstCard && styles.navButtonDisabled,
                        ]}
                        onPress={prevCard}
                        disabled={isFirstCard}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={scale(28)}
                            color={isFirstCard ? theme.textMuted : theme.textPrimary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.navButton,
                            { backgroundColor: theme.surfaceLight },
                            isLastCard && styles.navButtonDisabled,
                        ]}
                        onPress={nextCard}
                        disabled={isLastCard}
                    >
                        <Ionicons
                            name="chevron-forward"
                            size={scale(28)}
                            color={isLastCard ? theme.textMuted : theme.textPrimary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Completion */}
                {isLastCard && currentCard.status === 'mastered' && (
                    <Card isDark={isDark} style={styles.completionCard}>
                        <View style={styles.completionContent}>
                            <Ionicons name="trophy" size={scale(32)} color={colors.accent[500]} />
                            <Body isDark={isDark} style={styles.completionText}>
                                Great job! You've mastered {knownCount}/{totalCards} cards!
                            </Body>
                            <Button
                                title="Study Again"
                                onPress={resetProgress}
                                size="sm"
                            />
                        </View>
                    </Card>
                )}
            </SafeAreaView>
        );
    }

    // Default view
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <H3 isDark={isDark}>Flashcards</H3>
                {hasFlashcards && (
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: theme.surfaceLight }]}
                        onPress={clearFlashcards}
                    >
                        <Ionicons name="trash-outline" size={scale(20)} color={colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { maxWidth: containerMaxWidth }]}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <LoadingSpinner fullScreen message="Generating flashcards..." isDark={isDark} />
                ) : !hasContext ? (
                    <Card isDark={isDark}>
                        <View style={styles.emptyState}>
                            <Ionicons name="layers-outline" size={scale(48)} color={theme.textMuted} />
                            <Body isDark={isDark} color={theme.textMuted} align="center" style={styles.emptyText}>
                                Upload a document to generate flashcards
                            </Body>
                            <Button
                                title="Upload Document"
                                onPress={uploadFile}
                                loading={isParsing}
                                icon={<Ionicons name="cloud-upload" size={scale(18)} color="#fff" />}
                            />
                        </View>
                    </Card>
                ) : !hasFlashcards ? (
                    <Card isDark={isDark}>
                        <View style={styles.emptyState}>
                            <Ionicons name="sparkles" size={scale(48)} color={colors.primary[500]} />
                            <Body isDark={isDark} align="center" style={styles.emptyText}>
                                Ready to create flashcards from your document!
                            </Body>
                            <Button
                                title="Generate Flashcards"
                                onPress={handleGenerate}
                                icon={<Ionicons name="sparkles" size={scale(18)} color="#fff" />}
                            />
                        </View>
                    </Card>
                ) : (
                    <>
                        {/* Stats */}
                        <Card isDark={isDark} style={styles.statsCard}>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <H2 isDark={isDark} color={colors.primary[500]}>{totalCards}</H2>
                                    <BodySmall isDark={isDark}>Cards</BodySmall>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <H2 isDark={isDark} color={colors.success}>{knownCount}</H2>
                                    <BodySmall isDark={isDark}>Known</BodySmall>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <H2 isDark={isDark} color={colors.accent[500]}>{progress}%</H2>
                                    <BodySmall isDark={isDark}>Progress</BodySmall>
                                </View>
                            </View>
                        </Card>

                        {/* Actions */}
                        <Button
                            title="Start Studying"
                            onPress={handleStartStudy}
                            fullWidth
                            size="lg"
                            icon={<Ionicons name="play" size={scale(20)} color="#fff" />}
                            style={styles.studyButton}
                        />

                        <Button
                            title="Regenerate Cards"
                            variant="secondary"
                            onPress={handleGenerate}
                            fullWidth
                            icon={<Ionicons name="refresh" size={scale(18)} color={colors.primary[500]} />}
                        />

                        {/* Preview cards */}
                        <View style={styles.previewSection}>
                            <BodySmall isDark={isDark} style={styles.previewTitle}>Preview</BodySmall>
                            {flashcards.slice(0, 3).map((card, index) => (
                                <Card key={card.id} variant="outlined" isDark={isDark} style={styles.previewCard}>
                                    <BodySmall isDark={isDark} color={colors.primary[400]}>Q:</BodySmall>
                                    <Body isDark={isDark} numberOfLines={2}>{card.question}</Body>
                                </Card>
                            ))}
                        </View>
                    </>
                )}

                {/* Error */}
                {error && (
                    <Card variant="outlined" isDark={isDark} style={styles.errorCard}>
                        <View style={styles.errorContent}>
                            <Ionicons name="alert-circle" size={scale(24)} color={colors.error} />
                            <Body color={colors.error}>{error}</Body>
                        </View>
                    </Card>
                )}
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
    headerActions: {
        flexDirection: 'row',
        gap: scale(spacing.sm),
    },
    iconButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.md),
        gap: scale(spacing.md),
    },
    progressBar: {
        flex: 1,
        height: scale(8),
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    cardContainer: {
        flex: 1,
        paddingHorizontal: scale(spacing.lg),
        justifyContent: 'center',
        alignSelf: 'center',
        width: '100%',
    },
    navigation: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: scale(spacing.xl),
        paddingVertical: scale(spacing.lg),
    },
    navButton: {
        width: scale(56),
        height: scale(56),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    completionCard: {
        marginHorizontal: scale(spacing.lg),
        marginBottom: scale(spacing.lg),
        backgroundColor: colors.accent[500] + '15',
    },
    completionContent: {
        alignItems: 'center',
        gap: scale(spacing.md),
    },
    completionText: {
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: scale(spacing.lg),
        alignSelf: 'center',
        width: '100%',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: scale(spacing.xl),
    },
    emptyText: {
        marginVertical: scale(spacing.lg),
    },
    statsCard: {
        marginBottom: scale(spacing.lg),
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: scale(40),
        backgroundColor: colors.dark.border,
    },
    studyButton: {
        marginBottom: scale(spacing.md),
    },
    previewSection: {
        marginTop: scale(spacing.xl),
    },
    previewTitle: {
        marginBottom: scale(spacing.sm),
    },
    previewCard: {
        marginBottom: scale(spacing.sm),
    },
    errorCard: {
        marginTop: scale(spacing.md),
        borderColor: colors.error,
    },
    errorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.md),
    },
});
