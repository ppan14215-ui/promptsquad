import React, { useState } from 'react';
import { Text, Pressable, Platform, StyleSheet, View } from 'react-native';
import { useTheme, textStyles, shadowToNative, shadowToCSS } from '@/design-system';

export type BigSecondaryButtonState = 'default' | 'hover';

export type BigSecondaryButtonProps = {
  label: string;
  onPress?: () => void;
  /** Force a specific state for preview purposes */
  forceState?: BigSecondaryButtonState;
  /** Disable the button */
  disabled?: boolean;
  /** Optional icon element to display before the label */
  icon?: React.ReactNode;
};

export function BigSecondaryButton({
  label,
  onPress,
  forceState,
  disabled = false,
  icon,
}: BigSecondaryButtonProps) {
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

  // Shadow xs for web
  const shadowStyle = Platform.select({
    web: {
      boxShadow: shadowToCSS('xs'),
    } as unknown as object,
    default: shadowToNative('xs'),
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
          borderColor: colors.outline,
          backgroundColor: isHovered ? colors.surface : colors.background,
          opacity: disabled ? 0.6 : 1,
        },
        shadowStyle,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.label,
          {
            fontFamily: textStyles.button.fontFamily,
            fontSize: textStyles.button.fontSize,
            lineHeight: textStyles.button.lineHeight,
            letterSpacing: textStyles.button.letterSpacing,
            color: colors.text,
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconContainer: {
    // Icon container
  },
  label: {
    textAlign: 'center',
  },
});

export default BigSecondaryButton;
