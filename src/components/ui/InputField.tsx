import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform, StyleProp, ViewStyle, TextInputProps } from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';

type InputFieldProps = TextInputProps & {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function InputField({ label, containerStyle, style, ...props }: InputFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      <Text
        style={[
          styles.label,
          {
            fontFamily: fontFamilies.figtree.medium,
            color: colors.text,
          },
        ]}
      >
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            fontFamily: fontFamilies.figtree.regular,
            color: colors.text,
            borderColor: colors.outline,
            backgroundColor: colors.background,
          },
          Platform.OS === 'web' && ({ boxShadow: shadowToCSS('xs') } as unknown as object),
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    ...shadowToNative('xs'),
  },
});
