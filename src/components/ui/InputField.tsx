import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform, StyleProp, ViewStyle, TextInputProps } from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';

type InputFieldProps = TextInputProps & {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function InputField({ label, containerStyle, style, multiline, ...props }: InputFieldProps) {
  const { colors } = useTheme();
  const isMultiline = multiline === true;

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
        multiline={multiline}
        style={[
          styles.input,
          isMultiline ? styles.inputMultiline : styles.inputSingleLine,
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    ...shadowToNative('xs'),
  },
  inputSingleLine: {
    height: 44,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
    ...(Platform.OS === 'android' ? { textAlignVertical: 'top' as const } : {}),
  },
});
