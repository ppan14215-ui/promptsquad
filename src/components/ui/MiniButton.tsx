import React, { useState } from 'react';
import { Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useTheme, textStyles, skeuToCSS, shadowToNative } from '@/design-system';
import { resolveMascotColor, getContrastColor } from '@/lib/utils/mascot-colors';

export type MiniButtonState = 'default' | 'hover';

export type MiniButtonProps = {
  label: string;
  onPress?: () => void;
  /** Visual style variant */
  variant?: 'primary' | 'dark';
  /** Optional custom background color (key or hex) */
  color?: string;
  /** Force a specific state for preview purposes */
  forceState?: MiniButtonState;
};

function darkenHex(hexColor: string, amount = 0.12): string {
  if (!hexColor.startsWith('#') || hexColor.length !== 7) return hexColor;
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const r = clamp(Math.round(parseInt(hexColor.slice(1, 3), 16) * (1 - amount)));
  const g = clamp(Math.round(parseInt(hexColor.slice(3, 5), 16) * (1 - amount)));
  const b = clamp(Math.round(parseInt(hexColor.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

export function MiniButton({
  label,
  onPress,
  variant = 'primary',
  color,
  forceState,
}: MiniButtonProps) {
  const { colors } = useTheme();
  const [isHoveredInternal, setIsHoveredInternal] = useState(false);

  // Determine effective state
  const isHovered = forceState === 'hover' || (!forceState && isHoveredInternal);

  // Web-specific transition style
  const webTransitionStyle = Platform.select({
    web: {
      transition: 'all 200ms ease-out',
    } as unknown as object,
    default: {},
  });

  // Skeuomorphic effect - web uses CSS, native uses gradient overlay
  const skeuShadowStyle = Platform.select({
    web: {
      boxShadow: skeuToCSS('skeu-primary-xs'),
    } as unknown as object,
    default: shadowToNative('md'),
  });

  // Gradient removed - inner shadows don't look good on mobile

  const customBgColor = color ? resolveMascotColor(color) : undefined;
  const defaultBgColor = customBgColor || (variant === 'dark' ? colors.darkButton : colors.primary);
  const hoverBgColor = customBgColor
    ? darkenHex(defaultBgColor)
    : (variant === 'dark' ? colors.darkButtonHover : colors.primaryHover);
  const textColor = customBgColor ? getContrastColor(defaultBgColor) : colors.buttonText;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => !forceState && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: isHovered ? hoverBgColor : defaultBgColor,
        },
        skeuShadowStyle,
      ]}
    >
      {/* Inner shadow effects removed on mobile - they don't look good */}
      <Text
        style={[
          styles.label,
          {
            fontFamily: textStyles.miniButton.fontFamily,
            fontSize: textStyles.miniButton.fontSize,
            lineHeight: textStyles.miniButton.lineHeight,
            letterSpacing: textStyles.miniButton.letterSpacing,
            fontWeight: textStyles.miniButton.fontWeight,
            color: textColor,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  label: {
    textAlign: 'center',
  },
});

export default MiniButton;

