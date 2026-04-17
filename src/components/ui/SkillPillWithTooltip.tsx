import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, fontFamilies } from '@/design-system';
import { LinkPill } from './LinkPill';
import { portalSkillTooltipToBody } from './skillTooltipWebPortal';

type WindowRect = { x: number; y: number; width: number; height: number };

const styles = StyleSheet.create({
  /**
   * Native only: flow layout so tooltips work inside ScrollViews without DOM portals.
   * Web uses a body portal + position:fixed (no layout shift — better for Agents carousel).
   */
  wrap: {
    alignItems: 'center',
    flexDirection: 'column-reverse',
  },
  wrapWebAnchor: {
    alignItems: 'center',
  },
  wrapWebFullWidth: {
    width: '100%',
    alignItems: 'stretch',
  },
  /** Use on card rows so tooltip centers above full-width previews (pills stay shrink-to-fit). */
  wrapFullWidth: {
    width: '100%',
  },
  tooltipContainer: {
    position: 'relative',
    marginBottom: 6,
    width: 220,
    maxWidth: '100%',
    alignSelf: 'center',
    borderRadius: 8,
    padding: 12,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' } as object,
      default: { elevation: 5 },
    }),
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

function useWebAnchorRect(enabled: boolean, anchorRef: React.RefObject<View | null | undefined>): WindowRect | null {
  const [rect, setRect] = useState<WindowRect | null>(null);

  const measure = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      setRect({ x, y, width: w, height: h });
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !enabled) {
      setRect(null);
      return;
    }
    measure();
  }, [enabled, measure]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [enabled, measure]);

  return Platform.OS === 'web' && enabled ? rect : null;
}

/** Fixed overlay in document space; escapes transforms/stacking (e.g. Agents carousel). */
function SkillTooltipOverlayWeb({
  anchor,
  tooltipText,
  bubbleColor,
  fgColor,
}: {
  anchor: WindowRect | null;
  tooltipText: string;
  bubbleColor: string;
  fgColor: string;
}) {
  if (!anchor || !tooltipText.trim()) return null;

  const left = anchor.x + anchor.width / 2;
  const top = anchor.y;

  const node = (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        transform: 'translate(-50%, calc(-100% - 10px))',
        width: 220,
        maxWidth: 'min(220px, calc(100vw - 24px))',
        zIndex: 100_000,
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        <div
          style={{
            backgroundColor: bubbleColor,
            borderRadius: 8,
            padding: 12,
            boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
            fontSize: 12,
            lineHeight: '16px',
            fontFamily: fontFamilies.figtree.regular,
            color: fgColor,
            textAlign: 'center',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {tooltipText.trim()}
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -6,
            marginLeft: -6,
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `6px solid ${bubbleColor}`,
          }}
        />
      </div>
    </div>
  );

  return portalSkillTooltipToBody(node);
}

/** DB mascot_skills row: summary → preview → full prompt when present (no tier gate). */
export function getSkillTooltipTextFromMascotSkill(skill: {
  skill_summary?: string | null;
  skill_prompt_preview?: string | null;
  skill_prompt?: string | null;
  is_full_access?: boolean | null;
  skill_label?: string | null;
}): string {
  const sum = skill.skill_summary?.trim() || '';
  const prev = skill.skill_prompt_preview?.trim() || '';
  const full = skill.skill_prompt?.trim() || '';
  const core = sum || prev || full;
  if (core) return core;
  const label = skill.skill_label?.trim();
  if (label) {
    return `Use ${label} for a guided response with clear next steps.`;
  }
  return '';
}

/** MascotDetails / agents carousel Skill shape: summary → preview → prompt. */
export function getSkillTooltipTextFromSummaryFields(skill: {
  summary?: string | null;
  promptPreview?: string | null;
  prompt?: string | null;
}): string {
  return (
    skill.summary?.trim() ||
    skill.promptPreview?.trim() ||
    skill.prompt?.trim() ||
    ''
  );
}

type TooltipInteractionArgs = {
  skillId: string;
  tooltipText: string;
  hoveredSkillId: string | null;
  onHoveredSkillChange: (id: string | null) => void;
  onPress?: () => void;
  disabled?: boolean;
};

export function useSkillTooltipInteraction({
  skillId,
  tooltipText,
  hoveredSkillId,
  onHoveredSkillChange,
  onPress,
  disabled,
}: TooltipInteractionArgs) {
  const hasTooltip = !!tooltipText.trim();
  const isActive = hoveredSkillId === skillId;
  const showTooltip = isActive && hasTooltip;

  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS === 'web') {
      onPress?.();
      return;
    }
    if (!hasTooltip) {
      onPress?.();
      return;
    }
    if (isActive) {
      onHoveredSkillChange(null);
      onPress?.();
    } else {
      onHoveredSkillChange(skillId);
    }
  };

  return { showTooltip, isActive, handlePress };
}

/**
 * react-native-web View forwards onMouseEnter/onMouseLeave (see forwardedProps.mouseProps),
 * but strips onHoverIn/onHoverOut — those only work on Pressable. Without DOM enter/leave,
 * tooltips never showed on web for wrapper Views.
 */
