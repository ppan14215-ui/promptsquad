import React, { useState } from 'react';
import { Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useTheme, textStyles, skeuToCSS, shadowToNative } from '@/design-system';

export type MediumDarkButtonState = 'default' | 'hover';

export type MediumDarkButtonProps = {
  label: string;
  onPress?: () => void;
  /** Force a specific state for preview purposes */
  forceState?: MediumDarkButtonState;
  fullWidth?: boolean;
};

export function MediumDarkButton({
  label,
  onPress,
  forceState,
  fullWidth = false,
}: MediumDarkButtonProps) {
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
      boxShadow: skeuToCSS('skeu-dark-m'),
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
        fullWidth && styles.fullWidth,
        {
          backgroundColor: isHovered ? colors.darkButtonHover : colors.darkButton,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    textAlign: 'center',
  },
});

export default MediumDarkButton;

