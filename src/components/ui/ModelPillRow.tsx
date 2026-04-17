import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';

export type ModelPillRowProps = {
  /** Display strings (e.g. GPT-5.4, Claude 4.5) — already resolved for UI. */
  labels: string[];
  style?: StyleProp<ViewStyle>;
  /** Tighter row for narrow cards; default matches Agents description chips. */
  compact?: boolean;
};

/**
 * Rounded model tags (Agents page / mascot details). Theme-aware for light and dark mode.
 */
export function ModelPillRow({ labels, style, compact }: ModelPillRowProps) {
  const { colors, mode } = useTheme();
  const fill = mode === 'dark' ? colors.chatBubble : colors.surface;
  if (!labels.length) return null;

  return (
    <View style={[styles.row, compact && styles.rowCompact, style]}>
      {labels.map((label, index) => (
        <View
          key={`${label}-${index}`}
          style={[styles.pill, { borderColor: colors.outline, backgroundColor: fill }]}
        >
          <Text style={[styles.pillText, { color: colors.textMuted }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  rowCompact: {
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontFamily: fontFamilies.figtree.medium,
    fontWeight: '500',
  },
});
