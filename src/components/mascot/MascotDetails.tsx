import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Platform, ImageSourcePropType } from 'react-native';
import { useTheme, textStyles, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { useI18n } from '@/i18n';
import { IconButton, TextButton, MediumDarkButton, MiniButton, LinkPill, ColoredTab } from '@/components';

export type MascotDetailsVariant = 'available' | 'locked';

export type Skill = {
  id: string;
  label: string;
};

export type MascotDetailsProps = {
  name: string;
  subtitle: string;
  imageSource: ImageSourcePropType;
  personality: string[];
  models: string[];
  skills: Skill[];
  variant?: MascotDetailsVariant;
  isFavorite?: boolean;
  onClose?: () => void;
  onFavorite?: () => void;
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
  isFavorite = false,
  onClose,
  onFavorite,
  onStartChat,
  onTryOut,
  onUnlock,
  onSkillPress,
}: MascotDetailsProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const isLocked = variant === 'locked';

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
          <IconButton
            iconName="favourite"
            isSelected={isFavorite}
            onPress={onFavorite}
          />
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
            ]}
            resizeMode="cover"
          />
          {isLocked && Platform.OS !== 'web' && <View style={styles.grayscaleOverlay} />}
        </View>

        {/* Unlock Button for Locked State */}
        {isLocked && (
          <View style={styles.unlockButtonContainer}>
            <MiniButton
              label={t.mascot.unlockFor}
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
          <View style={styles.skillsColumn}>
            {skills.map((skill) => (
              <LinkPill
                key={skill.id}
                label={skill.label}
                onPress={() => onSkillPress?.(skill)}
              />
            ))}
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
    overflow: 'hidden',
  },
  header: {
    height: HEADER_HEIGHT,
    paddingTop: 24,
    paddingHorizontal: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
    overflow: 'hidden',
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
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  mascotImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  mascotImageLocked: {
    opacity: 1,
  },
  grayscaleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    // Using mix-blend-mode for grayscale on web, opacity overlay on native
    // Less transparent than on cards (0.3 vs 0.5)
    ...(Platform.OS === 'web' ? { mixBlendMode: 'color' } : { opacity: 0.3 }),
  },
  unlockButtonContainer: {
    position: 'absolute',
    bottom: 24,
  },
  content: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  contentInner: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    gap: 24,
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
  skillsColumn: {
    alignItems: 'center',
    gap: 8,
  },
  ctaContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
});

export default MascotDetails;

