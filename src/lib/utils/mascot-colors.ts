
import { lightColors } from '@/design-system/tokens/light';
import { COLOR_MAP, COLOR_LIGHT_MAP, MascotColor } from '@/config/mascots';

/**
 * Resolves a mascot color key or hex to its primary palette value.
 */
export function resolveMascotColor(color: string | null | undefined): string {
    if (!color) return lightColors.primary;

    // If it's a known color key
    if (color.toLowerCase() in COLOR_MAP) {
        return COLOR_MAP[color.toLowerCase() as MascotColor];
    }

    // Return as is (likely a hex code)
    return color;
}

/**
 * Resolves a mascot color key or hex to its light palette value.
 */
export function resolveMascotLightColor(color: string | null | undefined): string {
    if (!color) return lightColors.primaryBg;

    // If it's a known color key
    if (color.toLowerCase() in COLOR_LIGHT_MAP) {
        return COLOR_LIGHT_MAP[color.toLowerCase() as MascotColor];
    }

    // Return as is (likely a hex code)
    return color;
}

/**
 * Determines whether text should be black or white based on background brightness.
 */
export function getContrastColor(bgColor: string | null | undefined): '#000000' | '#FFFFFF' {
    if (!bgColor) return '#FFFFFF';

    let hex = bgColor;

    // If it's a known color key, get its hex
    if (bgColor.toLowerCase() in COLOR_MAP) {
        hex = COLOR_MAP[bgColor.toLowerCase() as MascotColor];
    }

    // Check for common light color names directly
    const lightColors = ['yellow', 'yellowlight', 'greenlight', 'teallight', 'orangelight'];
    if (lightColors.includes(bgColor.toLowerCase())) return '#000000';

    if (!hex.startsWith('#')) return '#FFFFFF';

    try {
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 180 ? '#000000' : '#FFFFFF';
    } catch (e) {
        return '#FFFFFF';
    }
}
