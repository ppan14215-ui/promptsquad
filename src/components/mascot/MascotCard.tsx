import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Platform, ImageSourcePropType } from 'react-native';
import { useTheme, textStyles, shadowToCSS, shadowToNative } from '@/design-system';
import { MiniButton } from '../ui/MiniButton';

export type MascotCardState = 'default' | 'hover' | 'locked' | 'locked-hover';

export type MascotCardProps = {
  id: string;
  name: string;
  subtitle: string;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  isLocked?: boolean;
  /** Force a specific state for preview purposes */
  forceState?: MascotCardState;
  /** Color variant for hover border (defaults to yellow) */
  colorVariant?: 'yellow' | 'red' | 'green' | 'pink';
};

export function MascotCard({
  name,
  subtitle,
  imageUrl,
  imageSource,
  onPress,
  isLocked = false,
  forceState,
  colorVariant = 'yellow',
}: MascotCardProps) {
  const { colors } = useTheme();
  const [isHoveredInternal, setIsHoveredInternal] = useState(false);

  // Determine effective state
  const effectiveState: MascotCardState = forceState ?? (
    isLocked 
      ? (isHoveredInternal ? 'locked-hover' : 'locked')
      : (isHoveredInternal ? 'hover' : 'default')
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

  // Grayscale filter for locked state (web only, native uses tintColor)
  const grayscaleStyle = Platform.select({
    web: isLockedState ? { filter: 'grayscale(100%)' } as unknown as object : {},
    default: {},
  });

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => !forceState && setIsHoveredInternal(true)}
      onHoverOut={(e) => {
        // Only trigger hover out if we're actually leaving the card
        // This prevents flickering when hovering over child elements like the button
        if (!forceState) {
          setIsHoveredInternal(false);
        }
      }}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: colors.background,
          // Native: 1px border
          borderWidth: Platform.OS === 'web' ? 0 : 1,
          borderColor: colors.outline,
        },
        // Web: Use inset box-shadow for border (inside the element, no layout shift)
        Platform.OS === 'web' && ({
          boxShadow: isHovered 
            ? `inset 0 0 0 2px ${hoverBorderColor}, ${shadowToCSS('md')}` 
            : `inset 0 0 0 1px ${colors.outline}`,
        } as unknown as object),
        // Native: Apply hover shadow separately
        Platform.OS !== 'web' && isHovered && hoverShadowStyle,
      ]}
    >
      {/* Mascot image - scaled up in hover and locked-hover states */}
      <View
        style={[
          styles.imageContainer,
          (isHovered || isLockedHover) && styles.imageContainerHover,
          Platform.OS === 'web' && ({ transition: 'all 200ms ease-out' } as unknown as object),
          grayscaleStyle,
          // Locked state: 20% opacity on web, handled via overlay on native
          isLockedState && Platform.OS === 'web' && { opacity: 0.2 },
        ]}
      >
        <Image
          source={imageSource || { uri: imageUrl }}
          style={[
            styles.image,
            // Native locked state: 20% opacity
            isLockedState && Platform.OS !== 'web' && { opacity: 0.2 },
          ]}
          resizeMode="cover"
        />
        {/* Grayscale overlay for native - now combined with opacity */}
        {isLockedState && Platform.OS !== 'web' && (
          <View style={styles.grayscaleOverlay} />
        )}
      </View>

      {/* Text content - zIndex ensures it's above image on hover */}
      <View style={[styles.textContainer, isHovered && styles.textContainerHover]}>
        <Text
          style={[
            styles.title,
            {
              fontFamily: textStyles.cardTitle.fontFamily,
              fontSize: textStyles.cardTitle.fontSize,
              lineHeight: textStyles.cardTitle.lineHeight,
              letterSpacing: textStyles.cardTitle.letterSpacing,
              color: isLockedState ? colors.textMuted : colors.text,
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

      {/* MiniButton for locked-hover state only - positioned at bottom of card with 16px padding */}
      {isLockedHover && (
        <View 
          style={styles.buttonContainer}
          {...(Platform.OS === 'web' && {
            onMouseEnter: () => {
              // Maintain hover state when mouse enters button
              if (!forceState) {
                setIsHoveredInternal(true);
              }
            },
          })}
        >
          <MiniButton 
            label="Unlock for 99ct" 
            onPress={onPress}
          />
        </View>
      )}
    </Pressable>
  );
}

const CARD_SIZE = 192;
const IMAGE_SIZE_DEFAULT = 128;
const IMAGE_SIZE_HOVER = 148;

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
    top: 65,
    left: (CARD_SIZE - IMAGE_SIZE_DEFAULT) / 2,
    zIndex: 1,
  },
  imageContainerHover: {
    width: IMAGE_SIZE_HOVER,
    height: IMAGE_SIZE_HOVER,
    top: 44,
    left: (CARD_SIZE - IMAGE_SIZE_HOVER) / 2,
    zIndex: 5, // Higher than text on hover
  },
  image: {
    width: '100%',
    height: '100%',
  },
  grayscaleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    // Using mix-blend-mode equivalent: making image appear grayscale
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 16, // 16px padding from bottom
    left: (CARD_SIZE - 97) / 2, // Center the button (button width ~97px from Figma)
    zIndex: 11,
  },
});

export default MascotCard;

