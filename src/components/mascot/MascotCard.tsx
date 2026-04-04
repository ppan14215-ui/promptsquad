import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, textStyles, shadowToCSS, shadowToNative } from '@/design-system';
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
  onUnlock?: () => void;
  onHoverAction?: () => void;
  hoverActionLabel?: string;
  isLocked?: boolean;
  isPro?: boolean; // True if mascot is exclusively for pro subscription
  isCustom?: boolean; // True if mascot is user-created custom mascot
  isUnlocked?: boolean; // True if mascot is unlocked for the user (affects badge color)
  isComingSoon?: boolean; // True if mascot is not yet active/ready
  /** Force a specific state for preview purposes */
  forceState?: MascotCardState;
  /** Color variant for hover border (defaults to yellow) */
  colorVariant?: MascotColorVariant;
  /** Force grayscale filter on the image */
  forceGrayscale?: boolean;
  /** Optional responsive card size override */
  cardSize?: number;
};

export function MascotCard({
  id,
  name,
  subtitle,
  imageUrl,
  imageSource,
  grayscaleImageSource,
  onPress,
  onUnlock,
  onHoverAction,
  hoverActionLabel,
  isLocked = false,
  isPro = false,
  isCustom = false,
  isUnlocked = false,
  forceState,
  colorVariant = 'yellow',
  isComingSoon = false,
  forceGrayscale = false,
  cardSize,
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
  const effectiveCardSize = cardSize ?? CARD_SIZE;
  const imageSizeDefault = Math.round(effectiveCardSize * (128 / 192));
  const imageSizeHover = Math.round(effectiveCardSize * (140 / 192));

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

  return (
    <Pressable
      onPress={effectiveIsComingSoon ? undefined : onPress} // Disable press if coming soon
      onHoverIn={() => !forceState && !effectiveIsComingSoon && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      style={[
        styles.container,
        webTransitionStyle,
        {
          width: effectiveCardSize,
          height: effectiveCardSize,
          paddingTop: Math.round(effectiveCardSize * (24 / 192)),
          paddingHorizontal: Math.round(effectiveCardSize * (24 / 192)),
        },
        {
          backgroundColor: colors.background,
          borderWidth: Platform.OS === 'web' ? 0 : StyleSheet.hairlineWidth,
          borderColor: colors.outline,
          opacity: effectiveIsComingSoon ? 0.7 : 1, // Reduce opacity for coming soon
        },
        Platform.OS === 'web' && ({
          boxShadow: isHovered ? shadowToCSS('md') : 'none',
        } as unknown as object),
        Platform.OS !== 'web' && isHovered && hoverShadowStyle,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.cardOutline,
          {
            borderColor: isHovered ? hoverBorderColor : colors.outline,
          },
        ]}
      />

      {/* Mascot image */}
      <View
        style={[
          styles.imageContainer,
          {
            backgroundColor: 'transparent',
            width: imageSizeDefault,
            height: imageSizeDefault,
            top: effectiveCardSize - imageSizeDefault,
            left: (effectiveCardSize - imageSizeDefault) / 2,
          },
          (isHovered || isLockedHover) && styles.imageContainerHover,
          (isHovered || isLockedHover) && {
            width: imageSizeHover,
            height: imageSizeHover,
            top: effectiveCardSize - imageSizeHover,
            left: (effectiveCardSize - imageSizeHover) / 2,
          },
          Platform.OS === 'web' && ({ transition: 'all 200ms ease-out' } as unknown as object),
          isLockedState && !grayscaleImageSource && { opacity: 0.3 },
        ]}
      >
        <Image
          source={
            // Use grayscale if available and locked (including coming soon)
            (isLockedState || effectiveIsComingSoon) && grayscaleImageSource
              ? grayscaleImageSource
              : (imageSource || (imageUrl ? { uri: imageUrl } : undefined))
          }
          style={[
            styles.image,
            Platform.OS === 'web' && (isLockedState || effectiveIsComingSoon) && !grayscaleImageSource
              ? { filter: 'grayscale(100%)' } as unknown as object
              : {},
          ]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={`mascot-card-${id}`}
          transition={120}
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
          style={[styles.buttonContainer, { left: (effectiveCardSize - 97) / 2 }]}
          {...(Platform.OS === 'web' && {
            onMouseEnter: () => !forceState && setIsHoveredInternal(true),
          })}
        >
          <MiniButton
            label={isPro ? "Unlock for 2,99€" : "Unlock for 1,99€"}
            onPress={onUnlock || onPress}
          />
        </View>
      )}

      {/* Quick action button - only for unlocked hover cards */}
      {isHovered && !isLocked && !effectiveIsComingSoon && onHoverAction && hoverActionLabel && (
        <View
          style={[styles.buttonContainer, { left: (effectiveCardSize - 97) / 2 }]}
          {...(Platform.OS === 'web' && {
            onMouseEnter: () => !forceState && setIsHoveredInternal(true),
          })}
        >
          <MiniButton
            label={hoverActionLabel}
            onPress={onHoverAction}
            variant="primary"
          />
        </View>
      )}

      {/* Access Badge */}
      {!effectiveIsComingSoon && (isCustom || isPro) && (
        <ProBadge
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
          color={isCustom ? colors.teal : colors.primary}
          label={isCustom ? 'CUSTOM' : 'PRO'}
        />
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

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  cardOutline: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 9,
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
    zIndex: 1,
  },
  imageContainerHover: {
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
