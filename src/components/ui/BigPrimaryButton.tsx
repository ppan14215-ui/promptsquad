import React, { useState } from 'react';
import { Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useTheme, textStyles, skeuToCSS, shadowToNative } from '@/design-system';

export type BigPrimaryButtonState = 'default' | 'hover';

export type BigPrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  /** Force a specific state for preview purposes */
  forceState?: BigPrimaryButtonState;
  /** Disable the button */
  disabled?: boolean;
};

export function BigPrimaryButton({
  label,
  onPress,
  forceState,
  disabled = false,
}: BigPrimaryButtonProps) {
  const { colors } = useTheme();
  const [isHoveredInternal, setIsHoveredInternal] = useState(false);

  // Determine effective state
  const isHovered = forceState === 'hover' || (!forceState && isHoveredInternal && !disabled);

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
      boxShadow: skeuToCSS('skeu-primary-m'),
    } as unknown as object,
    default: shadowToNative('md'),
  });

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => !forceState && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      disabled={disabled}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: isHovered ? colors.primaryHover : colors.primary,
          opacity: disabled ? 0.6 : 1,
        },
        skeuShadowStyle,
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});

export default BigPrimaryButton;

