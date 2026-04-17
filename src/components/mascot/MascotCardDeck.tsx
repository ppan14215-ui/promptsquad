import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { useTheme, fontFamilies } from '@/design-system';
import type { Skill } from './MascotDetails';
import { FlippableCard } from './FlippableCard';
import { resolveMascotColor } from '@/lib/utils/mascot-colors';
import { resolveMascotDetailsShortBio } from '@/lib/mascot-short-bio';

export type DeckMascot = {
  id: string;
  name: string;
  subtitle: string;
  image: any;
  color: string;
  questionPrompt: string;
  skills: Skill[];
  models: string[];
  isCustom?: boolean;
  isPro?: boolean;
  isLocked?: boolean;
  isComingSoon?: boolean;
  /** `mascots.bio` — short card line. */
  bio?: string | null;
  /** `mascots.description` — long bio; preferred for flip-card front when set. */
  longBio?: string | null;
};

type MascotCardDeckProps = {
  mascots: DeckMascot[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  onActivateMascot: (mascot: DeckMascot) => void;
  onActivateSkill: (mascot: DeckMascot, skill: Skill) => void;
};

function wrapIndex(index: number, length: number) {
  if (length === 0) return 0;
  if (index < 0) return (index % length + length) % length;
  return index % length;
}

function getImageUri(source: unknown): string | null {
  if (!source) return null;
  if (typeof source === 'string') return source;
  if (typeof source === 'object' && source !== null && 'uri' in (source as Record<string, unknown>)) {
    const uri = (source as { uri?: unknown }).uri;
    return typeof uri === 'string' ? uri : null;
  }
  return null;
}

export function MascotCardDeck({
  mascots,
  selectedIndex,
  onIndexChange,
  onActivateMascot,
  onActivateSkill,
}: MascotCardDeckProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const [flippedById, setFlippedById] = useState<Record<string, boolean>>({});

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const isCompactPhone = width <= 380;
  const isTallPhone = height / width >= 2;
  const horizontalInset = isCompactPhone ? 14 : 18;
  // Slightly larger deck cards on modern tall phones (e.g. Pixel) while staying safe on small devices.
  const cardWidth = Math.min(width - horizontalInset * 2, isTallPhone ? 368 : 360);
  const cardHeight = Math.max(
    520,
    Math.min(
      height - (isTallPhone ? 205 : 220),
      Math.round(cardWidth * 1.78),
      660
    )
  );
  const secondLiftStart = Math.max(10, Math.min(14, Math.round(cardHeight * 0.02)));
  const secondLiftEnd = Math.max(4, secondLiftStart - 8);
  const thirdLiftStart = secondLiftStart + 8;
  const thirdLiftEnd = secondLiftEnd + 8;
  const swipeThresholdX = Math.max(52, Math.min(86, width * 0.17));
  const swipeThresholdUp = Math.max(68, Math.min(110, height * 0.11));

  const swipeThresholdXSv = useSharedValue(swipeThresholdX);
  const swipeThresholdUpSv = useSharedValue(swipeThresholdUp);
  const widthSv = useSharedValue(width);
  const topCardIndexSv = useSharedValue(0);
  const topCardComingSoonSv = useSharedValue(0);
  const pendingActivateRef = useRef<{ mascot: DeckMascot; skill?: Skill } | null>(null);
  const prefetchedUrisRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    swipeThresholdXSv.value = swipeThresholdX;
    swipeThresholdUpSv.value = swipeThresholdUp;
    widthSv.value = width;
  }, [swipeThresholdX, swipeThresholdUp, width, swipeThresholdXSv, swipeThresholdUpSv, widthSv]);

  // Prefetch all deck images so they're cached before user swipes
  useEffect(() => {
    const uris = Array.from(new Set(mascots.map((m) => getImageUri(m.image)).filter((u): u is string => !!u)));
    if (!uris.length) return;
    const toPrefetch = uris.filter((uri) => !prefetchedUrisRef.current.has(uri));
    if (!toPrefetch.length) return;
    toPrefetch.forEach((uri) => prefetchedUrisRef.current.add(uri));
    ExpoImage.prefetch(toPrefetch, 'memory-disk').catch(() => {});
  }, [mascots]);

  // Prefetch adjacent cards when index changes so next/prev load instantly
  useEffect(() => {
    const len = mascots.length;
    if (!len) return;
    const indices = [
      wrapIndex(selectedIndex - 1, len),
      selectedIndex,
      wrapIndex(selectedIndex + 1, len),
    ];
    const uris = Array.from(
      new Set(indices.map((i) => getImageUri(mascots[i]?.image)).filter((u): u is string => !!u))
    );
    const toPrefetch = uris.filter((uri) => !prefetchedUrisRef.current.has(uri));
    if (!toPrefetch.length) return;
    toPrefetch.forEach((uri) => prefetchedUrisRef.current.add(uri));
    ExpoImage.prefetch(toPrefetch, 'memory-disk').catch(() => {});
  }, [mascots, selectedIndex]);

  const moveNext = () => {
    const nextIndex = wrapIndex(selectedIndex + 1, mascots.length);
    setFlippedById((prev: Record<string, boolean>) => ({ ...prev, [mascots[nextIndex]?.id]: false }));
    onIndexChange(nextIndex);
    hardReset();
  };

  const movePrev = () => {
    const prevIndex = wrapIndex(selectedIndex - 1, mascots.length);
    setFlippedById((prev: Record<string, boolean>) => ({ ...prev, [mascots[prevIndex]?.id]: false }));
    onIndexChange(prevIndex);
    hardReset();
  };

  const toggleFlipByIndex = (index: number) => {
    const m = mascots[wrapIndex(index, mascots.length)];
    if (!m) return;
    setFlippedById((prev: Record<string, boolean>) => ({ ...prev, [m.id]: !prev[m.id] }));
  };

  const flushPendingActivate = () => {
    const pending = pendingActivateRef.current;
    pendingActivateRef.current = null;
    if (!pending) return;
    if (pending.skill) {
      onActivateSkill(pending.mascot, pending.skill);
    } else {
      onActivateMascot(pending.mascot);
    }
    hardReset();
  };

  const visibleCards = useMemo(() => {
    if (!mascots.length) return [];
    const currentIdx = wrapIndex(selectedIndex, mascots.length);
    const nextIdx = wrapIndex(selectedIndex + 1, mascots.length);
    const prevIdx = wrapIndex(selectedIndex - 1, mascots.length);
    return [
      { mascot: mascots[currentIdx], offset: 0 as const, actualIndex: currentIdx },
      { mascot: mascots[nextIdx], offset: 1 as const, actualIndex: nextIdx },
      { mascot: mascots[prevIdx], offset: -1 as const, actualIndex: prevIdx },
    ];
  }, [mascots, selectedIndex]);

  const topCardMeta = useMemo(() => {
    const first = visibleCards[0];
    return { index: first?.actualIndex ?? 0, comingSoon: first?.mascot?.isComingSoon ? 1 : 0 };
  }, [visibleCards]);

  useEffect(() => {
    topCardIndexSv.value = topCardMeta.index;
    topCardComingSoonSv.value = topCardMeta.comingSoon;
  }, [topCardMeta.index, topCardMeta.comingSoon, topCardIndexSv, topCardComingSoonSv]);

  const front = visibleCards[0];
  const second = visibleCards[1];
  const third = visibleCards[2];
  const topCard = front?.mascot;

  const frontStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    zIndex: 3,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotateZ.value}deg` },
    ],
  }));

  const secondStyle = useAnimatedStyle(() => {
    const thresh = swipeThresholdXSv.value;
    // "second" card is the NEXT card - it should be promoted only on LEFT swipe.
    const progress = interpolate(-translateX.value, [0, thresh * 1.3], [0, 1], Extrapolation.CLAMP);
    const lift = interpolate(progress, [0, 1], [secondLiftStart, secondLiftEnd]);
    const grow = interpolate(progress, [0, 1], [0.985, 1]);
    const shift = interpolate(progress, [0, 1], [2, -6], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: lift }, { translateX: shift }, { scale: grow }],
      opacity: interpolate(progress, [0, 1], [0.9, 0.98], Extrapolation.CLAMP),
      zIndex: translateX.value < 0 ? 2 : 1,
    };
  });

  const thirdStyle = useAnimatedStyle(() => {
    const thresh = swipeThresholdXSv.value;
    // "third" card is the PREVIOUS card - it should be promoted only on RIGHT swipe.
    const progress = interpolate(translateX.value, [0, thresh * 1.3], [0, 1], Extrapolation.CLAMP);
    const lift = interpolate(progress, [0, 1], [thirdLiftStart, thirdLiftEnd]);
    const grow = interpolate(progress, [0, 1], [0.97, 1], Extrapolation.CLAMP);
    const shift = interpolate(progress, [0, 1], [-4, 6], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: lift }, { translateX: shift }, { scale: grow }],
      opacity: interpolate(progress, [0, 1], [0.84, 0.98], Extrapolation.CLAMP),
      zIndex: translateX.value > 0 ? 2 : 1,
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const resetTransforms = () => {
    translateX.value = withSpring(0, { damping: 14, stiffness: 165, velocity: 2 });
    translateY.value = withSpring(0, { damping: 14, stiffness: 165, velocity: 2 });
    rotateZ.value = withSpring(0, { damping: 16, stiffness: 200 });
    scale.value = withSpring(1, { damping: 13, stiffness: 185 });
    cardOpacity.value = withTiming(1, { duration: 120 });
  };

  const hardReset = () => {
    translateX.value = 0;
    translateY.value = 0;
    rotateZ.value = 0;
    scale.value = 1;
    cardOpacity.value = 1;
  };


  const launchIntoChat = (targetMascot?: DeckMascot, targetSkill?: Skill) => {
    const mascot = targetMascot || topCard;
    if (!mascot) return;
    if (mascot.isComingSoon) return;

    pendingActivateRef.current = targetSkill ? { mascot, skill: targetSkill } : { mascot };

    scale.value = withSequence(
      withTiming(0.984, { duration: 60 }),
      withTiming(1.035, { duration: 90 }),
      withTiming(1.15, { duration: 210 })
    );
    rotateZ.value = withTiming(0, { duration: 80 });
    glowOpacity.value = withTiming(0.72, { duration: 115 }, () => {
      glowOpacity.value = withTiming(0, { duration: 320 });
    });
    cardOpacity.value = withTiming(0.9, { duration: 90 }, () => {
      cardOpacity.value = withTiming(0.06, { duration: 250 });
    });
    translateY.value = withTiming(-(height * 1.18), { duration: 340 }, () => {
      runOnJS(flushPendingActivate)();
    });
  };

  const panGesture = Gesture.Pan()
    .minDistance(2)
    .onUpdate((event: { translationX: number; translationY: number }) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);
      const horizontal = absX > absY * 1.05;
      const verticalUp = event.translationY < 0 && absY > absX * 0.88;

      if (horizontal) {
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.03;
        rotateZ.value = interpolate(event.translationX, [-240, 0, 240], [-8, 0, 8]);
        scale.value = interpolate(absX, [0, 220], [1, 0.964], Extrapolation.CLAMP);
      } else if (verticalUp) {
        translateY.value = event.translationY;
        translateX.value = event.translationX * 0.05;
        rotateZ.value = interpolate(event.translationX, [-220, 0, 220], [-4, 0, 4]);
        scale.value = interpolate(absY, [0, 260], [1, 0.972], Extrapolation.CLAMP);
      }
    })
    .onEnd((event: { velocityX: number }) => {
      const x = translateX.value;
      const y = translateY.value;
      const threshX = swipeThresholdXSv.value;
      const threshUp = swipeThresholdUpSv.value;
      const w = widthSv.value;
      const horizontalSwipe = Math.abs(x) > threshX && Math.abs(x) > Math.abs(y);
      const upSwipe = y < -threshUp && Math.abs(y) > Math.abs(x) * 0.9;

      if (horizontalSwipe) {
        if (x < 0) runOnJS(moveNext)();
        else runOnJS(movePrev)();
        return;
      }

      if (upSwipe) {
        runOnJS(launchIntoChat)();
        return;
      }

      runOnJS(resetTransforms)();
    });

  const isTopFlipped = front ? !!flippedById[front.mascot.id] : false;

  const tapGesture = Gesture.Tap()
    .maxDistance(10)
    .enabled(!isTopFlipped)
    .onEnd((_event: unknown, success: boolean) => {
      if (!success || topCardComingSoonSv.value) return;
      runOnJS(toggleFlipByIndex)(topCardIndexSv.value);
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  if (!front || !second || !third) {
    return null;
  }

  const cardsForRender = [third, second, front];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.glow,
          glowStyle,
          {
            width: cardWidth + 18,
            height: cardHeight + 18,
            backgroundColor: topCard ? `${resolveMascotColor(topCard.color as any)}66` : '#00000022',
          },
        ]}
      />

      <GestureDetector gesture={gesture}>
        <View style={[styles.stackContainer, { width: cardWidth, height: cardHeight }]}>
          {cardsForRender.map((card) => {
            const isTop = card.offset === 0;
            const layerStyle = card.offset === 0 ? frontStyle : card.offset === 1 ? secondStyle : thirdStyle;
            const stableKey = mascots.length >= 3 ? card.mascot.id : `${card.mascot.id}-${card.offset}`;

            return (
              <Animated.View
                key={stableKey}
                style={[styles.cardLayer, layerStyle]}
                pointerEvents={isTop ? 'auto' : 'none'}
              >
                <FlippableCard
                  id={card.mascot.id}
                  name={card.mascot.name}
                  subtitle={card.mascot.subtitle}
                  imageSource={card.mascot.image}
                  color={card.mascot.color}
                  skills={card.mascot.skills || []}
                  models={card.mascot.models || []}
                  customBio={resolveMascotDetailsShortBio({
                    bio: card.mascot.bio,
                    name: card.mascot.name,
                    skills: card.mascot.skills,
                  }) || undefined}
                  isCustom={card.mascot.isCustom}
                  isPro={card.mascot.isPro}
                  isLocked={card.mascot.isLocked}
                  isComingSoon={card.mascot.isComingSoon}
                  isFlipped={isTop ? !!flippedById[card.mascot.id] : false}
                  width={cardWidth}
                  height={cardHeight}
                  showFlipHint={false}
                  enableLikes
                  onToggleFlip={() => {
                    if (!isTop || card.mascot.isComingSoon) return;
                    setFlippedById((prev: Record<string, boolean>) => ({
                      ...prev,
                      [card.mascot.id]: !prev[card.mascot.id],
                    }));
                  }}
                  onStartChat={() => {
                    if (!isTop || card.mascot.isComingSoon) return;
                    launchIntoChat(card.mascot);
                  }}
                  onSkillPress={(skill) => {
                    if (!isTop || card.mascot.isComingSoon) return;
                    launchIntoChat(card.mascot, skill);
                  }}
                />
              </Animated.View>
            );
          })}
        </View>
      </GestureDetector>

      <Text style={[styles.hintText, { color: colors.textMuted, opacity: 0.75 }]}>
        Tap card to flip • Swipe left/right to shuffle • Swipe up to launch
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glow: {
    position: 'absolute',
    borderRadius: 30,
    transform: [{ scale: 1.02 }],
  },
  hintText: {
    marginTop: 14,
    fontFamily: fontFamilies.figtree.medium,
    fontSize: 11,
    textAlign: 'center',
  },
});

export default MascotCardDeck;
