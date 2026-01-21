/**
 * FlashcardItem Component
 * Flip card with animation for flashcard study mode
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';
import { scale, fontScale, isTablet, getCardWidth } from '../styles/responsive';

interface FlashcardItemProps {
    question: string;
    answer: string;
    isDark?: boolean;
    onMarkKnown?: () => void;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({
    question,
    answer,
    isDark = true,
    onMarkKnown,
}) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const rotation = useSharedValue(0);

    const theme = isDark ? colors.dark : colors.light;

    const handleFlip = () => {
        const newValue = isFlipped ? 0 : 180;
        rotation.value = withTiming(newValue, { duration: 400 });
        setIsFlipped(!isFlipped);
    };

    const frontAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(
            rotation.value,
            [0, 180],
            [0, 180],
            Extrapolation.CLAMP
        );
        return {
            transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
            opacity: interpolate(rotation.value, [0, 90], [1, 0], Extrapolation.CLAMP),
        };
    });

    const backAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(
            rotation.value,
            [0, 180],
            [180, 360],
            Extrapolation.CLAMP
        );
        return {
            transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
            opacity: interpolate(rotation.value, [90, 180], [0, 1], Extrapolation.CLAMP),
        };
    });

    const cardWidth = isTablet() ? getCardWidth(2, scale(spacing.lg)) : '100%';

    return (
        <TouchableOpacity
            onPress={handleFlip}
            activeOpacity={0.95}
            style={[styles.container, { width: cardWidth }]}
        >
            {/* Front - Question */}
            <Animated.View
                style={[
                    styles.card,
                    styles.cardFront,
                    { backgroundColor: colors.primary[600] },
                    frontAnimatedStyle,
                ]}
            >
                <Text style={styles.label}>Question</Text>
                <Text style={styles.frontText}>{question}</Text>
                <Text style={styles.hint}>Tap to flip</Text>
            </Animated.View>

            {/* Back - Answer */}
            <Animated.View
                style={[
                    styles.card,
                    styles.cardBack,
                    { backgroundColor: theme.surface },
                    backAnimatedStyle,
                ]}
            >
                <Text style={[styles.label, { color: colors.primary[400] }]}>Answer</Text>
                <Text style={[styles.backText, { color: theme.textPrimary }]}>{answer}</Text>
                {onMarkKnown && (
                    <TouchableOpacity
                        style={styles.knownButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            onMarkKnown();
                        }}
                    >
                        <Text style={styles.knownButtonText}>✓ Got it!</Text>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: scale(280),
        marginBottom: scale(spacing.lg),
    },

    card: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: borderRadius.xl,
        padding: scale(spacing.xl),
        justifyContent: 'center',
        alignItems: 'center',
        backfaceVisibility: 'hidden',
        ...shadows.lg,
    },

    cardFront: {},

    cardBack: {
        borderWidth: 1,
        borderColor: colors.primary[500],
    },

    label: {
        position: 'absolute',
        top: scale(spacing.lg),
        left: scale(spacing.lg),
        fontSize: fontScale(typography.fontSize.sm),
        fontWeight: typography.fontWeight.medium,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    frontText: {
        fontSize: fontScale(typography.fontSize.xl),
        fontWeight: typography.fontWeight.semibold,
        color: '#ffffff',
        textAlign: 'center',
        lineHeight: fontScale(typography.fontSize.xl) * 1.4,
    },

    backText: {
        fontSize: fontScale(typography.fontSize.lg),
        fontWeight: typography.fontWeight.normal,
        textAlign: 'center',
        lineHeight: fontScale(typography.fontSize.lg) * 1.5,
    },

    hint: {
        position: 'absolute',
        bottom: scale(spacing.lg),
        fontSize: fontScale(typography.fontSize.sm),
        color: 'rgba(255,255,255,0.5)',
    },

    knownButton: {
        position: 'absolute',
        bottom: scale(spacing.lg),
        backgroundColor: colors.success,
        paddingHorizontal: scale(spacing.lg),
        paddingVertical: scale(spacing.sm),
        borderRadius: borderRadius.full,
    },

    knownButtonText: {
        color: '#ffffff',
        fontSize: fontScale(typography.fontSize.sm),
        fontWeight: typography.fontWeight.semibold,
    },
});

export default FlashcardItem;
