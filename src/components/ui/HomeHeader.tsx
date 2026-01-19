import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinkPill } from '@/components';
import { useTheme, fontFamilies } from '@/design-system';
import type { Skill } from '@/components';

export type HomeHeaderProps = {
  userName: string;
  questionPrompt: string;
  skills: Skill[];
  onSkillPress: (skill: Skill) => void;
  keyboardVisible?: boolean;
  skillsLoading?: boolean;
  isDesktop?: boolean;
};

export function HomeHeader({
  userName,
  questionPrompt,
  skills,
  onSkillPress,
  keyboardVisible = false,
  skillsLoading = false,
  isDesktop = false,
}: HomeHeaderProps) {
  const { colors } = useTheme();

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
                },
              ]}
            >
              {questionPrompt}
            </Text>
          </View>
        )}

        {!keyboardVisible && (
          <View style={styles.skillPills}>
            {skillsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              skills.map((skill) => (
                <LinkPill key={skill.id} label={skill.label} onPress={() => onSkillPress(skill)} />
              ))
            )}
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
    fontSize: 18,
    lineHeight: 18 * 1.3,
  },
  questionPrompt: {
    fontSize: 28,
    lineHeight: 36,
  },
  skillPills: {
    marginTop: 16,
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
