import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ImageSourcePropType, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, textStyles, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { useI18n } from '@/i18n';
import { IconButton } from '@/components/ui/IconButton';
import { TextButton } from '@/components/ui/TextButton';
import { MediumDarkButton } from '@/components/ui/MediumDarkButton';
import { MiniButton } from '@/components/ui/MiniButton';
import { LinkPill } from '@/components/ui/LinkPill';
import { ColoredTab } from '@/components/ui/ColoredTab';
import { AI_MODEL_DISPLAY } from '@/constants/ai-models';
import { useMascotLike } from '@/services/mascot-likes';
// import { useMascotSkills } from '@/services/admin';

export type MascotDetailsVariant = 'available' | 'locked';

export type Skill = {
  id: string;
  label: string;
  prompt?: string;
  /** Admin-set short line for cards (maps to `skill_summary` in DB). */
  summary?: string;
  /** DB preview snippet when full prompt is unavailable (e.g. masked). */
  promptPreview?: string;
};

export type MascotDetailsProps = {
  name: string;
  subtitle: string;
  imageSource: ImageSourcePropType;
  personality: string[];
  models: string[];
  skills: Skill[];
  customBio?: string;
  variant?: MascotDetailsVariant;
  mascotId?: string | null; // Mascot ID for like system
  isPro?: boolean; // True if mascot is exclusively for pro subscription
  onClose?: () => void;
  onStartChat?: () => void;
  onTryOut?: () => void;
  onUnlock?: () => void;
  onSkillPress?: (skill: Skill) => void;
  isCustom?: boolean;
  onDelete?: () => void;
  /** Disable like count/query for lightweight rendering contexts (e.g. background deck cards). */
  enableLikes?: boolean;
  /** When set, the card fills this height exactly and the content section stretches. */
  fixedHeight?: number;
};

