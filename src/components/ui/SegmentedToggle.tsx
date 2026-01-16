import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';

type SegmentedOption = {
  key: string;
  label: string;
};

type SegmentedToggleProps = {
  options: SegmentedOption[];
  selectedKey: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedToggle({ options, selectedKey, onChange, style }: SegmentedToggleProps) {
  const { colors, mode } = useTheme();
  const activeBackground = mode === 'dark' ? colors.darkButton : colors.surface;

  return (
    <View
      style={[
        styles.container,
        { borderColor: colors.outline, backgroundColor: colors.background },
        style,
      ]}
    >
      {options.map((option) => {
        const isActive = option.key === selectedKey;
        return (
          <Pressable
            key={option.key}
            style={[
              styles.tab,
              isActive && styles.tabActive,
              isActive && { backgroundColor: activeBackground },
              isActive && Platform.OS === 'web' && ({ boxShadow: shadowToCSS('md') } as unknown as object),
            ]}
            onPress={() => onChange(option.key)}
          >
            <Text
              style={[
                styles.tabText,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: isActive ? colors.text : colors.textMuted,
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 4,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    ...shadowToNative('md'),
  },
  tabText: {
    fontSize: 14,
  },
});
