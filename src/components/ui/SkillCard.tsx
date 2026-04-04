import React from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';

const WEB_HOVER_TRANSITION = Platform.OS === 'web'
  ? ({
      transitionDuration: '150ms',
      transitionTimingFunction: 'ease-out',
      transitionProperty: 'background-color, border-color, box-shadow, opacity',
    } as any)
  : {};

export type SkillCardProps = {
  title: string;
  summary?: string;
  onPress?: () => void;
  /** Web: controlled hover (e.g. parent tracks which row is hovered). */
  hovered?: boolean;
  /** Border color when hovered (e.g. mascot accent). */
  accentBorderColor?: string;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Skill card: compact padding, title + body hierarchy; sm shadow by default, md + accent border on hover (web). */
export function SkillCard({
  title,
  summary,
  onPress,
  hovered = false,
  accentBorderColor,
  onHoverIn,
  onHoverOut,
  containerStyle,
}: SkillCardProps) {
  const { colors, mode } = useTheme();
  const cardBg = mode === 'dark' ? colors.chatBubble : '#FFFFFF';
  const borderColor = hovered && accentBorderColor ? accentBorderColor : colors.outline;
  const webShadow = Platform.OS === 'web' ? ({ boxShadow: shadowToCSS(hovered ? 'md' : 'xs') } as object) : null;
  const nativeShadow = Platform.OS !== 'web' ? (hovered ? shadowToNative('md') : shadowToNative('xs')) : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      {...(Platform.OS === 'web' && onHoverIn
        ? {
            onHoverIn,
            onHoverOut,
          }
        : {})}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor,
          borderWidth: 1,
          opacity: pressed && Platform.OS !== 'web' ? 0.9 : 1,
          ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
          ...(Platform.OS === 'web' ? WEB_HOVER_TRANSITION : null),
        },
        webShadow,
        nativeShadow,
        containerStyle,
      ]}
    >
      <View style={styles.textBlock}>
        <Text
          style={[styles.title, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}
        >
          {title}
        </Text>
        {summary?.trim() ? (
          <Text
            style={[styles.summary, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular }]}
          >
            {summary.trim()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textBlock: {
    gap: 4,
    width: '100%',
  },
  title: {
    fontSize: 12,
    lineHeight: 17,
  },
  summary: {
    fontSize: 10,
    lineHeight: 14,
  },
});
