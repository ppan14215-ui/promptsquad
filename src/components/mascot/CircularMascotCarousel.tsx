import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, PanResponder, Platform } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';

import type { OwnedMascot } from '@/config/mascots';
import type { MascotColor } from '@/config/mascots';
import { useTheme, fontFamilies, shadowToNative } from '@/design-system';
import { Icon } from '@/components';
import { LinkPill } from '@/components/ui/LinkPill';

export type CircularMascotCarouselProps = {
  mascots: OwnedMascot[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onActiveMascotPress: (mascot: OwnedMascot) => void;
  /** Agents tab: model/personality chips row (overrides mascot defaults). */
  descriptionChipsOverride?: string[];
  /** Agents tab: long bio / intro paragraph (overrides mascot bio). */
  descriptionTextOverride?: string;
  activeNameOverride?: string;
  onSkillTabPress?: (skill: { id: string; label: string; prompt?: string }) => void;
};

type CornerAccent = {
  cornerColor: string;
  cornerTextColor: string;
};

function getAccentForColor(color: MascotColor, fallback: string): CornerAccent {
  // Web version uses red corner color for red/diamond suits.
  // For our mascots, we color corners based on mascot color family.
  switch (color) {
    case 'red':
    case 'pink':
      return { cornerColor: '#b91c1c', cornerTextColor: '#b91c1c' };
    case 'yellow':
      return { cornerColor: '#B45309', cornerTextColor: '#B45309' };
    case 'green':
      return { cornerColor: '#15803D', cornerTextColor: '#15803D' };
    case 'purple':
    case 'darkPurple':
      return { cornerColor: '#4C1D95', cornerTextColor: '#4C1D95' };
    case 'teal':
      return { cornerColor: '#0F766E', cornerTextColor: '#0F766E' };
    case 'orange':
      return { cornerColor: '#C2410C', cornerTextColor: '#C2410C' };
    case 'blue':
      return { cornerColor: '#1D4ED8', cornerTextColor: '#1D4ED8' };
    case 'brown':
      return { cornerColor: '#6B4F2A', cornerTextColor: '#6B4F2A' };
    default:
      return { cornerColor: fallback, cornerTextColor: fallback };
  }
}

function getSuitForColor(color: MascotColor): '♠' | '♥' | '♦' | '♣' {
  // We don't have explicit suits in our data model, so we map mascot color to suits
  // for visual parity with the portfolio carousel.
  switch (color) {
    case 'blue':
    case 'darkPurple':
      return '♠';
    case 'red':
    case 'pink':
      return '♥';
    case 'yellow':
    case 'orange':
      return '♦';
    case 'green':
    case 'teal':
    case 'brown':
    default:
      return '♣';
  }
}

type CardRank = 'A' | 'K' | 'Q' | 'J';
const CARD_MOTION_EASING = Easing.out(Easing.cubic);
const CARD_MOTION_DURATION = 350;
const DESC_FADE_DURATION = 250;
const WEB_HOVER_TRANSITION = Platform.OS === 'web'
  ? ({
      transitionDuration: '150ms',
      transitionTimingFunction: 'ease-out',
      transitionProperty: 'background-color, border-color, color, box-shadow, transform, opacity',
    } as any)
  : {};

export function CircularMascotCarousel({
  mascots,
  activeIndex,
  onActiveIndexChange,
  onActiveMascotPress,
  descriptionChipsOverride,
  descriptionTextOverride,
  activeNameOverride,
  onSkillTabPress,
}: CircularMascotCarouselProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const total = mascots.length;

  const isCompactPhone = width <= 380;
  const isDesktop = width >= 768;

  const cardWidth = useMemo(() => {
    // Match the portfolio reference (208px) on larger screens.
    // Scale down for smaller screens so it still fits.
    if (isCompactPhone) return 150;
    if (isDesktop) return 208;
    return 176;
  }, [isCompactPhone, width]);

  const scaleFactor = cardWidth / 208;
  const cardHeight = Math.round(cardWidth * (291 / 208));
  const borderRadius = 16 * scaleFactor;

  const deckContainerHeight = Math.round(420 * scaleFactor);

  const rootWebGridStyle = useMemo(() => {
    if (Platform.OS !== 'web') return {};
    if (isDesktop) {
      // minmax(0, fr) lets columns shrink so long bio text wraps instead of overlapping the next column.
      return {
        display: 'grid',
        // Two-column desktop: deck on the left, bio + skills stacked on the right.
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)',
        columnGap: 256,
        alignItems: 'start',
        width: '100%',
        minHeight: deckContainerHeight,
        isolation: 'isolate' as any,
      } as any;
    }
    return {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      width: '100%',
    } as any;
  }, [deckContainerHeight, isDesktop]);

  // Slot translations from web CSS (scaled)
  const slot = useMemo(() => {
    const tx = 105 * scaleFactor;
    const yActive = 40 * scaleFactor;
    const yLeft = 20 * scaleFactor;
    const yTop = -75 * scaleFactor;
    const yHoverLeft = 8 * scaleFactor;
    const yHoverTop = -87 * scaleFactor;
    return {
      active: { tx: 0, ty: yActive, sc: 1.08, rot: 0, z: 10, opacity: 1 },
      left: { tx: -tx, ty: yLeft, sc: 0.8, rot: -7, z: 3, opacity: 1 },
      top: { tx: 0, ty: yTop, sc: 0.76, rot: 2, z: 2, opacity: 1 },
      right: { tx: tx, ty: yLeft, sc: 0.8, rot: 7, z: 3, opacity: 1 },
      hoverLeft: { tx: -tx, ty: yHoverLeft, sc: 0.83, rot: -7, z: 3, opacity: 1 },
      hoverTop: { tx: 0, ty: yHoverTop, sc: 0.79, rot: 2, z: 2, opacity: 1 },
      hoverRight: { tx: tx, ty: yHoverLeft, sc: 0.83, rot: 7, z: 3, opacity: 1 },
    };
  }, [scaleFactor]);

  const hoveredIndexSv = useSharedValue(-1);
  const descOpacitySv = useSharedValue(1);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredArrow, setHoveredArrow] = useState<'left' | 'right' | null>(null);
  /** Same skill hover + tooltip as MascotDetails (preview on hover / tap). */
  const [hoveredSkillId, setHoveredSkillId] = useState<string | null>(null);

  const descAnimatedStyle = useAnimatedStyle(() => ({
    opacity: descOpacitySv.value,
    transform: [
      {
        translateY: interpolate(descOpacitySv.value, [0, 1], [8, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  useEffect(() => {
    setHoveredIndex(null);
    setHoveredSkillId(null);
    hoveredIndexSv.value = -1;
    descOpacitySv.value = 0;
    descOpacitySv.value = withTiming(1, {
      duration: DESC_FADE_DURATION,
      easing: CARD_MOTION_EASING,
    });
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hoveredIndexSv.value = hoveredIndex ?? -1;
  }, [hoveredIndex, hoveredIndexSv]);

  const swipeThreshold = 50 * scaleFactor;
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 8;
      },
      onPanResponderRelease: (_e, gestureState) => {
        if (!total) return;
        if (Math.abs(gestureState.dx) <= swipeThreshold) return;
        // Keep arrows + swipe direction consistent with the slot mapping.
        // swipe left  => move forward
        // swipe right => move backward
        if (gestureState.dx < 0) {
          onActiveIndexChange((activeIndex + 1) % total);
        } else {
          onActiveIndexChange((activeIndex + total - 1) % total);
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, onActiveIndexChange, total, swipeThreshold]);

  const activeMascot = mascots[activeIndex] ?? null;

  // Fix the card rank to the mascot itself (so the number doesn't change when the card moves).
  const fixedRankByMascotId = useMemo(() => {
    const ranks: CardRank[] = ['A', 'K', 'Q', 'J'];
    const map = new Map<string, CardRank>();
    mascots.forEach((m, i) => {
      map.set(m.id, ranks[i % ranks.length]);
    });
    return map;
  }, [mascots]);

  const descriptionChips = useMemo(() => {
    if (descriptionChipsOverride) return descriptionChipsOverride;
    if (!activeMascot) return [];
    const techLike = [
      ...(activeMascot.models ?? []),
      ...(activeMascot.personality ?? []).slice(0, 3),
    ];
    return techLike.filter(Boolean).slice(0, 6);
  }, [activeMascot, descriptionChipsOverride]);

  const descriptionText = useMemo(() => {
    if (descriptionTextOverride) return descriptionTextOverride;
    if (!activeMascot) return '';
    return (
      activeMascot.bio ||
      (activeMascot.personality?.length ? activeMascot.personality.join(', ') : '') ||
      activeMascot.questionPrompt ||
      ''
    );
  }, [activeMascot, descriptionTextOverride]);

  const skillTabs = useMemo(() => {
    const skills = activeMascot?.skills ?? [];
    return skills;
  }, [activeMascot]);

  if (!total || !activeMascot) {
    return (
      <View style={styles.empty} />
    );
  }

  const layoutStyles = isDesktop ? styles.layoutDesktop : styles.layoutMobile;
  const narrow = !isDesktop;
  const nativeWide = isDesktop && Platform.OS !== 'web';

  return (
    <View style={[styles.root, Platform.OS !== 'web' ? layoutStyles : null, rootWebGridStyle]}>
      {/* Column 1: circular deck */}
      <View style={[styles.leftCol, narrow && styles.sectionStack, nativeWide && styles.leftColNativeWide]}>
        <View style={styles.deckOuter}>
          <View
            // @ts-expect-error: PanResponder props
            {...panResponder.panHandlers}
            style={[styles.deckContainer, { height: deckContainerHeight }]}
          >
            {/* We render animated cards below (separate loop) to keep hooks valid. */}
            {(() => {
              const wrapIndex = (n: number) => ((n % total) + total) % total;
              const visibleSlots = Math.min(4, total);
              const candidateCards = [
                { slotNumber: 0 as const, cardIndex: wrapIndex(activeIndex) },
                { slotNumber: 1 as const, cardIndex: wrapIndex(activeIndex + 1) },
                { slotNumber: 2 as const, cardIndex: wrapIndex(activeIndex + 2) },
                { slotNumber: 3 as const, cardIndex: wrapIndex(activeIndex - 1) },
              ].filter((c) => c.slotNumber < visibleSlots);

              return candidateCards.map(({ slotNumber, cardIndex }) => {
                const mascot = mascots[cardIndex];
                if (!mascot) return null;

                return (
                  <CircularMascotCard
                    key={`c-${mascot.id}`}
                    mascot={mascot}
                    fixedRank={fixedRankByMascotId.get(mascot.id) ?? 'A'}
                    cardIndex={cardIndex}
                    slotNumber={slotNumber}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    borderRadius={borderRadius}
                    slot={slot}
                    hoveredIndexSv={hoveredIndexSv}
                    setHoveredIndex={setHoveredIndex}
                    hoveredIndex={hoveredIndex}
                    onPress={() => {
                      if (slotNumber === 0) {
                        onActiveMascotPress(mascot);
                      } else {
                        onActiveIndexChange(cardIndex);
                      }
                    }}
                  />
                );
              });
            })()}
          </View>
        </View>

        {/* Arrow buttons below */}
        <View style={styles.arrowRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous agent"
            onPress={() => onActiveIndexChange((activeIndex + total - 1) % total)}
            style={[
              styles.arrowBtn,
              {
                borderColor: hoveredArrow === 'left' ? colors.primary : colors.outline,
                backgroundColor: hoveredArrow === 'left' ? colors.primary : 'transparent',
                ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
                ...(Platform.OS === 'web' ? WEB_HOVER_TRANSITION : null),
              },
            ]}
            {...(Platform.OS === 'web'
              ? {
                  onHoverIn: () => setHoveredArrow('left'),
                  onHoverOut: () => setHoveredArrow(null),
                }
              : {})}
          >
            <Icon
              name="arrow-left"
              size={16}
              color={hoveredArrow === 'left' ? '#FFFFFF' : colors.textMuted}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next agent"
            onPress={() => onActiveIndexChange((activeIndex + 1) % total)}
            style={[
              styles.arrowBtn,
              {
                borderColor: hoveredArrow === 'right' ? colors.primary : colors.outline,
                backgroundColor: hoveredArrow === 'right' ? colors.primary : 'transparent',
                ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
                ...(Platform.OS === 'web' ? WEB_HOVER_TRANSITION : null),
              },
            ]}
            {...(Platform.OS === 'web'
              ? {
                  onHoverIn: () => setHoveredArrow('right'),
                  onHoverOut: () => setHoveredArrow(null),
                }
              : {})}
          >
            <Icon
              name="arrow-right"
              size={16}
              color={hoveredArrow === 'right' ? '#FFFFFF' : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      {/* Right column: name, chips, bio, then compact skill pills (Agents tab) */}
      <View
        style={[
          styles.rightCol,
          narrow && styles.sectionStack,
          nativeWide && styles.rightColNativeWide,
          { backgroundColor: colors.background },
          Platform.OS === 'web' && styles.rightColWeb,
        ]}
      >
        <View style={{ opacity: activeMascot.isComingSoon ? 0.45 : 1 }}>
        <Animated.View style={[styles.descWrap, descAnimatedStyle]}>
          <Text
            style={[
              styles.descName,
              { color: colors.text, fontFamily: fontFamilies.figtree.semiBold },
            ]}
            numberOfLines={2}
          >
            {activeNameOverride ?? activeMascot.name}
          </Text>

          <View style={styles.chipsRow}>
            {descriptionChips.map((chip) => (
              <View
                key={chip}
                style={[
                  styles.chip,
                  { borderColor: colors.outline, backgroundColor: '#FFFFFF' },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.textMuted }]}>{chip}</Text>
              </View>
            ))}
          </View>

          <Text
            style={[
              styles.descText,
              { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular },
              Platform.OS === 'web' && (styles.descTextWeb as any),
            ]}
          >
            {descriptionText}
          </Text>
        </Animated.View>

        <View style={styles.bioToSkills}>
          <View style={styles.skillsPillsRow}>
            {skillTabs.map((skill) => {
              const isActive = hoveredSkillId === skill.id;
              const tooltipPreview =
                skill.summary?.trim() ||
                skill.promptPreview?.trim() ||
                skill.prompt?.trim() ||
                '';
              const showTooltip = isActive && !!tooltipPreview;
              return (
                <View
                  key={skill.id}
                  style={{
                    position: 'relative',
                    alignItems: 'center',
                    zIndex: isActive ? 100 : 1,
                  }}
                >
                  {showTooltip && (
                    <View style={[styles.skillTooltipContainer, { backgroundColor: '#1A1A1A' }]}>
                      <Text style={styles.skillTooltipText} numberOfLines={4}>
                        {tooltipPreview}
                      </Text>
                      <View style={[styles.skillTooltipArrow, { borderTopColor: '#1A1A1A' }]} />
                    </View>
                  )}
                  <LinkPill
                    label={skill.label}
                    forceState={isActive ? 'hover' : undefined}
                    onHoverIn={() => {
                      if (!activeMascot.isComingSoon) setHoveredSkillId(skill.id);
                    }}
                    onHoverOut={() => setHoveredSkillId(null)}
                    onPress={() => {
                      if (activeMascot.isComingSoon) return;
                      if (Platform.OS !== 'web') {
                        if (isActive) onSkillTabPress?.(skill);
                        else setHoveredSkillId(skill.id);
                      } else {
                        onSkillTabPress?.(skill);
                      }
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>
        </View>
      </View>
    </View>
  );
}

function CircularMascotCard({
  mascot,
  fixedRank,
  cardIndex,
  slotNumber,
  cardWidth,
  cardHeight,
  borderRadius,
  slot,
  hoveredIndexSv,
  hoveredIndex,
  setHoveredIndex,
  onPress,
}: {
  mascot: OwnedMascot;
  fixedRank: CardRank;
  cardIndex: number;
  slotNumber: 0 | 1 | 2 | 3;
  cardWidth: number;
  cardHeight: number;
  borderRadius: number;
  slot: any;
  hoveredIndexSv: SharedValue<number>;
  hoveredIndex: number | null;
  setHoveredIndex: (v: number | null) => void;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const rank = fixedRank;
  const suitSymbol = getSuitForColor(mascot.color);
  const isFrontSlot = slotNumber === 0;
  /** Front slot uses full color only when the mascot is ready; not-ready matches side-card treatment. */
  const showFullColorImage = isFrontSlot && !mascot.isComingSoon;
  const useAccentCorners = showFullColorImage;
  const cornerAccent = getAccentForColor(mascot.color, colors.primary);
  const shadowStyle = Platform.select({
    web: {
      boxShadow: '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
    } as unknown as object,
    default: shadowToNative('md'),
  });

  const cardAnimStyle = useAnimatedStyle(() => {
    const isHovered = hoveredIndexSv.value === cardIndex && !isFrontSlot;

    let tx = 0;
    let ty = 0;
    let sc = 1;
    let rot = 0;

    if (slotNumber === 0) {
      tx = slot.active.tx;
      ty = slot.active.ty;
      sc = slot.active.sc;
      rot = slot.active.rot;
    } else if (slotNumber === 1) {
      if (isHovered) {
        tx = slot.hoverLeft.tx;
        ty = slot.hoverLeft.ty;
        sc = slot.hoverLeft.sc;
        rot = slot.hoverLeft.rot;
      } else {
        tx = slot.left.tx;
        ty = slot.left.ty;
        sc = slot.left.sc;
        rot = slot.left.rot;
      }
    } else if (slotNumber === 2) {
      if (isHovered) {
        tx = slot.hoverTop.tx;
        ty = slot.hoverTop.ty;
        sc = slot.hoverTop.sc;
        rot = slot.hoverTop.rot;
      } else {
        tx = slot.top.tx;
        ty = slot.top.ty;
        sc = slot.top.sc;
        rot = slot.top.rot;
      }
    } else {
      // slotNumber === 3
      if (isHovered) {
        tx = slot.hoverRight.tx;
        ty = slot.hoverRight.ty;
        sc = slot.hoverRight.sc;
        rot = slot.hoverRight.rot;
      } else {
        tx = slot.right.tx;
        ty = slot.right.ty;
        sc = slot.right.sc;
        rot = slot.right.rot;
      }
    }

    return {
      opacity: withTiming(slotNumber === 0 ? 1 : 0.6, {
        duration: CARD_MOTION_DURATION,
        easing: CARD_MOTION_EASING,
      }),
      transform: [
        {
          translateX: withTiming(-cardWidth / 2 + tx, {
            duration: CARD_MOTION_DURATION,
            easing: CARD_MOTION_EASING,
          }),
        },
        {
          translateY: withTiming(-cardHeight / 2 + ty, {
            duration: CARD_MOTION_DURATION,
            easing: CARD_MOTION_EASING,
          }),
        },
        {
          scale: withTiming(sc, {
            duration: CARD_MOTION_DURATION,
            easing: CARD_MOTION_EASING,
          }),
        },
        // rotateZ expects a string like "7deg" (RN). Rotations are slot constants,
        // so we don't need to animate them; animating can also create invalid values.
        { rotateZ: `${rot}deg` },
      ],
    };
  }, [cardIndex, slotNumber, cardWidth, cardHeight]);

  // Corner layout scales with card size.
  const cornerTop = 10 * (cardWidth / 208);
  const cornerLeft = 12 * (cardWidth / 208);
  const rankFont = 19 * (cardWidth / 208);
  const suitFont = 14 * (cardWidth / 208);

  return (
    <Pressable
      onPress={onPress}
      // Prevent cards from stealing keyboard focus on web (which can make arrow keys
      // trigger card actions instead of arrow buttons).
      focusable={false}
      {...(Platform.OS === 'web' ? ({ tabIndex: -1 } as any) : {})}
      style={[
        styles.cardPressable,
        {
          width: cardWidth,
          height: cardHeight,
          borderRadius,
          ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
          // RN z-index uses the outer element for stacking.
          zIndex: slotNumber === 0 ? 10 : slotNumber === 2 ? 2 : 3,
        },
      ]}
      {...(Platform.OS === 'web'
        ? ({
            onHoverIn: () => {
              if (!isFrontSlot) setHoveredIndex(cardIndex);
            },
            onHoverOut: () => {
              if (hoveredIndex === cardIndex) setHoveredIndex(null);
            },
          } as any)
        : {})}
    >
      <Animated.View
        style={[
          styles.cardInner,
          cardAnimStyle,
          {
            width: cardWidth,
            height: cardHeight,
            borderRadius,
            // Use "surface" so cards remain visible on light backgrounds.
            backgroundColor: '#FFFFFF',
            borderColor: colors.outline,
            ...shadowStyle,
          },
        ]}
      >
        <View style={[styles.cornerTL, { top: cornerTop, left: cornerLeft }]}>
          <Text
            style={[
              styles.cornerRank,
              {
                fontSize: rankFont,
                color: useAccentCorners ? cornerAccent.cornerTextColor : '#111',
                fontFamily: fontFamilies.figtree.semiBold,
              },
            ]}
          >
            {rank}
          </Text>
          <Text
            style={[
              styles.cornerSuit,
              { fontSize: suitFont, color: useAccentCorners ? cornerAccent.cornerTextColor : '#111' },
            ]}
          >
            {suitSymbol}
          </Text>
        </View>

        <View style={[styles.cornerBR, { bottom: cornerTop, right: cornerLeft }]}>
          <Text
            style={[
              styles.cornerRank,
              {
                fontSize: rankFont,
                color: useAccentCorners ? cornerAccent.cornerTextColor : '#111',
                fontFamily: fontFamilies.figtree.semiBold,
              },
            ]}
          >
            {rank}
          </Text>
          <Text
            style={[
              styles.cornerSuit,
              { fontSize: suitFont, color: useAccentCorners ? cornerAccent.cornerTextColor : '#111' },
            ]}
          >
            {suitSymbol}
          </Text>
        </View>

        <View style={[styles.imageArea, { top: 52 * (cardWidth / 208), bottom: 52 * (cardWidth / 208), left: 16 * (cardWidth / 208), right: 16 * (cardWidth / 208), borderRadius: 10 * (cardWidth / 208) }]}>
          {mascot.image ? (
            <Image
              source={showFullColorImage ? mascot.image : (mascot.grayscaleImage ?? mascot.image)}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 10 * (cardWidth / 208),
                ...(Platform.OS === 'web' && !showFullColorImage && !mascot.grayscaleImage
                  ? { filter: 'grayscale(1)' }
                  : {}),
              }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.textMuted }]} />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  layoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 256,
  },
  layoutMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 20,
  },
  leftCol: {
    alignItems: 'center',
  },
  leftColNativeWide: {
    flexBasis: '28%',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: 340,
  },
  middleCol: {
    minWidth: 0,
    alignItems: 'flex-start',
  },
  middleColWeb: {
    maxWidth: '100%' as any,
    alignSelf: 'stretch',
    paddingRight: 4,
  },
  middleColNativeWide: {
    flex: 1,
    paddingHorizontal: 8,
  },
  skillsCol: {
    minWidth: 0,
    alignItems: 'stretch',
  },
  skillsColWeb: {
    maxWidth: '100%' as any,
    alignSelf: 'stretch',
    paddingLeft: 2,
  },
  skillsColNativeWide: {
    flexBasis: '32%',
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: 440,
  },
  rightCol: {
    minWidth: 0,
    alignItems: 'flex-start',
  },
  rightColWeb: {
    maxWidth: '100%' as any,
    alignSelf: 'stretch',
    paddingLeft: 0,
  },
  rightColNativeWide: {
    flex: 1,
    paddingHorizontal: 8,
  },
  sectionStack: {
    width: '100%' as any,
    alignSelf: 'stretch',
  },
  deckOuter: {
    flex: 1,
  },
  deckContainer: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  arrowRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    position: 'relative',
    zIndex: 50,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 60,
  },
  descWrap: {
    width: '100%',
    maxWidth: 524,
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  descName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'left',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 176,
    textAlign: 'left',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  descTextWeb: {
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
  },
  /** Compact skill chips (same family as MascotDetails / LinkPill), not full SkillCard rows. */
  skillsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 524,
    columnGap: 8,
    rowGap: 6,
    ...(Platform.OS === 'web' ? ({ overflow: 'visible' } as any) : null),
  },
  bioToSkills: {
    width: '100%',
    marginTop: 36,
    ...(Platform.OS === 'web' ? ({ overflow: 'visible' } as any) : null),
  },
  skillTooltipContainer: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 8,
    width: 220,
    borderRadius: 8,
    padding: 12,
    zIndex: 1000,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' } as any,
      default: { elevation: 5 },
    }),
  },
  skillTooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  skillTooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  empty: {
    height: 420,
  },

  cardPressable: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  cardInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  cornerTL: {
    position: 'absolute',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  cornerBR: {
    position: 'absolute',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    transform: [{ rotate: '180deg' }],
  },
  cornerRank: {
    lineHeight: 16,
  },
  cornerSuit: {
    lineHeight: 14,
  },
  imageArea: {
    position: 'absolute',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
});

