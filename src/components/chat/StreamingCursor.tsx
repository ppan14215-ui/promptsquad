import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/design-system';

/**
 * Blinking cursor shown at the end of streaming content.
 * Mimics Gemini/terminal-style feedback for a more natural typing feel.
 */
export function StreamingCursor() {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 530,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 530,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.cursor,
        { backgroundColor: colors.primary, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cursor: {
    width: 2,
    height: 18,
    marginLeft: 2,
    borderRadius: 1,
    alignSelf: 'center',
  },
});
