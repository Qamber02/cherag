/**
 * QuizCard Component  
 * Multiple choice question display with selection and feedback
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { scale, fontScale, isTablet } from '../styles/responsive';

interface QuizCardProps {
    question: string;
    options: string[];
    correctAnswer: string; // 'A', 'B', 'C', or 'D'
    explanation: string;
    onAnswer: (answer: string) => void;
    answered?: boolean;
    userAnswer?: string | null;
    isDark?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuizCard: React.FC<QuizCardProps> = ({
    question,
    options,
    correctAnswer,
    explanation,
    onAnswer,
    answered = false,
    userAnswer = null,
    isDark = true,
}) => {
    const theme = isDark ? colors.dark : colors.light;

    const getOptionStyle = (letter: string) => {
        if (!answered) {
            return { backgroundColor: theme.surfaceLight, borderColor: theme.border };
        }

        const isCorrect = letter === correctAnswer;
        const isSelected = letter === userAnswer;

        if (isCorrect) {
            return { backgroundColor: colors.success + '20', borderColor: colors.success };
        }
        if (isSelected && !isCorrect) {
            return { backgroundColor: colors.error + '20', borderColor: colors.error };
        }
        return { backgroundColor: theme.surfaceLight, borderColor: theme.border, opacity: 0.5 };
    };

    const getOptionIcon = (letter: string) => {
        if (!answered) return null;

        const isCorrect = letter === correctAnswer;
        const isSelected = letter === userAnswer;

        if (isCorrect) {
            return <Ionicons name="checkmark-circle" size={scale(24)} color={colors.success} />;
        }
        if (isSelected && !isCorrect) {
            return <Ionicons name="close-circle" size={scale(24)} color={colors.error} />;
        }
        return null;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            {/* Question */}
            <Text style={[styles.question, { color: theme.textPrimary }]}>{question}</Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
                {options.map((option, index) => {
                    const letter = OPTION_LETTERS[index];
                    const optionStyle = getOptionStyle(letter);

                    return (
                        <TouchableOpacity
                            key={letter}
                            style={[styles.option, optionStyle]}
                            onPress={() => !answered && onAnswer(letter)}
                            disabled={answered}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.letterBadge, answered && letter === correctAnswer && styles.correctBadge]}>
                                <Text style={[styles.letterText, answered && letter === correctAnswer && styles.correctLetterText]}>
                                    {letter}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.optionText,
                                    { color: theme.textPrimary },
                                    answered && letter !== correctAnswer && letter !== userAnswer && styles.dimmedText,
                                ]}
                                numberOfLines={3}
                            >
                                {option}
                            </Text>
                            {getOptionIcon(letter)}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Explanation (shown after answering) */}
            {answered && (
                <View style={styles.explanationContainer}>
                    <View style={styles.explanationHeader}>
                        <Ionicons
                            name={userAnswer === correctAnswer ? 'checkmark-circle' : 'information-circle'}
                            size={scale(20)}
                            color={userAnswer === correctAnswer ? colors.success : colors.primary[400]}
                        />
                        <Text style={[styles.explanationTitle, { color: theme.textPrimary }]}>
                            {userAnswer === correctAnswer ? 'Correct!' : 'Explanation'}
                        </Text>
                    </View>
                    <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                        {explanation}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.lg,
        padding: scale(spacing.lg),
        marginBottom: scale(spacing.lg),
    },

    question: {
        fontSize: fontScale(typography.fontSize.lg),
        fontWeight: typography.fontWeight.semibold,
        marginBottom: scale(spacing.lg),
        lineHeight: fontScale(typography.fontSize.lg) * 1.4,
    },

    optionsContainer: {
        gap: scale(spacing.md),
    },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scale(spacing.md),
        borderRadius: borderRadius.md,
        borderWidth: 1,
        gap: scale(spacing.md),
    },

    letterBadge: {
        width: scale(32),
        height: scale(32),
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary[600] + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },

    correctBadge: {
        backgroundColor: colors.success,
    },

    letterText: {
        fontSize: fontScale(typography.fontSize.sm),
        fontWeight: typography.fontWeight.bold,
        color: colors.primary[500],
    },

    correctLetterText: {
        color: '#ffffff',
    },

    optionText: {
        flex: 1,
        fontSize: fontScale(typography.fontSize.base),
        lineHeight: fontScale(typography.fontSize.base) * 1.4,
    },

    dimmedText: {
        opacity: 0.5,
    },

    explanationContainer: {
        marginTop: scale(spacing.lg),
        padding: scale(spacing.md),
        backgroundColor: colors.primary[600] + '10',
        borderRadius: borderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary[500],
    },

    explanationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(spacing.sm),
        marginBottom: scale(spacing.sm),
    },

    explanationTitle: {
        fontSize: fontScale(typography.fontSize.base),
        fontWeight: typography.fontWeight.semibold,
    },

    explanationText: {
        fontSize: fontScale(typography.fontSize.sm),
        lineHeight: fontScale(typography.fontSize.sm) * 1.5,
    },
});

export default QuizCard;
