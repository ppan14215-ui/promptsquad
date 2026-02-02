import React, { useState } from 'react';
import { Text, Pressable, Platform, StyleSheet, View } from 'react-native';
import { useTheme, textStyles, shadowToCSS, shadowToNative } from '@/design-system';
import { Icon } from './Icon';
import { resolveMascotColor } from '@/lib/utils/mascot-colors';

export type LinkPillState = 'default' | 'hover';

export type LinkPillProps = {
  label: string;
  onPress?: () => void;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  /** Force a specific state for preview purposes */
  forceState?: LinkPillState;
  /** Custom mascot color */
  color?: string;
};

export function LinkPill({
  label,
  onPress,
  onHoverIn,
  onHoverOut,
  forceState,
  color,
}: LinkPillProps) {
  const { colors } = useTheme();
  const [isHoveredInternal, setIsHoveredInternal] = useState(false);

  // Determine effective state
  const isHovered = forceState === 'hover' || (!forceState && isHoveredInternal);

  // Shadow for hover state (web: CSS, native: fallback)
  const shadowStyle = Platform.select({
    web: { boxShadow: shadowToCSS('xs') } as unknown as object,
    default: shadowToNative('xs'),
  });

  // Web-specific transition style
  const webTransitionStyle = Platform.select({
    web: {
      transition: 'all 200ms ease-out',
    } as unknown as object,
    default: {},
  });

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => {
        if (!forceState) setIsHoveredInternal(true);
        onHoverIn?.();
      }}
      onHoverOut={() => {
        if (!forceState) setIsHoveredInternal(false);
        onHoverOut?.();
      }}
      style={[
        styles.container,
        webTransitionStyle,
        {
          borderColor: isHovered
            ? (color ? resolveMascotColor(color) : colors.primary)
            : colors.outline,
          borderWidth: 1,
        },
        isHovered && shadowStyle,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            fontFamily: textStyles.label.fontFamily,
            fontSize: textStyles.label.fontSize,
            letterSpacing: textStyles.label.letterSpacing,
            color: isHovered
              ? (color ? resolveMascotColor(color) : colors.primary)
              : colors.textMuted,
          },
        ]}
      >
        {label}
      </Text>

      {/* Arrow icon - only show on hover */}
      {isHovered && (
        <View style={styles.iconContainer}>
          <Icon
            name="arrow-up-right"
            size={12}
            color={color ? resolveMascotColor(color) : colors.primary}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 4,
  },
  iconContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});

export default LinkPill;

