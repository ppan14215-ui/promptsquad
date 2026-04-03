import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';

export type HomeHeaderProps = {
  userName: string;
  questionPrompt: string;
  keyboardVisible?: boolean;
  isDesktop?: boolean;
};

export function HomeHeader({
  userName,
  questionPrompt,
  keyboardVisible = false,
  isDesktop = false,
}: HomeHeaderProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallMobile = width < 380;

  return (
    <View
      style={[
        styles.headerSection,
        isDesktop && styles.headerSectionDesktop,
        keyboardVisible && styles.headerSectionKeyboard,
        !isDesktop && !keyboardVisible && styles.headerSectionMobile,
      ]}
    >
      <View style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
        {!keyboardVisible && (
          <View style={styles.header}>
            <Text
              style={[
                styles.greeting,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.textMuted,
                  fontSize: isSmallMobile ? 16 : 18,
                },
              ]}
            >
              Hallo {userName}
            </Text>
            <Text
              style={[
                styles.questionPrompt,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.text,
                  fontSize: isSmallMobile ? 24 : 28,
                  lineHeight: isSmallMobile ? 30 : 36,
                },
              ]}
              numberOfLines={3}
              adjustsFontSizeToFit
            >
              {questionPrompt}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerSectionDesktop: {
    alignItems: 'center',
  },
  headerSectionMobile: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerSectionKeyboard: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  headerContent: {
    width: '100%',
  },
  headerContentDesktop: {
    maxWidth: 678,
  },
  header: {
    gap: 4,
  },
  greeting: {
    lineHeight: 18 * 1.3,
  },
  questionPrompt: {
  },
});

