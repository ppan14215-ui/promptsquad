import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, fontFamilies } from '@/design-system';
import { useI18n } from '@/i18n';
import Markdown from 'react-native-markdown-display';
import { privacyPolicyContent } from '@/constants/privacy-policy';
import { Icon } from '@/components';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Icon name="lock" size={32} color={colors.primary} />
          <Text
            style={[
              styles.title,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: colors.text,
              },
            ]}
          >
            Privacy Policy
          </Text>
        </View>
        <View style={[styles.markdownContainer, { backgroundColor: colors.surface }]}>
          <Markdown
            style={{
              body: {
                color: colors.text,
                fontFamily: fontFamilies.figtree.regular,
                fontSize: 14,
                lineHeight: 20,
              },
              heading1: {
                color: colors.text,
                fontFamily: fontFamilies.figtree.semiBold,
                fontSize: 24,
                marginTop: 24,
                marginBottom: 12,
              },
              heading2: {
                color: colors.text,
                fontFamily: fontFamilies.figtree.semiBold,
                fontSize: 20,
                marginTop: 20,
                marginBottom: 10,
              },
              heading3: {
                color: colors.text,
                fontFamily: fontFamilies.figtree.semiBold,
                fontSize: 16,
                marginTop: 16,
                marginBottom: 8,
              },
              paragraph: {
                color: colors.text,
                marginBottom: 12,
              },
              listItem: {
                color: colors.text,
                marginBottom: 8,
              },
            }}
          >
            {privacyPolicyContent}
          </Markdown>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
  },
  markdownContainer: {
    padding: 20,
    borderRadius: 12,
  },
});
