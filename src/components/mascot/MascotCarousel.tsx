import React from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder, Animated, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, fontFamilies } from '@/design-system';
import { Icon } from '@/components';
import type { MascotColorVariant } from './MascotCard';

export type MascotCarouselMascot = {
  id: string;
  name: string;
  subtitle: string;
  image: any;
  color: MascotColorVariant;
  isPro?: boolean;
  isComingSoon?: boolean;
};

export type MascotCarouselProps = {
  mascots: MascotCarouselMascot[];
  selectedIndex: number;
  onMascotPress: (mascot: MascotCarouselMascot, index: number, isSelected: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  isDesktop?: boolean;
  scale?: number; // Optional scale factor (default: 1.0)
};

const COLOR_MAP: Record<MascotColorVariant, string> = {
  yellow: '#EDB440',
  red: '#E64140',
  green: '#74AE58',
  pink: '#EB3F71',
  purple: '#5E24CB',
  darkPurple: '#2D2E66',
  brown: '#826F57',
  teal: '#59C19D',
  orange: '#ED7437',
  blue: '#2D6CF5',
};

export function MascotCarousel({
  mascots,
  selectedIndex,
  onMascotPress,
  onPrev,
  onNext,
  isDesktop = false,
  scale = 1.0,
}: MascotCarouselProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrowMobile = width < 380;

  // Threshold in pixels for a swipe to be recognized
  const SWIPE_THRESHOLD = 50;

  // PanResponder to handle swipe gestures
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (e, gestureState) => {
        // Horizontal swipe detection
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          if (gestureState.dx > 0) {
            // Swipe Right -> Show Previous
            onPrev();
          } else {
            // Swipe Left -> Show Next
            onNext();
          }
        }
      },
      // Allow vertical scroll to leak through
      onMoveShouldSetPanResponder: (e, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
    })
  ).current;

  // Adjust sizes based on screen width
  const baseSelectedSize = isDesktop ? 192 : (isNarrowMobile ? 120 : 144);
  const baseNeighborSize = isDesktop ? 96 : (isNarrowMobile ? 60 : 72);

  const selectedSize = baseSelectedSize * scale;
  const neighborSize = baseNeighborSize * scale;
  const selectedImageSize = (isDesktop ? 128 : (isNarrowMobile ? 80 : 96)) * scale;
  const neighborImageSize = (isDesktop ? 64 : (isNarrowMobile ? 40 : 48)) * scale;
  const selectedNameSize = (isDesktop ? 18 : (isNarrowMobile ? 12 : 14)) * scale;
  const selectedSubtitleSize = (isDesktop ? 11 : (isNarrowMobile ? 7 : 8)) * scale;

  const neighborNameSize = (isDesktop ? 9 : 7) * scale;
  const neighborSubtitleSize = (isDesktop ? 5.5 : 4) * scale;
  const selectedBorderRadius = (isDesktop ? 16 : 12) * scale;
  const neighborBorderRadius = 8 * scale;

  const getVisibleMascots = () => {
    const result: Array<{ mascot: MascotCarouselMascot; position: number; actualIndex: number }> = [];
    const range = isNarrowMobile ? 1 : 2; // Show only 3 on narrow mobile, 5 otherwise

    for (let i = -range; i <= range; i++) {
      let index = selectedIndex + i;
      if (index < 0) index = mascots.length + index;
      if (index >= mascots.length) index = index - mascots.length;
      result.push({ mascot: mascots[index], position: i, actualIndex: index });
    }
    return result;
  };

  const getMascotOpacity = (position: number) => {
    if (position === 0) return 1;
    if (Math.abs(position) === 1) return 0.5;
    return 0.1;
  };

  return (
    <View
      style={styles.carouselSection}
      {...panResponder.panHandlers}
    >
      <View style={[styles.carousel, isNarrowMobile && { gap: 8 }]}>
        {getVisibleMascots().map(({ mascot, position, actualIndex }) => {
          const isSelected = position === 0;
          const size = isSelected ? selectedSize : neighborSize;
          const imageSize = isSelected ? selectedImageSize : neighborImageSize;
          const nameSize = isSelected ? selectedNameSize : neighborNameSize;
          const subtitleSize = isSelected ? selectedSubtitleSize : neighborSubtitleSize;
          const borderRadius = isSelected ? selectedBorderRadius : neighborBorderRadius;
          const opacity = getMascotOpacity(position);

          const paddingTop = (isDesktop ? (isSelected ? 24 : 12) : (isSelected ? 12 : 6)) * scale;
          const paddingHorizontal = (isDesktop ? (isSelected ? 24 : 12) : (isSelected ? 12 : 6)) * scale;

          const isComingSoon = mascot.isComingSoon;

          return (
            <View key={`${mascot.id}-${position}`} style={[styles.mascotWrapper, { alignItems: 'flex-end' }]}>
              {isSelected && (
                <Pressable style={[styles.arrowButton, { marginBottom: (isDesktop ? 80 : (isNarrowMobile ? 24 : 32)) * scale }]} onPress={onPrev}>
                  <Icon name="arrow-left" size={isNarrowMobile ? 14 : 16 * scale} color={colors.textMuted} />
                </Pressable>
              )}

              <Pressable
                style={[
                  styles.mascotCard,
                  {
                    width: size,
                    height: size,
                    opacity: isComingSoon ? opacity * 0.7 : opacity,
                    borderColor: isSelected ? COLOR_MAP[mascot.color] : colors.outline,
                    borderWidth: isSelected ? 2 : 0.25,
                    borderRadius,
                    backgroundColor: colors.background,
                    paddingTop,
                    paddingHorizontal,
                  },
                ]}
                onPress={isComingSoon ? undefined : () => onMascotPress(mascot, actualIndex, isSelected)}
              >
                {/* Pro Badge */}
                {mascot.isPro && !isComingSoon && (
                  <View style={[
                    styles.proBadge,
                    {
                      backgroundColor: colors.primary,
                      top: isSelected ? 8 * scale : 4 * scale,
                      right: isSelected ? 8 * scale : 4 * scale,
                      paddingHorizontal: (isSelected ? 6 : 4) * scale,
                      paddingVertical: (isSelected ? 2 : 1) * scale,
                      borderRadius: (isSelected ? 8 : 4) * scale,
                    }
                  ]}>
                    <Text style={[
                      styles.proBadgeText,
                      {
                        color: colors.buttonText,
                        fontSize: (isSelected ? 8 : 6) * scale,
                      }
                    ]}>PRO</Text>
                  </View>
                )}

                {/* Coming Soon Badge */}
                {isComingSoon && (
                  <View style={[
                    styles.proBadge,
                    {
                      backgroundColor: colors.textMuted,
                      top: isSelected ? 8 * scale : 4 * scale,
                      right: isSelected ? 8 * scale : 4 * scale,
                      paddingHorizontal: (isSelected ? 6 : 4) * scale,
                      paddingVertical: (isSelected ? 2 : 1) * scale,
                      borderRadius: (isSelected ? 8 : 4) * scale,
                    }
                  ]}>
                    <Text style={[
                      styles.proBadgeText,
                      {
                        color: colors.buttonText,
                        fontSize: (isSelected ? 8 : 6) * scale,
                      }
                    ]}>SOON</Text>
                  </View>
                )}

                <View style={[styles.mascotTextContainer, { opacity: isComingSoon ? 0.7 : 1 }]}>
                  <Text
                    style={[
                      styles.mascotName,
                      {
                        fontFamily: fontFamilies.abyssinicaSil.regular,
                        color: colors.text,
                        fontSize: nameSize,
                        lineHeight: nameSize * 1.28,
                        letterSpacing: nameSize * 0.02,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {mascot.name}
                  </Text>
                  <Text
                    style={[
                      styles.mascotSubtitle,
                      {
                        fontFamily: fontFamilies.figtree.medium,
                        color: colors.textMuted,
                        fontSize: subtitleSize,
                        letterSpacing: isSelected ? 0.5 : 0.25,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {mascot.subtitle}
                  </Text>
                </View>
                <Image
                  source={mascot.image}
                  style={[
                    styles.mascotImage,
                    {
                      width: imageSize,
                      height: imageSize,
                      left: (size - imageSize) / 2,
                      opacity: isComingSoon ? 0.5 : 1,
                    },
                  ]}
                  contentFit="contain"
                  transition={200}
                />
              </Pressable>

              {isSelected && (
                <Pressable style={[styles.arrowButton, { marginBottom: (isDesktop ? 80 : (isNarrowMobile ? 24 : 32)) * scale }]} onPress={onNext}>
                  <Icon name="arrow-right" size={isNarrowMobile ? 14 : 16 * scale} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselSection: {
    alignItems: 'center',
    width: '100%',
  },
  carousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mascotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mascotCard: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  mascotTextContainer: {
    alignItems: 'center',
    gap: 2,
  },
  mascotName: {
    textAlign: 'center',
  },
  mascotSubtitle: {
    textAlign: 'center',
  },
  mascotImage: {
    position: 'absolute',
    bottom: 0,
  },
  arrowButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  proBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

