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
};

export function CreateCustomCard({ onPress, forceState }: CreateCustomCardProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [isHoveredInternal, setIsHoveredInternal] = useState(false);
  
  // Determine effective state
  const effectiveState: CreateCustomCardState = forceState ?? (isHoveredInternal ? 'hover' : 'default');
  const isHovered = effectiveState === 'hover';

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

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => !forceState && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: colors.background,
          borderColor: isHovered ? colors.primary : colors.outline,
        },
        isHovered && shadowStyle,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon 
            name="add-circle" 
            size={24} 
            color={isHovered ? colors.primary : colors.icon}
          />
        </View>
        <Text
          style={[
            styles.label,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: isHovered ? colors.primary : colors.textMuted,
            },
          ]}
        >
          {t.home.createCustom}
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

