import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, fontFamilies, textStyles } from '@/design-system';
import { Icon } from '../ui/Icon';

type SkillPreviewProps = {
  skillLabel: string;
  skillPromptPreview: string;
  isFullAccess?: boolean;
  fullPrompt?: string | null;
  mascotColor?: string;
};

/**
 * SkillPreview Component
 * 
 * Displays a skill with its prompt preview.
 * - For admins: Shows full prompt without fade
 * - For regular users: Shows 25% preview with fade effect and lock icon
 */
export function SkillPreview({
  skillLabel,
  skillPromptPreview,
  isFullAccess = false,
  fullPrompt,
  mascotColor,
}: SkillPreviewProps) {
  const { colors } = useTheme();

  // Display full prompt for admins, preview for regular users
  const displayText = isFullAccess && fullPrompt ? fullPrompt : skillPromptPreview;

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
              color: mascotColor || colors.text,
            },
          ]}
        >
          {skillLabel}
        </Text>
        {!isFullAccess && (
          <View style={[styles.lockBadge, { backgroundColor: colors.outline }]}>
            <Icon name="lock" size={14} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Prompt content with fade effect for non-admins */}
      <View style={styles.contentContainer}>
        <Text
          style={[
            styles.promptText,
            {
              fontFamily: textStyles.body.fontFamily,
              fontSize: textStyles.body.fontSize,
              lineHeight: textStyles.body.lineHeight,
              color: colors.text, // Use theme text color
            },
          ]}
          numberOfLines={isFullAccess ? undefined : 8}
        >
          {displayText}
        </Text>

        {/* Fade overlay for non-admins */}
        {!isFullAccess && (
          <LinearGradient
            colors={[
              'transparent',
              colors.surface,
            ]}
            style={[styles.fadeOverlay, { pointerEvents: 'none' }]}
          />
        )}
      </View>

      {/* Lock message for non-admins */}
      {!isFullAccess && (
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
    paddingBottom: 8,
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
    minHeight: 100,
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
