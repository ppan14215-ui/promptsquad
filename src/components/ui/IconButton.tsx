import React, { useState } from 'react';
import { Pressable, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design-system';
import { Icon } from './Icon';

export type IconButtonState = 'default' | 'hover' | 'selected' | 'selected-hover';

export type IconButtonProps = {
  iconName: string;
  onPress?: () => void;
  /** Whether the button is selected */
  isSelected?: boolean;
  /** Force a specific state for preview purposes */
  forceState?: IconButtonState;
  size?: number;
};

export function IconButton({
  iconName,
  onPress,
  isSelected = false,
  forceState,
  size = 16,
}: IconButtonProps) {
  const { colors } = useTheme();
  const [isHoveredInternal, setIsHoveredInternal] = useState(false);

  // Determine effective state
  const effectiveState: IconButtonState = forceState ?? (
    isSelected 
      ? (isHoveredInternal ? 'selected-hover' : 'selected')
      : (isHoveredInternal ? 'hover' : 'default')
  );
  
  const isHovered = effectiveState === 'hover' || effectiveState === 'selected-hover';
  const isSelectedState = effectiveState === 'selected' || effectiveState === 'selected-hover';

  // Inner border shadow for hover states
  const innerBorderStyle = Platform.select({
    web: {
      boxShadow: 'inset 0px -1px 0px 0px rgba(10, 13, 18, 0.05)',
    } as unknown as object,
    default: {},
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
      onPress={onPress}
      onHoverIn={() => !forceState && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: isHovered ? colors.background : 'transparent',
        },
        isHovered && innerBorderStyle,
      ]}
    >
      <View style={styles.iconContainer}>
        <Icon 
          name={iconName}
          size={size}
          color={isSelectedState ? colors.primary : colors.icon}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default IconButton;