export function MascotDetails({
  name,
  subtitle,
  imageSource,
  models,
  skills,
  customBio,
  variant = 'available',
  mascotId,
  isPro = false,
  onClose,
  onStartChat,
  onTryOut,
  onUnlock,
  onSkillPress,
  isCustom,
  onDelete,
  enableLikes = true,
  fixedHeight,
}: MascotDetailsProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const isLocked = variant === 'locked';
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  // Use shared like system if mascotId is provided
  const { isLiked, likeCount, toggleLike, isToggling } = useMascotLike(enableLikes ? mascotId || null : null);

  // Cap at 4 skills to avoid overflow on the card
  const displaySkills = skills.slice(0, 4);
  const isLoadingSkills = false;

  const fallbackSkillBio = useMemo(() => {
    if (!displaySkills.length) {
      return `${name} can help with a wide range of everyday tasks and conversations.`;
    }

    const labels = displaySkills
      .map((skill) => skill.label?.trim())
      .filter((label): label is string => !!label);

    if (!labels.length) {
      return `${name} helps with tailored tasks based on your selected goals.`;
    }

    if (labels.length === 1) {
      return `${name} specializes in ${labels[0].toLowerCase()} and gives focused, practical support.`;
    }

    const primary = labels.slice(0, 3);
    const listText =
      primary.length === 2
        ? `${primary[0]} and ${primary[1]}`
        : `${primary[0]}, ${primary[1]}, and ${primary[2]}`;
    const suffix = labels.length > 3 ? ', plus additional related workflows' : '';

    return `${name} helps with ${listText.toLowerCase()}${suffix}, so you can move from ideas to clear outcomes faster.`;
  }, [displaySkills, name]);

  const bestModels = useMemo(() => {
    const text = `${name} ${subtitle} ${displaySkills.map((skill) => `${skill.label} ${skill.prompt || ''}`).join(' ')}`.toLowerCase();

    if (
      text.includes('write') ||
      text.includes('writing') ||
      text.includes('blog') ||
      text.includes('copy') ||
      text.includes('email') ||
      text.includes('story') ||
      text.includes('translate') ||
      text.includes('editor')
    ) {
      return [AI_MODEL_DISPLAY.chipClaude, AI_MODEL_DISPLAY.chipGemini];
    }

    if (
      text.includes('code') ||
      text.includes('debug') ||
      text.includes('developer') ||
      text.includes('api') ||
      text.includes('architecture') ||
      text.includes('program')
    ) {
      return [AI_MODEL_DISPLAY.chipOpenai, AI_MODEL_DISPLAY.chipClaude];
    }

    if (
      text.includes('research') ||
      text.includes('analysis') ||
      text.includes('market') ||
      text.includes('data') ||
      text.includes('strategy') ||
      text.includes('report')
    ) {
      return [AI_MODEL_DISPLAY.chipOpenai, AI_MODEL_DISPLAY.chipPerplexity];
    }

    if (
      text.includes('support') ||
      text.includes('coaching') ||
      text.includes('conversation') ||
      text.includes('advice') ||
      text.includes('interview')
    ) {
      return [AI_MODEL_DISPLAY.chipGemini, AI_MODEL_DISPLAY.chipClaude];
    }

    if (models?.length) {
      return models.slice(0, 2);
    }

    return [AI_MODEL_DISPLAY.chipGemini, AI_MODEL_DISPLAY.chipOpenai];
  }, [displaySkills, models, name, subtitle]);

  // Shadow for header
  const headerShadowStyle = Platform.select({
    web: { boxShadow: shadowToCSS('xs') } as unknown as object,
    default: shadowToNative('xs'),
  });

  // ── Shared content sections (used by both fixed and scrollable layouts) ──

  const bioSection = (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
        ]}
      >
        Short bio
      </Text>
      <Text
        style={[
          styles.bioText,
          { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular },
        ]}
        numberOfLines={4}
      >
        {customBio?.trim() || fallbackSkillBio}
      </Text>
    </View>
  );

  const modelsSection = (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
        ]}
      >
        Best models
      </Text>
      <View style={styles.tagsRow}>
        {bestModels.map((model, index) => (
          <ColoredTab key={index} label={model} forceState="default" />
        ))}
      </View>
    </View>
  );

  const skillsSection = (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
        ]}
      >
        {t.mascot.skills}
      </Text>
      <View style={styles.skillsRow}>
        {isLoadingSkills && displaySkills.length === 0 ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          displaySkills.map((skill) => {
            const isActive = hoveredSkill === skill.id;
            const tooltipPreview =
              skill.summary?.trim() ||
              skill.promptPreview?.trim() ||
              skill.prompt?.trim() ||
              '';
            const showTooltip = isActive && !!tooltipPreview;
            return (
              <View key={skill.id} style={{ position: 'relative', alignItems: 'center', zIndex: isActive ? 100 : 1 }}>
                {showTooltip && (
                  <View style={[styles.tooltipContainer, { backgroundColor: '#1A1A1A' }]}>
                    <Text style={styles.tooltipText} numberOfLines={4}>{tooltipPreview}</Text>
                    <View style={[styles.tooltipArrow, { borderTopColor: '#1A1A1A' }]} />
                  </View>
                )}
                <LinkPill
                  label={skill.label}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      if (isActive) { onSkillPress?.(skill); } else { setHoveredSkill(skill.id); }
                    } else {
                      onSkillPress?.(skill);
                    }
                  }}
                  onHoverIn={() => setHoveredSkill(skill.id)}
                  onHoverOut={() => setHoveredSkill(null)}
                  forceState={isActive ? 'hover' : undefined}
                />
              </View>
            );
          })
        )}
        {!isLoadingSkills && displaySkills.length === 0 && (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>No skills available</Text>
        )}
      </View>
    </View>
  );

  const ctaSection = (
    <View style={styles.ctaContainer}>
      {isLocked ? (
        <TextButton label={t.mascot.tryOut} onPress={onTryOut} />
      ) : (
        <MediumDarkButton label={t.mascot.startChatting} onPress={onStartChat} fullWidth />
      )}
      {onDelete && (
        <View style={{ marginTop: 16 }}>
          <TextButton label="Delete Mascot" onPress={onDelete} color="#FF3B30" />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, fixedHeight ? { height: fixedHeight, width: '100%' } : undefined]}>
      {/* Header Section */}
      <View
        style={[
          styles.header,
          headerShadowStyle,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outline,
          },
        ]}
      >
        {/* Top Row with Icon Buttons */}
        <View style={styles.topRow}>
          <View style={styles.favoriteContainer}>
            {enableLikes ? (
              <>
                <IconButton
                  iconName="favourite"
                  isSelected={isLiked}
                  onPress={toggleLike}
                  disabled={isToggling}
                />
                {likeCount > 0 && (
                  <Text
                    style={[
                      styles.likeCount,
                      {
                        fontFamily: fontFamilies.figtree.medium,
                        color: colors.textMuted,
                      },
                    ]}
                  >
                    {likeCount}
                  </Text>
                )}
              </>
            ) : null}
          </View>
          {onClose ? (
            <IconButton
              iconName="close"
              onPress={onClose}
            />
          ) : null}
        </View>

        {/* Title and Subtitle */}
        <View style={styles.titleContainer}>
          {isCustom && (
            <View style={{
              backgroundColor: colors.primary + '20',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 4,
              marginBottom: 4,
            }}>
              <Text style={{
                color: colors.primary,
                fontSize: 10,
                fontFamily: fontFamilies.figtree.semiBold,
                letterSpacing: 0.5,
              }}>
                CUSTOM
              </Text>
            </View>
          )}
          <Text
            style={[
              styles.title,
              {
                fontFamily: textStyles.cardTitle.fontFamily,
                fontSize: textStyles.cardTitle.fontSize,
                letterSpacing: textStyles.cardTitle.letterSpacing,
                color: colors.text,
              },
            ]}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                fontFamily: textStyles.subtitle.fontFamily,
                fontSize: textStyles.subtitle.fontSize,
                letterSpacing: textStyles.subtitle.letterSpacing,
                color: colors.textMuted,
              },
            ]}
          >
            {subtitle}
          </Text>
        </View>

        {/* Mascot Image */}
        <View style={styles.imageContainer}>
          <Image
            source={imageSource}
            recyclingKey={`${mascotId || name}-image`}
            cachePolicy="memory-disk"
            style={[
              styles.mascotImage,
              isLocked && styles.mascotImageLocked,
              isLocked && Platform.OS === 'web' && { filter: 'grayscale(100%)' } as any,
              // On native, use opacity for locked state
              isLocked && Platform.OS !== 'web' && { opacity: 0.6 },
            ]}
            contentFit="cover"
            transition={0}
          />
        </View>

        {/* Unlock Button for Locked State */}
        {isLocked && !fixedHeight && (
          <View style={styles.unlockButtonContainer}>
            <MiniButton
              label={isPro ? t.mascot.unlockFor : t.mascot.unlockForFree}
              onPress={onUnlock}
            />
          </View>
        )}
      </View>

      {/* Content Section – plain View when fixedHeight (button always visible), ScrollView otherwise */}
      {fixedHeight ? (
        <View
          style={[
            styles.contentFixed,
            {
              backgroundColor: colors.background,
              borderColor: colors.outline,
            },
          ]}
        >
          {/* Info group takes remaining space, clips overflow */}
          <View style={styles.infoGroupFixed}>
            {bioSection}
            {modelsSection}
            {skillsSection}
          </View>

          {/* CTA anchored at bottom */}
          {ctaSection}
        </View>
      ) : (
        <ScrollView
          style={[
            styles.content,
            {
              backgroundColor: colors.background,
              borderColor: colors.outline,
            },
          ]}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
          <View style={styles.infoGroup}>
            {bioSection}
            {modelsSection}
            {skillsSection}
          </View>
          {ctaSection}
        </ScrollView>
      )}
    </View>
  );
}

