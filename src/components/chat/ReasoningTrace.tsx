import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme, fontFamilies, textStyles } from '@/design-system';
import { Icon } from '@/components';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ReasoningTraceProps = {
  /** Full reasoning text streamed so far. */
  reasoning: string;
  /** True while the model is still emitting reasoning tokens. */
  isStreaming: boolean;
  /** Wall-clock seconds the model spent thinking, once known. */
  seconds?: number;
  /** If true, the block is expanded by default. Default: expanded while streaming, collapsed afterwards. */
  defaultExpanded?: boolean;
};

/**
 * Collapsible chain-of-thought block. Mirrors the "Thought for Xs" affordance
 * in the Claude web UI: while the model is still reasoning we auto-expand and
 * stream the trace in italicized muted text; once it's done we collapse to a
 * single header ("Thought for 12s") that the user can tap to re-read the
 * reasoning.
 *
 * The component is deliberately UI-only — it doesn't talk to the LLM, it just
 * renders whatever `reasoning` string it's handed. Wire it up by passing the
 * accumulated `data.reasoning` chunks from secureChatStream's onReasoningChunk
 * callback, and flip `isStreaming` to false on onReasoningDone.
 */
export function ReasoningTrace({
  reasoning,
  isStreaming,
  seconds,
  defaultExpanded,
}: ReasoningTraceProps) {
  const { colors, mode } = useTheme();
  const [expanded, setExpanded] = useState<boolean>(
    defaultExpanded ?? isStreaming,
  );
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  // Auto-collapse when reasoning finishes (user can always re-expand).
  useEffect(() => {
    if (!isStreaming && defaultExpanded === undefined) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(false);
    }
  }, [isStreaming, defaultExpanded]);

  // Local timer while the trace is streaming, so the header says
  // "Thinking… 3s" in real time even before the backend sends a final count.
  useEffect(() => {
    if (!isStreaming) return;
    startRef.current = Date.now();
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, [isStreaming]);

  const displaySeconds = seconds ?? (isStreaming ? elapsed : undefined);

  const headerLabel = isStreaming
    ? displaySeconds && displaySeconds > 0
      ? `Thinking… ${displaySeconds}s`
      : 'Thinking…'
    : displaySeconds !== undefined
      ? `Thought for ${displaySeconds}s`
      : 'Reasoning';

  const borderColor = colors.outline;
  const bg = mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)';

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  // Nothing to show yet — don't flash an empty block.
  if (!isStreaming && !reasoning) return null;

  return (
    <View
      style={[
        styles.wrap,
        { borderColor, backgroundColor: bg },
      ]}
    >
      <Pressable
        onPress={toggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? 'Collapse reasoning' : 'Expand reasoning'
        }
      >
        <View style={styles.headerLeft}>
          {isStreaming ? (
            <ThinkingDots color={colors.textMuted} />
          ) : (
            <Icon
              name="idea"
              size={12}
              color={colors.textMuted}
              strokeWidth={1.8}
            />
          )}
          <Text
            style={[
              textStyles.caption,
              styles.headerLabel,
              {
                color: colors.textMuted,
                fontFamily: fontFamilies.figtree.medium,
              },
            ]}
            numberOfLines={1}
          >
            {headerLabel}
          </Text>
        </View>
        <Icon
          name={expanded ? 'arrow-up' : 'arrow-down'}
          size={14}
          color={colors.textMuted}
          strokeWidth={1.8}
        />
      </Pressable>

      {expanded && reasoning.length > 0 && (
        <View style={styles.body}>
          <Text
            style={[
              styles.bodyText,
              {
                color: colors.textMuted,
                fontFamily: fontFamilies.figtree.regular,
              },
            ]}
          >
            {reasoning}
            {isStreaming && <StreamingCaret color={colors.textMuted} />}
          </Text>
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Sub-components

const ThinkingDots = ({ color }: { color: string }) => {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = (v: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 520,
            delay,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 520,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ).start();
    };
    loop(a, 0);
    loop(b, 140);
    loop(c, 280);
  }, [a, b, c]);

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: a }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: b }]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, opacity: c }]} />
    </View>
  );
};

/** Tiny blinking caret placed at the tail of the streaming reasoning text. */
const StreamingCaret = ({ color }: { color: string }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);
  return (
    <Animated.Text style={{ color, opacity }}>▍</Animated.Text>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  headerLabel: {
    fontSize: 12,
    letterSpacing: 0.15,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 12,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
