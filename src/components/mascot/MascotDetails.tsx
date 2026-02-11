import React, { useEffect, useMemo, useState } from 'react';
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
import { secureChat } from '@/services/ai/secure-chat';
// import { useMascotSkills } from '@/services/admin';

const skillBioCache = new Map<string, string>();

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
  const [aiSkillBio, setAiSkillBio] = useState<string | null>(null);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);

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

  const skillFingerprint = useMemo(
    () => displaySkills.map((skill) => `${skill.label}::${skill.prompt || ''}`).join('||'),
    [displaySkills]
  );

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
      return ['Claude 4.5', 'Gemini 3'];
    }

    if (
      text.includes('code') ||
      text.includes('debug') ||
      text.includes('developer') ||
      text.includes('api') ||
      text.includes('architecture') ||
      text.includes('program')
    ) {
      return ['OpenAI GPT-5.2', 'Claude 4.5'];
    }

    if (
      text.includes('research') ||
      text.includes('analysis') ||
      text.includes('market') ||
      text.includes('data') ||
      text.includes('strategy') ||
      text.includes('report')
    ) {
      return ['OpenAI GPT-5.2', 'Perplexity Sonar'];
    }

    if (
      text.includes('support') ||
      text.includes('coaching') ||
      text.includes('conversation') ||
      text.includes('advice') ||
      text.includes('interview')
    ) {
      return ['Gemini 3', 'Claude 4.5'];
    }

    if (models?.length) {
      return models.slice(0, 2);
    }

    return ['Gemini 3', 'OpenAI GPT-5.2'];
  }, [displaySkills, models, name, subtitle]);

  useEffect(() => {
    let isActive = true;

    async function generateBioFromSkills() {
      const cacheKey = `${mascotId || name}::${skillFingerprint}`;
      const manualCustomBio = customBio?.trim();

      if (isCustom && manualCustomBio) {
        setAiSkillBio(null);
        return;
      }

      if (skillBioCache.has(cacheKey)) {
        setAiSkillBio(skillBioCache.get(cacheKey) || null);
        return;
      }

      if (!mascotId || !displaySkills.length) {
        setAiSkillBio(null);
        return;
      }

      try {
        setIsGeneratingBio(true);
        const skillContext = displaySkills
          .map((skill, index) => {
            const detail = skill.prompt?.trim() || `Intent: ${skill.label}`;
            return `${index + 1}. ${skill.label}: ${detail}`;
          })
          .join('\n');

        const summaryResponse = await secureChat(
          mascotId,
          [
            {
              role: 'user',
              content: `Read all skills and their intent details. Write one concise summary sentence (max 28 words) that synthesizes the overall intent. Do not copy phrases verbatim from any single prompt. No bullets, no markdown.\n\nMascot: ${name}\nRole: ${subtitle}\nSkills:\n${skillContext}`,
            },
          ],
          undefined,
          undefined,
          'claude'
        );

        const cleanSummary = summaryResponse.content
          ?.replace(/\s+/g, ' ')
          .replace(/[*_`#>-]/g, '')
          .trim();

        if (isActive && cleanSummary) {
          skillBioCache.set(cacheKey, cleanSummary);
          setAiSkillBio(cleanSummary);
        }
      } catch {
        if (isActive) {
          setAiSkillBio(null);
        }
      } finally {
        if (isActive) {
          setIsGeneratingBio(false);
        }
      }
    }

    generateBioFromSkills();

    return () => {
      isActive = false;
    };
  }, [customBio, displaySkills, isCustom, mascotId, name, skillFingerprint, subtitle]);

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
        {/* Bio Section */}
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
            Bio
          </Text>
          <Text
            style={[
              styles.bioText,
              {
                color: colors.textMuted,
                fontFamily: fontFamilies.figtree.regular,
              },
            ]}
            numberOfLines={4}
          >
            {(isCustom && customBio?.trim()) || aiSkillBio || fallbackSkillBio}
          </Text>
          {isGeneratingBio && !aiSkillBio && (
            <Text
              style={[
                styles.bioHelperText,
                { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular },
              ]}
            >
              Updating summary...
            </Text>
          )}
        </View>

        {/* Best Models Section */}
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
            Best models
          </Text>
          <View style={styles.tagsRow}>
            {bestModels.map((model, index) => (
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

          {/* Delete Button (if allowed) */}
          {onDelete && (
            <View style={{ marginTop: 16 }}>
              <TextButton
                label="Delete Mascot"
                onPress={onDelete}
                color={'#FF3B30'} // Red color for delete
              />
            </View>
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
  bioText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  bioHelperText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    textAlign: 'center',
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

