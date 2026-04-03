import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ImageSourcePropType, Pressable, Text, ScrollView, Platform } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { Icon, MediumDarkButton } from '@/components';
import { ProBadge } from '@/components/ui/ProBadge';
import { MascotDetails, type Skill } from './MascotDetails';

type FlippableCardProps = {
  id: string;
  name: string;
  subtitle: string;
  imageSource: ImageSourcePropType;
  color: string;
  skills: Skill[];
  models: string[];
  customBio?: string | null;
  isCustom?: boolean;
  isPro?: boolean;
  isLocked?: boolean;
  isComingSoon?: boolean;
  isFlipped: boolean;
  width: number;
  height: number;
  showFlipHint?: boolean;
  onToggleFlip: () => void;
  onStartChat: () => void;
  onSkillPress: (skill: Skill) => void;
  enableLikes?: boolean;
};

const MAX_DISPLAY_SKILLS = 4;

function shortenToSeventyFivePercent(text: string) {
  const clean = text.trim();
  if (!clean) return '';
  const keep = Math.max(40, Math.floor(clean.length * 0.75));
  if (clean.length <= keep) return clean;
  return `${clean.slice(0, keep).trimEnd()}...`;
}

export function FlippableCard({
  id,
  name,
  subtitle,
  imageSource,
  skills,
  models,
  customBio,
  isCustom,
  isPro,
  isLocked,
  isComingSoon,
  isFlipped,
  width,
  height,
  showFlipHint = false,
  onToggleFlip,
  onStartChat,
  onSkillPress,
  enableLikes = true,
}: FlippableCardProps) {
  const { colors } = useTheme();
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(skills[0]?.id ?? null);
  const progress = useSharedValue(isFlipped ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isFlipped ? 1 : 0, { duration: 300 });
  }, [isFlipped, progress]);

  useEffect(() => {
    if (!skills.length) {
      setSelectedSkillId(null);
      return;
    }
    if (!selectedSkillId || !skills.some((skill) => skill.id === selectedSkillId)) {
      setSelectedSkillId(skills[0].id);
    }
  }, [selectedSkillId, skills]);

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) || skills[0] || null,
    [selectedSkillId, skills]
  );

  const previewText = useMemo(() => {
    if (!selectedSkill?.prompt) {
      return 'This skill helps you start quickly with guided prompts and practical output. Tap Start chatting to continue.';
    }
    return shortenToSeventyFivePercent(selectedSkill.prompt);
  }, [selectedSkill?.prompt]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(progress.value, [0, 0.5], [0, 90], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, [0.49, 0.5], [1, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(progress.value, [0.5, 1], [-90, 0], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, [0.5, 0.51], [0, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const cardShadow = Platform.select({
    web: { boxShadow: shadowToCSS('md') } as unknown as object,
    default: shadowToNative('md'),
  });

  return (
    <View style={[styles.cardFrame, { width, height }, cardShadow]}>
      <View pointerEvents="none" style={[styles.frameOutline, { borderColor: colors.outline }]} />

      {/* Pro / Custom badge in top right */}
      {!isComingSoon && (isCustom || isPro) && (
        <ProBadge
          style={[styles.badgeTopRight, { zIndex: 25 }]}
          color={isCustom ? colors.teal : colors.primary}
          label={isCustom ? 'CUSTOM' : 'PRO'}
        />
      )}
      {/* ── Front face: native MascotDetails at 356px, no scaling ── */}
      <Animated.View pointerEvents={isFlipped ? 'none' : 'auto'} style={[styles.face, frontStyle]}>
        <MascotDetails
          name={name}
          subtitle={subtitle}
          imageSource={imageSource}
          personality={[]}
          models={models}
          skills={skills.slice(0, MAX_DISPLAY_SKILLS)}
          customBio={customBio || undefined}
          variant={isLocked ? 'locked' : 'available'}
          mascotId={id}
          isPro={!!isPro}
          isCustom={isCustom}
          onClose={undefined}
          onStartChat={onStartChat}
          onTryOut={onStartChat}
          onUnlock={onStartChat}
          onSkillPress={onSkillPress}
          enableLikes={enableLikes}
          fixedHeight={height}
        />
      </Animated.View>

      {/* Flip indicator – right edge, vertically centered */}
      {showFlipHint && !isComingSoon && (
        <View style={styles.flipBadgeWrap} pointerEvents="box-none">
          <Pressable
            onPress={onToggleFlip}
            style={[styles.flipHintBadge, { backgroundColor: `${colors.background}F2`, borderColor: colors.outline }]}
          >
            <Icon name="arrow-up-right" size={12} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* ── Back face: skill tabs + preview ── */}
      <Animated.View
        pointerEvents={isFlipped ? 'auto' : 'none'}
        style={[
          styles.face,
          backStyle,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.backTop, { backgroundColor: colors.surface }]}>
          <View style={styles.backTopHeader}>
            <Text style={[styles.backTitle, { color: colors.text }]} numberOfLines={1}>{name}</Text>
            <Pressable
              onPress={onToggleFlip}
              hitSlop={12}
              style={[styles.flipBackBtn, { backgroundColor: `${colors.background}D9`, borderColor: colors.outline }]}
            >
              <Icon name="close" size={14} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {skills.slice(0, MAX_DISPLAY_SKILLS).map((skill) => {
              const active = selectedSkillId === skill.id;
              return (
                <Pressable
                  key={skill.id}
                  onPress={() => setSelectedSkillId(skill.id)}
                  style={[
                    styles.skillTab,
                    {
                      backgroundColor: active ? colors.primary : `${colors.background}D9`,
                      borderColor: active ? colors.primary : colors.outline,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.skillTabText,
                      { color: active ? colors.buttonText : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {skill.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.previewArea, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewContent}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>Skill preview</Text>
            <Text style={[styles.previewText, { color: colors.textMuted }]}>{previewText}</Text>
          </ScrollView>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', colors.background]}
            style={styles.fadeMask}
          />
        </View>

        <View style={[styles.backActions, { backgroundColor: colors.background }]}>
          <MediumDarkButton
            label={isLocked ? 'Unlock to chat' : 'Start chatting'}
            onPress={() => {
              if (selectedSkill) {
                onSkillPress(selectedSkill);
              } else {
                onStartChat();
              }
            }}
            fullWidth
            disabled={!!isComingSoon}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardFrame: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
  },
  frameOutline: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  badgeTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    overflow: 'hidden',
  },
  flipBadgeWrap: {
    position: 'absolute',
    right: -18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 10,
  },
  flipHintBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  backTop: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  backTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  flipBackBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.figtree.semiBold,
    flex: 1,
    marginRight: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  skillTab: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 72,
    maxWidth: 160,
  },
  skillTabText: {
    fontSize: 12,
    fontFamily: fontFamilies.figtree.medium,
  },
  previewArea: {
    flex: 1,
    position: 'relative',
  },
  previewContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingBottom: 42,
  },
  previewTitle: {
    fontSize: 13,
    fontFamily: fontFamilies.figtree.semiBold,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fontFamilies.figtree.regular,
  },
  fadeMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 46,
  },
  backActions: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
});

export default FlippableCard;
