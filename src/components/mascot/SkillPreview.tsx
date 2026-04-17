import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, textStyles } from '@/design-system';
import { Icon } from '../ui/Icon';
import { FormattedText } from '../ui/FormattedText';

type SkillPreviewProps = {
  skillLabel: string;
  skillPromptPreview: string;
  isFullAccess?: boolean;
  fullPrompt?: string | null;
  mascotColor?: string;
};

/**
 * SkillPreview — shows DB skill text. If `fullPrompt` is present, always show it (tier is gated
 * elsewhere). Lock UI only when there is no full prompt and no elevated access flag.
 */
export function SkillPreview({
  skillLabel,
  skillPromptPreview,
  isFullAccess = false,
  fullPrompt,
  mascotColor,
}: SkillPreviewProps) {
  const { colors } = useTheme();

  const fallbackPreview = `Use ${skillLabel.toLowerCase()} to get a guided response with clear, practical next steps.`;
  const normalizedFullPrompt = fullPrompt?.trim() || '';
  const normalizedPreview = skillPromptPreview?.trim() || '';
  const hasFullPromptText = !!normalizedFullPrompt;
  const showUnlocked = isFullAccess || hasFullPromptText;
  const displayText = hasFullPromptText
    ? normalizedFullPrompt
    : normalizedPreview || fallbackPreview;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      {/* Header with skill label and lock icon */}
      <View style={styles.header}>
        <Text
          style={[
            styles.skillLabel,
            {
              fontFamily: textStyles.h3.fontFamily,
              fontSize: textStyles.h3.fontSize,
              color: colors.text,
            },
          ]}
        >
          {skillLabel}
        </Text>
        {!showUnlocked && (
          <View style={[styles.lockBadge, { backgroundColor: colors.outline }]}>
            <Icon name="lock" size={14} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Prompt content – capped height with fade so cards stay compact */}
      <View style={[styles.contentContainer, showUnlocked && styles.contentContainerFull]}>
        <FormattedText
          style={{
            fontFamily: textStyles.body.fontFamily,
            fontSize: textStyles.body.fontSize,
            lineHeight: textStyles.body.lineHeight,
          }}
          baseColor={colors.text}
        >
          {showUnlocked
            ? (displayText || '').split('\n').slice(0, 12).join('\n')
            : (displayText || '').split('\n').slice(0, 8).join('\n')}
        </FormattedText>

        {/* Fade overlay – always shown to indicate there's more content */}
        <LinearGradient
          colors={['transparent', colors.surface]}
          style={[styles.fadeOverlay, { pointerEvents: 'none' }]}
        />
      </View>

      {/* Lock message only when we truly have no full prompt text */}
      {!showUnlocked && (
        <View style={[styles.lockMessage, { borderTopColor: colors.outline }]}>
          <Icon name="lock" size={16} color={colors.textMuted} />
          <Text
            style={[
              styles.lockText,
              {
                fontFamily: textStyles.body.fontFamily,
                fontSize: textStyles.body.fontSize,
                color: colors.textMuted,
              },
            ]}
          >
            Full prompt available for mascot owners
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  skillLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  lockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingBottom: 16,
    minHeight: 60,
    maxHeight: 160,
    overflow: 'hidden',
  },
  contentContainerFull: {
    maxHeight: 220,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 20,
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  lockMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  lockText: {
    fontSize: 13,
  },
});
