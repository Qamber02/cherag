/**
 * Quizzes Screen
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
import { useAuth, useFiles } from '../../src/hooks';
import { generateQuizzes } from '../../src/lib/aiService';
import { QuizCard, Button, H3, H2, Body, BodySmall, Card, LoadingSpinner } from '../../src/components';
import { colors, spacing, borderRadius } from '../../src/styles/theme';
import { scale, fontScale, isTablet, SCREEN_WIDTH } from '../../src/styles/responsive';
import type { Quiz } from '../../src/types';

export default function QuizzesScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? colors.dark : colors.light;

    const { user } = useAuth();
    const { getContext, hasContext, uploadFile, isParsing } = useFiles(user?.id);

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);

    const currentQuiz = quizzes[currentIndex];
    const answeredCount = quizzes.filter((q) => q.answered).length;
    const correctCount = quizzes.filter((q) => q.answered && q.user_answer === q.correct_answer).length;
    const progress = quizzes.length > 0 ? Math.round((answeredCount / quizzes.length) * 100) : 0;

    const handleGenerate = async () => {
        const context = getContext();
        if (!context || context.length < 50) {
            setError('Please upload a document with more content.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setShowResults(false);
        setCurrentIndex(0);

        try {
            const result = await generateQuizzes(context);
            const formatted: Quiz[] = result.map((q, i) => ({
                id: `quiz_${Date.now()}_${i}`,
                question: q.question,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                answered: false,
                user_answer: null,
            }));
            setQuizzes(formatted);
        } catch (err: any) {
            setError(err.message || 'Failed to generate quizzes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswer = (answer: string) => {
        setQuizzes((prev) =>
            prev.map((q, i) =>
                i === currentIndex ? { ...q, answered: true, user_answer: answer } : q
            )
        );
    };

    const handleNext = () => {
        if (currentIndex < quizzes.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            setShowResults(true);
        }
    };

    const handleRestart = () => {
        setQuizzes((prev) => prev.map((q) => ({ ...q, answered: false, user_answer: null })));
        setCurrentIndex(0);
        setShowResults(false);
    };

    const handleClear = () => {
        setQuizzes([]);
        setCurrentIndex(0);
        setShowResults(false);
    };

    const containerMaxWidth = isTablet() ? 600 : SCREEN_WIDTH;

    // Results view
    if (showResults) {
        const percentage = Math.round((correctCount / quizzes.length) * 100);
        const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                    <H3 isDark={isDark}>Quiz Results</H3>
                </View>

                <ScrollView contentContainerStyle={[styles.resultsContent, { maxWidth: containerMaxWidth }]}>
                    <Card isDark={isDark} style={styles.resultsCard}>
                        <View style={styles.resultsHeader}>
                            <View style={[styles.gradeCircle, { backgroundColor: percentage >= 70 ? colors.success : colors.error }]}>
                                <H2 color="#fff">{grade}</H2>
                            </View>
                            <H2 isDark={isDark}>{percentage}%</H2>
                            <Body isDark={isDark} color={theme.textSecondary}>
                                {correctCount} of {quizzes.length} correct
                            </Body>
                        </View>

                        <View style={styles.resultStats}>
                            <View style={[styles.resultStat, { backgroundColor: colors.success + '15' }]}>
                                <Ionicons name="checkmark-circle" size={scale(24)} color={colors.success} />
                                <Body isDark={isDark}>{correctCount} Correct</Body>
                            </View>
                            <View style={[styles.resultStat, { backgroundColor: colors.error + '15' }]}>
                                <Ionicons name="close-circle" size={scale(24)} color={colors.error} />
                                <Body isDark={isDark}>{quizzes.length - correctCount} Wrong</Body>
                            </View>
                        </View>
                    </Card>

                    <View style={styles.resultsActions}>
                        <Button
                            title="Try Again"
                            onPress={handleRestart}
                            fullWidth
                            icon={<Ionicons name="refresh" size={scale(18)} color="#fff" />}
                        />
                        <Button
                            title="New Quiz"
                            variant="secondary"
                            onPress={handleGenerate}
                            fullWidth
                            icon={<Ionicons name="sparkles" size={scale(18)} color={colors.primary[500]} />}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <H3 isDark={isDark}>Quizzes</H3>
                {quizzes.length > 0 && (
                    <View style={styles.headerActions}>
                        <BodySmall isDark={isDark}>{currentIndex + 1}/{quizzes.length}</BodySmall>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: theme.surfaceLight }]}
                            onPress={handleClear}
                        >
                            <Ionicons name="trash-outline" size={scale(20)} color={colors.error} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Progress bar */}
            {quizzes.length > 0 && (
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { backgroundColor: theme.surfaceLight }]}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${progress}%`, backgroundColor: colors.primary[500] },
                            ]}
                        />
                    </View>
                </View>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { maxWidth: containerMaxWidth }]}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <LoadingSpinner fullScreen message="Generating quiz..." isDark={isDark} />
                ) : !hasContext ? (
                    <Card isDark={isDark}>
                        <View style={styles.emptyState}>
                            <Ionicons name="help-circle-outline" size={scale(48)} color={theme.textMuted} />
                            <Body isDark={isDark} color={theme.textMuted} align="center" style={styles.emptyText}>
                                Upload a document to generate quizzes
                            </Body>
                            <Button
                                title="Upload Document"
                                onPress={uploadFile}
                                loading={isParsing}
                                icon={<Ionicons name="cloud-upload" size={scale(18)} color="#fff" />}
                            />
                        </View>
                    </Card>
                ) : quizzes.length === 0 ? (
                    <Card isDark={isDark}>
                        <View style={styles.emptyState}>
                            <Ionicons name="sparkles" size={scale(48)} color={colors.primary[500]} />
                            <Body isDark={isDark} align="center" style={styles.emptyText}>
                                Ready to test your knowledge!
                            </Body>
                            <Button
                                title="Generate Quiz"
                                onPress={handleGenerate}
                                icon={<Ionicons name="sparkles" size={scale(18)} color="#fff" />}
                            />
                        </View>
                    </Card>
                ) : currentQuiz ? (
                    <>
                        <QuizCard
                            question={currentQuiz.question}
                            options={currentQuiz.options}
                            correctAnswer={currentQuiz.correct_answer}
                            explanation={currentQuiz.explanation}
                            onAnswer={handleAnswer}
                            answered={currentQuiz.answered}
                            userAnswer={currentQuiz.user_answer}
                            isDark={isDark}
                        />

                        {currentQuiz.answered && (
                            <Button
                                title={currentIndex < quizzes.length - 1 ? 'Next Question' : 'See Results'}
                                onPress={handleNext}
                                fullWidth
                                size="lg"
                                icon={
                                    <Ionicons
                                        name={currentIndex < quizzes.length - 1 ? 'arrow-forward' : 'trophy'}
                                        size={scale(20)}
                                        color="#fff"
                                    />
                                }
                                style={styles.nextButton}
                            />
                        )}
                    </>
                ) : null}

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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.md),
    },
    iconButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.sm),
    },
    progressBar: {
        height: scale(6),
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
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
    nextButton: {
        marginTop: scale(spacing.lg),
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
    resultsContent: {
        padding: scale(spacing.lg),
        alignSelf: 'center',
        width: '100%',
    },
    resultsCard: {
        alignItems: 'center',
        paddingVertical: scale(spacing.xl),
    },
    resultsHeader: {
        alignItems: 'center',
        marginBottom: scale(spacing.xl),
    },
    gradeCircle: {
        width: scale(80),
        height: scale(80),
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scale(spacing.md),
    },
    resultStats: {
        flexDirection: 'row',
        gap: scale(spacing.lg),
    },
    resultStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.sm),
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.md),
        borderRadius: borderRadius.md,
    },
    resultsActions: {
        marginTop: scale(spacing.xl),
        gap: scale(spacing.md),
    },
});
