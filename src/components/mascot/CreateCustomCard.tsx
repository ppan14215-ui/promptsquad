import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme, textStyles, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { useI18n } from '@/i18n';
import { Icon } from '../ui/Icon';

export type CreateCustomCardState = 'default' | 'hover';

export type CreateCustomCardProps = {
  onPress?: () => void;
  /** Force a specific state for preview purposes */
  forceState?: CreateCustomCardState;
  /** Whether the card is locked/disabled (e.g. for free users) */
  isLocked?: boolean;
};

export function CreateCustomCard({ onPress, forceState, isLocked }: CreateCustomCardProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [isHoveredInternal, setIsHoveredInternal] = useState(false);

  // Determine effective state
  const effectiveState: CreateCustomCardState = forceState ?? (isHoveredInternal ? 'hover' : 'default');
  // Hover effects disabled if locked
  const isHovered = !isLocked && effectiveState === 'hover';

  // Shadow for hover state
  const shadowStyle = Platform.select({
    web: { boxShadow: shadowToCSS('md') } as unknown as object,
    default: shadowToNative('md'),
  });

  // Web-specific transition style
  const webTransitionStyle = Platform.select({
    web: {
      transition: 'all 200ms ease-out',
    } as unknown as object,
    default: {},
  });

  const borderColor = isLocked
    ? colors.outline
    : isHovered
      ? colors.primary
      : colors.outline;

  const iconColor = isLocked
    ? colors.textMuted
    : isHovered
      ? colors.primary
      : colors.icon;

  const textColor = isLocked
    ? colors.textMuted
    : isHovered
      ? colors.primary
      : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => !forceState && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: isLocked ? colors.surface : colors.background,
          borderColor: borderColor,
          opacity: isLocked ? 0.7 : 1,
        },
        isHovered && shadowStyle,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon
            name={isLocked ? "lock" : "add-circle"}
            size={24}
            color={iconColor}
          />
        </View>
        <Text
          style={[
            styles.label,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: textColor,
            },
          ]}
        >
          {isLocked ? "Create Custom (Pro)" : t.home.createCustom}
        </Text>
      </View>
    </Pressable>
  );
}

const CARD_SIZE = 192;

const styles = StyleSheet.create({
  container: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default CreateCustomCard;