const CARD_WIDTH = 356;
const HEADER_HEIGHT = 257;
const IMAGE_SIZE = 160;

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    borderRadius: 18,
    overflow: 'hidden',
  },
  header: {
    height: HEADER_HEIGHT,
    paddingTop: 24,
    paddingHorizontal: 24,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  imageContainer: {
    position: 'absolute',
    top: 96,
    left: (CARD_WIDTH - IMAGE_SIZE) / 2, // Center horizontally
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 0, // Ensure no border radius issues
  },
  mascotImageLocked: {
    opacity: 1,
  },
  unlockButtonContainer: {
    position: 'absolute',
    bottom: 24,
  },
  content: {
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    maxHeight: Platform.OS === 'web' ? 500 : undefined,
  },
  contentInner: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 24,
    flexGrow: 1,
  },
  /* Fixed-height variant: plain View, no scroll, button always at bottom */
  contentFixed: {
    flex: 1,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  infoGroupFixed: {
    flex: 1,
    gap: 22,
    marginBottom: 16,
  },
  infoGroup: {
    gap: 24,
  },
  section: {
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 6,
  },
  ctaContainer: {
    alignItems: 'center',
    minHeight: 48,
  },
  favoriteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    lineHeight: 16,
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 8,
    width: 220, // Tooltip width
    borderRadius: 8,
    padding: 12,
    zIndex: 1000,
    // Add shadow
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' } as any,
      default: { elevation: 5 },
    }),
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6, // Center
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    // Border top color set in component
  },
});

export default MascotDetails;

