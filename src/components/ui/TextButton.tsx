import React, { useState } from 'react';
import { Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useTheme, textStyles } from '@/design-system';

export type TextButtonState = 'default' | 'hover';

export type TextButtonProps = {
  label: string;
  onPress?: () => void;
  /** Force a specific state for preview purposes */
  forceState?: TextButtonState;
};

export function TextButton({
  label,
  onPress,
  forceState,
}: TextButtonProps) {
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

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => !forceState && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: isHovered ? hexToRgba(colors.primary, 0.1) : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            fontFamily: textStyles.button.fontFamily,
            fontSize: textStyles.button.fontSize,
            lineHeight: textStyles.button.lineHeight,
            letterSpacing: textStyles.button.letterSpacing,
            color: colors.primary,
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
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});

export default TextButton;

