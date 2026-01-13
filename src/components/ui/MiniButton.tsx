import React, { useState } from 'react';
import { Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useTheme, textStyles, skeuToCSS, shadowToNative } from '@/design-system';

export type MiniButtonState = 'default' | 'hover';

export type MiniButtonProps = {
  label: string;
  onPress?: () => void;
  /** Force a specific state for preview purposes */
  forceState?: MiniButtonState;
};

export function MiniButton({
  label,
  onPress,
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

  // Skeuomorphic effect for web
  const skeuShadowStyle = Platform.select({
    web: {
      boxShadow: skeuToCSS('skeu-primary-xs'),
    } as unknown as object,
    default: shadowToNative('md'),
  });

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => !forceState && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: isHovered ? colors.primaryHover : colors.primary,
        },
        skeuShadowStyle,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            fontFamily: textStyles.miniButton.fontFamily,
            fontSize: textStyles.miniButton.fontSize,
            lineHeight: textStyles.miniButton.lineHeight,
            letterSpacing: textStyles.miniButton.letterSpacing,
            fontWeight: textStyles.miniButton.fontWeight,
            color: colors.buttonText,
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
  },
  label: {
    textAlign: 'center',
  },
});

export default MiniButton;

