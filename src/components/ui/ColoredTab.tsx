import React from 'react';
import { Text, Pressable, Platform, StyleSheet } from 'react-native';
import { useTheme, textStyles, fontFamilies } from '@/design-system';
import { resolveMascotColor, getContrastColor as calculateContrast } from '@/lib/utils/mascot-colors';

export type ColoredTabState = 'default' | 'active';

export type ColoredTabProps = {
  label: string;
  onPress?: () => void;
  /** Whether the tab is active */
  isActive?: boolean;
  /** Force a specific state for preview purposes */
  forceState?: ColoredTabState;
  /** Background color for the active state (defaults to primaryBg) */
  activeBgColor?: string;
  /** Color for the text in active state (if not provided, calculated for contrast) */
  activeTextColor?: string;
};

export function ColoredTab({
  label,
  onPress,
  isActive = false,
  forceState,
  activeBgColor,
  activeTextColor: manualActiveTextColor,
}: ColoredTabProps) {
  const { colors, mode } = useTheme();

  // Determine effective state
  const effectiveState: ColoredTabState = forceState ?? (isActive ? 'active' : 'default');
  const isActiveState = effectiveState === 'active';

  // Calculate high-contrast text color if not provided
  const getContrastColor = (bgColor: string) => {
    if (!bgColor) return mode === 'dark' ? colors.buttonText : colors.primary;
    return calculateContrast(bgColor);
  };

  const finalActiveBgColor = resolveMascotColor(activeBgColor) || colors.primaryBg;
  const finalActiveTextColor = manualActiveTextColor || (activeBgColor ? calculateContrast(resolveMascotColor(activeBgColor)) : (mode === 'dark' ? colors.buttonText : colors.primary));

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
          backgroundColor: isActiveState ? finalActiveBgColor : 'transparent',
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
            color: isActiveState ? finalActiveTextColor : colors.textMuted,
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

