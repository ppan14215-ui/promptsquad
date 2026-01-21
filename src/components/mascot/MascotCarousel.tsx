import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, PanResponder, Animated } from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';
import { Icon } from '@/components';
import type { MascotColorVariant } from './MascotCard';

export type MascotCarouselMascot = {
  id: string;
  name: string;
  subtitle: string;
  image: any;
  color: MascotColorVariant;
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

  const selectedSize = (isDesktop ? 192 : 144) * scale; // Increased from 96 to 144
  const neighborSize = (isDesktop ? 96 : 72) * scale; // Increased from 48 to 72
  const selectedImageSize = (isDesktop ? 128 : 96) * scale; // Increased from 64 to 96
  const neighborImageSize = (isDesktop ? 64 : 48) * scale; // Increased from 32 to 48
  const selectedNameSize = (isDesktop ? 18 : 14) * scale; // Increased from 9 to 14
  const selectedSubtitleSize = (isDesktop ? 11 : 8) * scale; // Increased from 5.5 to 8
  const neighborNameSize = (isDesktop ? 9 : 7) * scale; // Increased from 4.5 to 7
  const neighborSubtitleSize = (isDesktop ? 5.5 : 4) * scale; // Increased from 2.75 to 4
  const selectedBorderRadius = (isDesktop ? 16 : 12) * scale; // Increased from 8 to 12
  const neighborBorderRadius = 8 * scale;

  const getVisibleMascots = () => {
    const result: Array<{ mascot: MascotCarouselMascot; position: number; actualIndex: number }> = [];
    for (let i = -2; i <= 2; i++) {
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
      <View style={styles.carousel}>
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

          return (
            <View key={`${mascot.id}-${position}`} style={[styles.mascotWrapper, { alignItems: 'flex-end' }]}>
              {position === 0 && (
                <Pressable style={[styles.arrowButton, { marginBottom: (isDesktop ? 80 : 32) * scale }]} onPress={onPrev}>
                  <Icon name="arrow-left" size={16 * scale} color={colors.textMuted} />
                </Pressable>
              )}

              <Pressable
                style={[
                  styles.mascotCard,
                  {
                    width: size,
                    height: size,
                    opacity,
                    borderColor: isSelected ? COLOR_MAP[mascot.color] : colors.outline,
                    borderWidth: isSelected ? 2 : 0.25,
                    borderRadius,
                    backgroundColor: colors.background,
                    paddingTop,
                    paddingHorizontal,
                  },
                ]}
                onPress={() => onMascotPress(mascot, actualIndex, isSelected)}
              >
                <View style={styles.mascotTextContainer}>
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
                    },
                  ]}
                  resizeMode="contain"
                />
              </Pressable>

              {position === 0 && (
                <Pressable style={[styles.arrowButton, { marginBottom: (isDesktop ? 80 : 32) * scale }]} onPress={onNext}>
                  <Icon name="arrow-right" size={16 * scale} color={colors.textMuted} />
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
});
