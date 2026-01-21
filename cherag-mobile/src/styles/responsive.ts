/**
 * Responsive Design Utilities
 * Ensures consistent UI across phones and tablets of all sizes
 */

import { Dimensions, PixelRatio, Platform, ScaledSize } from 'react-native';

// Base dimensions (based on standard phone)
const BASE_WIDTH = 375; // iPhone SE / small Android
const BASE_HEIGHT = 812; // Standard phone height

// Get current screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device type detection
export const isTablet = (): boolean => {
    const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
    // Tablets typically have aspect ratio closer to 1 (more square-ish)
    // Phones have taller aspect ratios (1.7+)
    return Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600 || aspectRatio < 1.6;
};

export const isSmallPhone = (): boolean => {
    return SCREEN_WIDTH < 360;
};

export const isLargePhone = (): boolean => {
    return SCREEN_WIDTH >= 400 && !isTablet();
};

// Breakpoints
export const breakpoints = {
    smallPhone: 320,
    phone: 375,
    largePhone: 414,
    tablet: 600,
    largeTablet: 768,
    desktop: 1024, // For web/landscape tablet
};

export type Breakpoint = keyof typeof breakpoints;

// Get current breakpoint
export const getCurrentBreakpoint = (): Breakpoint => {
    if (SCREEN_WIDTH >= breakpoints.desktop) return 'desktop';
    if (SCREEN_WIDTH >= breakpoints.largeTablet) return 'largeTablet';
    if (SCREEN_WIDTH >= breakpoints.tablet) return 'tablet';
    if (SCREEN_WIDTH >= breakpoints.largePhone) return 'largePhone';
    if (SCREEN_WIDTH >= breakpoints.phone) return 'phone';
    return 'smallPhone';
};

/**
 * Scale a value based on screen width
 * Use for horizontal measurements: width, horizontal padding/margin
 */
export const scale = (size: number): number => {
    const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
    const newSize = size * scaleFactor;

    // Limit scaling for tablets to prevent overly large elements
    if (isTablet()) {
        return Math.min(newSize, size * 1.5);
    }

    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Scale a value based on screen height
 * Use for vertical measurements: height, vertical padding/margin
 */
export const verticalScale = (size: number): number => {
    const scaleFactor = SCREEN_HEIGHT / BASE_HEIGHT;
    const newSize = size * scaleFactor;

    if (isTablet()) {
        return Math.min(newSize, size * 1.3);
    }

    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Moderate scale - balanced between horizontal and vertical
 * Use for: font sizes, icons, border radius
 * @param size - base size
 * @param factor - scaling factor (0-1), lower = less scaling
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
    const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
    const newSize = size + (size * (scaleFactor - 1) * factor);

    // Limit for tablets
    if (isTablet()) {
        const maxScale = size * (1 + 0.3 * factor);
        return Math.round(PixelRatio.roundToNearestPixel(Math.min(newSize, maxScale)));
    }

    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Font scaling with accessibility in mind
 * Respects user's font size preferences
 */
export const fontScale = (size: number): number => {
    const scaled = moderateScale(size, 0.3);
    // Respect system font scale but with limits
    const fontScaleFactor = Math.min(PixelRatio.getFontScale(), 1.3);
    return Math.round(scaled * fontScaleFactor);
};

/**
 * Get responsive value based on device type
 */
export const responsive = <T>(options: {
    phone: T;
    tablet?: T;
    largeTablet?: T;
}): T => {
    if (isTablet()) {
        if (SCREEN_WIDTH >= breakpoints.largeTablet && options.largeTablet !== undefined) {
            return options.largeTablet;
        }
        return options.tablet ?? options.phone;
    }
    return options.phone;
};

/**
 * Get number of columns for grid layouts
 */
export const getGridColumns = (): number => {
    const breakpoint = getCurrentBreakpoint();
    switch (breakpoint) {
        case 'desktop':
            return 4;
        case 'largeTablet':
            return 3;
        case 'tablet':
            return 2;
        default:
            return 1;
    }
};

/**
 * Get card width for grid layouts
 */
export const getCardWidth = (columns: number = getGridColumns(), gap: number = 16): number => {
    const totalGap = gap * (columns + 1);
    return (SCREEN_WIDTH - totalGap) / columns;
};

/**
 * Screen dimensions (reactive)
 */
export const screen = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isPortrait: SCREEN_HEIGHT > SCREEN_WIDTH,
    isLandscape: SCREEN_WIDTH > SCREEN_HEIGHT,
};

/**
 * Listen for dimension changes (rotation)
 */
export const subscribeToScreenChanges = (
    callback: (dimensions: ScaledSize) => void
): (() => void) => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
        callback(window);
    });
    return () => subscription.remove();
};

/**
 * Platform-specific values
 */
export const platformSelect = <T>(options: { ios: T; android: T; default?: T }): T => {
    return Platform.select({
        ios: options.ios,
        android: options.android,
        default: options.default ?? options.android,
    }) as T;
};

/**
 * Safe area insets helper
 * Returns default values - actual values should come from SafeAreaView
 */
export const defaultSafeArea = {
    top: Platform.OS === 'android' ? 24 : 44,
    bottom: Platform.OS === 'android' ? 0 : 34,
    left: 0,
    right: 0,
};

// Export dimensions for direct use
export { SCREEN_WIDTH, SCREEN_HEIGHT };
