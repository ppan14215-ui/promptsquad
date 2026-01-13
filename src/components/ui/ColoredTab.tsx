import React from 'react';
import { Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useTheme, textStyles, fontFamilies } from '@/design-system';

export type ColoredTabState = 'default' | 'active';

export type ColoredTabProps = {
  label: string;
  onPress?: () => void;
  /** Whether the tab is active */
  isActive?: boolean;
  /** Force a specific state for preview purposes */
  forceState?: ColoredTabState;
};

export function ColoredTab({
  label,
  onPress,
  isActive = false,
  forceState,
}: ColoredTabProps) {
  const { colors, mode } = useTheme();

  // Determine effective state
  const effectiveState: ColoredTabState = forceState ?? (isActive ? 'active' : 'default');
  const isActiveState = effectiveState === 'active';

  // In dark mode, use white text for active state since primaryBg is dark
  const activeTextColor = mode === 'dark' ? colors.buttonText : colors.primary;

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
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: isActiveState ? colors.primaryBg : 'transparent',
          borderWidth: isActiveState ? 0 : 1,
          borderColor: colors.outline,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            fontFamily: isActiveState ? fontFamilies.figtree.semiBold : fontFamilies.figtree.semiBold,
            fontWeight: isActiveState ? '700' : '600',
            fontSize: textStyles.label.fontSize,
            letterSpacing: textStyles.label.letterSpacing,
            color: isActiveState ? activeTextColor : colors.textMuted,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  label: {
    textAlign: 'center',
  },
});

export default ColoredTab;