function webHoverProps(
  skillId: string,
  onHoveredSkillChange: (id: string | null) => void
): { onMouseEnter?: () => void; onMouseLeave?: () => void } {
  if (Platform.OS !== 'web') return {};
  return {
    onMouseEnter: () => onHoveredSkillChange(skillId),
    onMouseLeave: () => onHoveredSkillChange(null),
  };
}

function NativeInlineTooltip({
  tooltipText,
  bubbleColor,
  textColor,
}: {
  tooltipText: string;
  bubbleColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.tooltipContainer, { backgroundColor: bubbleColor }]}>
      <Text style={[styles.tooltipText, { color: textColor }]} numberOfLines={4}>
        {tooltipText.trim()}
      </Text>
      <View style={[styles.tooltipArrow, { borderTopColor: bubbleColor }]} />
    </View>
  );
}

export type SkillPillWithTooltipProps = {
  skillId: string;
  label: string;
  tooltipText: string;
  onPress?: () => void;
  color?: string;
  hoveredSkillId: string | null;
  onHoveredSkillChange: (id: string | null) => void;
  disabled?: boolean;
};

export function SkillPillWithTooltip({
  skillId,
  label,
  tooltipText,
  onPress,
  color,
  hoveredSkillId,
  onHoveredSkillChange,
  disabled,
}: SkillPillWithTooltipProps) {
  const { colors } = useTheme();
  const anchorRef = useRef<View>(null);
  const { showTooltip, isActive, handlePress } = useSkillTooltipInteraction({
    skillId,
    tooltipText,
    hoveredSkillId,
    onHoveredSkillChange,
    onPress,
    disabled,
  });
  const anchorWin = useWebAnchorRect(Platform.OS === 'web' && showTooltip, anchorRef);

  if (Platform.OS === 'web') {
    return (
      <>
        <View
          ref={anchorRef}
          collapsable={false}
          style={[styles.wrapWebAnchor, { zIndex: isActive ? 100 : 1 }]}
          {...webHoverProps(skillId, onHoveredSkillChange)}
        >
          <LinkPill
            label={label}
            onPress={handlePress}
            forceState={isActive ? 'hover' : undefined}
            color={color}
          />
        </View>
        <SkillTooltipOverlayWeb
          anchor={anchorWin}
          tooltipText={showTooltip ? tooltipText : ''}
          bubbleColor={colors.chatBubble}
          fgColor={colors.text}
        />
      </>
    );
  }

  return (
    <View
      style={[styles.wrap, { zIndex: isActive ? 100 : 1 }]}
      {...webHoverProps(skillId, onHoveredSkillChange)}
    >
      <LinkPill
        label={label}
        onPress={handlePress}
        forceState={isActive ? 'hover' : undefined}
        color={color}
      />
      {showTooltip && (
        <NativeInlineTooltip
          tooltipText={tooltipText}
          bubbleColor={colors.chatBubble}
          textColor={colors.text}
        />
      )}
    </View>
  );
}

export type SkillTooltipPressableProps = {
  skillId: string;
  tooltipText: string;
  hoveredSkillId: string | null;
  onHoveredSkillChange: (id: string | null) => void;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Same tooltip + hover / two-tap native behavior as SkillPillWithTooltip, for non-pill content (e.g. SkillPreview cards). */
export function SkillTooltipPressable({
  skillId,
  tooltipText,
  hoveredSkillId,
  onHoveredSkillChange,
  onPress,
  disabled,
  style,
  children,
}: SkillTooltipPressableProps) {
  const { colors } = useTheme();
  const anchorRef = useRef<View>(null);
  const { showTooltip, isActive, handlePress } = useSkillTooltipInteraction({
    skillId,
    tooltipText,
    hoveredSkillId,
    onHoveredSkillChange,
    onPress,
    disabled,
  });
  const anchorWin = useWebAnchorRect(Platform.OS === 'web' && showTooltip, anchorRef);

  if (Platform.OS === 'web') {
    return (
      <>
        <View
          ref={anchorRef}
          collapsable={false}
          style={[styles.wrapWebFullWidth, { zIndex: isActive ? 100 : 1 }]}
          {...webHoverProps(skillId, onHoveredSkillChange)}
        >
          <Pressable onPress={handlePress} style={style}>
            {children}
          </Pressable>
        </View>
        <SkillTooltipOverlayWeb
          anchor={anchorWin}
          tooltipText={showTooltip ? tooltipText : ''}
          bubbleColor={colors.chatBubble}
          fgColor={colors.text}
        />
      </>
    );
  }

  return (
    <View
      style={[styles.wrap, styles.wrapFullWidth, { zIndex: isActive ? 100 : 1 }]}
      {...webHoverProps(skillId, onHoveredSkillChange)}
    >
      <Pressable onPress={handlePress} style={style}>
        {children}
      </Pressable>
      {showTooltip && (
        <NativeInlineTooltip
          tooltipText={tooltipText}
          bubbleColor={colors.chatBubble}
          textColor={colors.text}
        />
      )}
    </View>
  );
}
