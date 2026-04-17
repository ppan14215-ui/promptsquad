import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ImageSourcePropType, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, textStyles, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { useI18n } from '@/i18n';
import { IconButton } from '@/components/ui/IconButton';
import { TextButton } from '@/components/ui/TextButton';
import { MediumDarkButton } from '@/components/ui/MediumDarkButton';
import { MiniButton } from '@/components/ui/MiniButton';
import {
  SkillPillWithTooltip,
  getSkillTooltipTextFromSummaryFields,
} from '@/components/ui/SkillPillWithTooltip';
import { ModelPillRow } from '@/components/ui/ModelPillRow';
import { defaultModelPillLabelsFromSkills } from '@/lib/default-model-pills';
import { fallbackShortBioFromSkills } from '@/lib/mascot-short-bio';
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
  /** Skill settings: preferred LLM (`mascot_skills.preferred_provider`). */
  preferredProvider?: string | null;
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

  const fallbackSkillBio = useMemo(
    () => fallbackShortBioFromSkills(name, displaySkills),
    [displaySkills, name]
  );

  const defaultModelLabels = useMemo(
    () => defaultModelPillLabelsFromSkills(displaySkills, models ?? []),
    [displaySkills, models]
  );

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
        {t.mascot.defaultModels}
      </Text>
      <ModelPillRow labels={defaultModelLabels} compact />
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
          displaySkills.map((skill) => (
            <SkillPillWithTooltip
              key={skill.id}
              skillId={skill.id}
              label={skill.label}
              tooltipText={getSkillTooltipTextFromSummaryFields(skill)}
              onPress={() => onSkillPress?.(skill)}
              hoveredSkillId={hoveredSkill}
              onHoveredSkillChange={setHoveredSkill}
            />
          ))
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
            priority="high"
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
    alignItems: 'flex-end',
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
});

export default MascotDetails;

