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
import { useMascotLike } from '@/services/mascot-likes';
// import { useMascotSkills } from '@/services/admin';

export type MascotDetailsVariant = 'available' | 'locked';

export type Skill = {
  id: string;
  label: string;
  prompt?: string;
};

export type MascotDetailsProps = {
  name: string;
  subtitle: string;
  imageSource: ImageSourcePropType;
  personality: string[];
  models: string[];
  skills: Skill[];
  variant?: MascotDetailsVariant;
  mascotId?: string | null; // Mascot ID for like system
  isPro?: boolean; // True if mascot is exclusively for pro subscription
  onClose?: () => void;
  onStartChat?: () => void;
  onTryOut?: () => void;
  onUnlock?: () => void;
  onSkillPress?: (skill: Skill) => void;
};

export function MascotDetails({
  name,
  subtitle,
  imageSource,
  personality,
  models,
  skills,
  variant = 'available',
  mascotId,
  isPro = false,
  onClose,
  onStartChat,
  onTryOut,
  onUnlock,
  onSkillPress,
}: MascotDetailsProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const isLocked = variant === 'locked';
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  // Use shared like system if mascotId is provided
  const { isLiked, likeCount, toggleLike, isToggling } = useMascotLike(mascotId || null);

  // Use passed skills directly
  const displaySkills = skills;
  const isLoadingSkills = false;

  // Shadow for header
  const headerShadowStyle = Platform.select({
    web: { boxShadow: shadowToCSS('xs') } as unknown as object,
    default: shadowToNative('xs'),
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          </View>
          <IconButton
            iconName="close"
            onPress={onClose}
          />
        </View>

        {/* Title and Subtitle */}
        <View style={styles.titleContainer}>
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
            style={[
              styles.mascotImage,
              isLocked && styles.mascotImageLocked,
              isLocked && Platform.OS === 'web' && { filter: 'grayscale(100%)' } as any,
              // On native, use opacity for locked state
              isLocked && Platform.OS !== 'web' && { opacity: 0.6 },
            ]}
            contentFit="cover"
            transition={200}
          />
        </View>

        {/* Unlock Button for Locked State */}
        {isLocked && (
          <View style={styles.unlockButtonContainer}>
            <MiniButton
              label={isPro ? t.mascot.unlockFor : t.mascot.unlockForFree}
              onPress={onUnlock}
            />
          </View>
        )}
      </View>

      {/* Content Section */}
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
        {/* Personality Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: colors.text,
              },
            ]}
          >
            {t.mascot.personality}
          </Text>
          <View style={styles.tagsRow}>
            {personality.map((trait, index) => (
              <ColoredTab
                key={index}
                label={trait}
                forceState="default"
              />
            ))}
          </View>
        </View>

        {/* Used Models Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: colors.text,
              },
            ]}
          >
            {t.mascot.usedModels}
          </Text>
          <View style={styles.tagsRow}>
            {models.map((model, index) => (
              <ColoredTab
                key={index}
                label={model}
                forceState="default"
              />
            ))}
          </View>
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: colors.text,
              },
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
                const showTooltip = isActive && !!skill.prompt;

                return (
                  <View key={skill.id} style={{ position: 'relative', alignItems: 'center', zIndex: isActive ? 100 : 1 }}>
                    {/* Tooltip Bubble */}
                    {showTooltip && (
                      <View style={[styles.tooltipContainer, { backgroundColor: '#1A1A1A' }]}>
                        <Text style={styles.tooltipText} numberOfLines={4}>
                          {skill.prompt}
                        </Text>
                        {/* Arrow */}
                        <View style={[styles.tooltipArrow, { borderTopColor: '#1A1A1A' }]} />
                      </View>
                    )}

                    <LinkPill
                      label={skill.label}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          // Mobile: First tap shows tooltip, second tap executes
                          if (isActive) {
                            onSkillPress?.(skill);
                          } else {
                            setHoveredSkill(skill.id);
                          }
                        } else {
                          // Web: click always executes
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
            {/* Show message if no skills found */}
            {!isLoadingSkills && displaySkills.length === 0 && (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                No skills available
              </Text>
            )}
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaContainer}>
          {isLocked ? (
            <TextButton
              label={t.mascot.tryOut}
              onPress={onTryOut}
            />
          ) : (
            <MediumDarkButton
              label={t.mascot.startChatting}
              onPress={onStartChat}
              fullWidth
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = 356;
const HEADER_HEIGHT = 257;
const IMAGE_SIZE = 160;

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'visible', // Allow image to be visible on mobile
  },
  header: {
    height: HEADER_HEIGHT,
    paddingTop: 24,
    paddingHorizontal: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: Platform.OS === 'web' ? 1 : 0, // No border on mobile
    borderBottomWidth: 0,
    alignItems: 'center',
    overflow: 'visible', // Allow image to be visible
    position: 'relative', // Ensure proper positioning context
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
    borderWidth: Platform.OS === 'web' ? 1 : 0, // No border on mobile
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    maxHeight: Platform.OS === 'web' ? 500 : undefined, // Max height on web to ensure modal fits
  },
  contentInner: {
    paddingTop: 24,
    paddingBottom: 24, // Increased padding to ensure button is visible
    paddingHorizontal: 24,
    gap: 24,
    flexGrow: 1, // Ensure content can grow
  },
  section: {
    alignItems: 'center',
    gap: 4,
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
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  ctaContainer: {
    alignItems: 'center',
    marginTop: 8,
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

