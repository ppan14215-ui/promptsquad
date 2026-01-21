import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
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

  const selectedSize = (isDesktop ? 192 : 96) * scale;
  const neighborSize = (isDesktop ? 96 : 48) * scale;
  const selectedImageSize = (isDesktop ? 128 : 64) * scale;
  const neighborImageSize = (isDesktop ? 64 : 32) * scale;
  const selectedNameSize = (isDesktop ? 18 : 9) * scale;
  const selectedSubtitleSize = (isDesktop ? 11 : 5.5) * scale;
  const neighborNameSize = (isDesktop ? 9 : 4.5) * scale;
  const neighborSubtitleSize = (isDesktop ? 5.5 : 2.75) * scale;
  const selectedBorderRadius = (isDesktop ? 16 : 8) * scale;
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
    <View style={styles.carouselSection}>
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
