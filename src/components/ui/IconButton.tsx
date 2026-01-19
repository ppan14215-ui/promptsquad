import React, { useState } from 'react';
import { Pressable, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/design-system';
import { Icon } from './Icon';
import { Svg, Path } from 'react-native-svg';

export type IconButtonState = 'default' | 'hover' | 'selected' | 'selected-hover';

export type IconButtonProps = {
  iconName: string;
  onPress?: () => void;
  /** Whether the button is selected */
  isSelected?: boolean;
  /** Force a specific state for preview purposes */
  forceState?: IconButtonState;
  size?: number;
  /** Whether the button is disabled */
  disabled?: boolean;
};

export function IconButton({
  iconName,
  onPress,
  isSelected = false,
  forceState,
  size = 16,
  disabled = false,
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

  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      onHoverIn={() => !forceState && !disabled && setIsHoveredInternal(true)}
      onHoverOut={() => !forceState && setIsHoveredInternal(false)}
      style={[
        styles.container,
        webTransitionStyle,
        {
          backgroundColor: isHovered ? colors.background : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        isHovered && innerBorderStyle,
      ]}
    >
      <View style={styles.iconContainer}>
        {iconName === 'favourite' && isSelectedState ? (
          // Use filled heart SVG for selected state
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19.4626 3.99415C16.7809 2.34923 14.4404 3.01211 13.0344 4.06801C12.4578 4.50096 12.1696 4.71743 12 4.71743C11.8304 4.71743 11.5422 4.50096 10.9656 4.06801C9.55962 3.01211 7.21909 2.34923 4.53744 3.99415C1.01807 6.15294 0.221721 13.2749 8.33953 19.2834C9.88572 20.4278 10.6588 21 12 21C13.3412 21 14.1143 20.4278 15.6605 19.2834C23.7783 13.2749 22.9819 6.15294 19.4626 3.99415Z"
              fill={colors.primary}
              stroke={colors.primary}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </Svg>
        ) : (
          <Icon 
            name={iconName as any}
            size={size}
            color={isSelectedState ? colors.primary : colors.icon}
          />
        )}
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

