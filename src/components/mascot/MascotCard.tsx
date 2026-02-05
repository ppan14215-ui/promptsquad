import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, textStyles, shadowToCSS, shadowToNative, skeuToGradient } from '@/design-system';
import { MiniButton } from '../ui/MiniButton';
import { ProBadge } from '../ui/ProBadge';

export type MascotCardState = 'default' | 'hover' | 'locked' | 'locked-hover';

// All available mascot colors
export type MascotColorVariant = 'yellow' | 'red' | 'green' | 'pink' | 'purple' | 'darkPurple' | 'brown' | 'teal' | 'orange' | 'blue';

export type MascotCardProps = {
  id: string;
  name: string;
  subtitle: string;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  grayscaleImageSource?: ImageSourcePropType; // Grayscale version of the image
  onPress?: () => void;
  isLocked?: boolean;
  isPro?: boolean; // True if mascot is exclusively for pro subscription
  isUnlocked?: boolean; // True if mascot is unlocked for the user (affects badge color)
  isComingSoon?: boolean; // True if mascot is not yet active/ready
  /** Force a specific state for preview purposes */
  forceState?: MascotCardState;
  /** Color variant for hover border (defaults to yellow) */
  colorVariant?: MascotColorVariant;
  /** Force grayscale filter on the image */
  forceGrayscale?: boolean;
};

export function MascotCard({
  name,
  subtitle,
  imageUrl,
  imageSource,
  grayscaleImageSource,
  onPress,
  isLocked = false,
  isPro = false,
  isUnlocked = false,
  forceState,
  colorVariant = 'yellow',
  isComingSoon = false,
  forceGrayscale = false,
}: MascotCardProps) {
  const { colors } = useTheme();
  const [isHoveredInternal, setIsHoveredInternal] = useState(false);

  // If coming soon, it's effectively locked but with special visuals
  const effectiveIsComingSoon = isComingSoon;

  // Determine effective state
  const effectiveState: MascotCardState = forceState ?? (
    effectiveIsComingSoon ? 'locked' : // Treated as locked for interactions
      (isLocked
        ? (isHoveredInternal ? 'locked-hover' : 'locked')
        : (isHoveredInternal ? 'hover' : 'default'))
  );

  const isHovered = effectiveState === 'hover';
  const isLockedState = effectiveState === 'locked' || effectiveState === 'locked-hover';
  const isLockedHover = effectiveState === 'locked-hover';

  // Get the hover border color based on variant
  const hoverBorderColor = colors[colorVariant];

  // Shadow for hover state (web: CSS, native: fallback)
  const hoverShadowStyle = Platform.select({
    web: { boxShadow: shadowToCSS('md') } as unknown as object,
    default: shadowToNative('md'),
  });

  // Web-specific transition style
  const webTransitionStyle = Platform.select({
    web: {
      transition: 'all 200ms ease-out',
    } as unknown as object,
    default: {},
  });

  // Grayscale filter for locked state or when forceGrayscale is true
  const shouldGrayscale = forceGrayscale !== undefined ? forceGrayscale : isLockedState;

  return (
    <Pressable
      onPress={effectiveIsComingSoon ? undefined : onPress} // Disable press if coming soon
      onHoverIn={() => !forceState && !effectiveIsComingSoon && setIsHoveredInternal(true)}
      onHoverOut={(e) => {
        if (!forceState) {
          setIsHoveredInternal(false);
        }
      }}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: colors.background,
          borderWidth: Platform.OS === 'web' ? 0 : 1,
          borderColor: colors.outline,
          opacity: effectiveIsComingSoon ? 0.7 : 1, // Reduce opacity for coming soon
        },
        Platform.OS === 'web' && ({
          boxShadow: isHovered
            ? `inset 0 0 0 2px ${hoverBorderColor}, ${shadowToCSS('md')}`
            : `inset 0 0 0 1px ${colors.outline}`,
        } as unknown as object),
        Platform.OS !== 'web' && isHovered && hoverShadowStyle,
      ]}
    >
      {/* Mascot image */}
      <View
        style={[
          styles.imageContainer,
          (isHovered || isLockedHover) && styles.imageContainerHover,
          Platform.OS === 'web' && ({ transition: 'all 200ms ease-out' } as unknown as object),
          isLockedState && !grayscaleImageSource && { opacity: 0.3 },
        ]}
      >
        <Image
          source={
            // Use grayscale if available and locked (including coming soon)
            (isLockedState || effectiveIsComingSoon) && grayscaleImageSource
              ? grayscaleImageSource
              : (imageSource || { uri: imageUrl })
          }
          style={[
            styles.image,
            Platform.OS === 'web' && (isLockedState || effectiveIsComingSoon) && !grayscaleImageSource
              ? { filter: 'grayscale(100%)' } as unknown as object
              : {},
          ]}
          contentFit="cover"
          transition={200}
        />
      </View>

      {/* Text content */}
      <View style={[styles.textContainer, isHovered && styles.textContainerHover]}>
        <Text
          style={[
            styles.title,
            {
              fontFamily: textStyles.cardTitle.fontFamily,
              fontSize: textStyles.cardTitle.fontSize,
              lineHeight: textStyles.cardTitle.lineHeight,
              letterSpacing: textStyles.cardTitle.letterSpacing,
              color: isLockedState || effectiveIsComingSoon ? colors.textMuted : colors.text,
            },
          ]}
          numberOfLines={1}
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
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      {/* Unlock Button - Only for locked-hover, NOT for coming soon */}
      {isLockedHover && !effectiveIsComingSoon && (
        <View
          style={styles.buttonContainer}
          {...(Platform.OS === 'web' && {
            onMouseEnter: () => !forceState && setIsHoveredInternal(true),
          })}
        >
          <MiniButton
            label={isPro ? "Unlock for 2,99€" : "Unlock for 1,99€"}
            onPress={onPress}
          />
        </View>
      )}

      {/* Pro Badge */}
      {isPro && !effectiveIsComingSoon && (
        <ProBadge style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }} color={colors.primary} />
      )}

      {/* Coming Soon Badge */}
      {effectiveIsComingSoon && (
        <View style={[styles.proBadge, { backgroundColor: colors.textMuted }]}>
          <Text style={[styles.proBadgeText, { color: colors.buttonText }]}>SOON</Text>
        </View>
      )}
    </Pressable>
  );
}

const CARD_SIZE = 192;
const IMAGE_SIZE_DEFAULT = 128;
const IMAGE_SIZE_HOVER = 140;

const styles = StyleSheet.create({
  container: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  textContainer: {
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
    position: 'relative',
  },
  textContainerHover: {
    zIndex: 1, // Lower than image on hover
    position: 'relative',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  imageContainer: {
    position: 'absolute',
    width: IMAGE_SIZE_DEFAULT,
    height: IMAGE_SIZE_DEFAULT,
    top: 64, // bottom aligns with card border (192 - 128 = 64)
    left: (CARD_SIZE - IMAGE_SIZE_DEFAULT) / 2,
    zIndex: 1,
  },
  imageContainerHover: {
    width: IMAGE_SIZE_HOVER,
    height: IMAGE_SIZE_HOVER,
    top: CARD_SIZE - IMAGE_SIZE_HOVER, // 192 - 140 = 52; stay fully inside border
    left: (CARD_SIZE - IMAGE_SIZE_HOVER) / 2,
    zIndex: 5, // Higher than text on hover
  },
  image: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 16, // 16px padding from bottom
    left: (CARD_SIZE - 97) / 2, // Center the button (button width ~97px from Figma)
    zIndex: 11,
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

export default MascotCard;

