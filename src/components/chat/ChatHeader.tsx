import React from 'react';
import { View, Text, StyleSheet, Platform, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { IconButton, ColoredTab } from '@/components';
import { useTheme, textStyles, fontFamilies } from '@/design-system';

export type ChatHeaderTab = {
  key: string;
  label: string;
};

export type ChatHeaderProps = {
  mascotName: string;
  mascotSubtitle: string;
  mascotImage: ImageSourcePropType;
  isLiked: boolean;
  likeCount: number;
  onBack: () => void;
  onToggleLike: () => void;
  tabs: ChatHeaderTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  isToggling?: boolean;
  insets?: { top: number };
  // Trial progress props
  isTrial?: boolean;
  trialCount?: number;
  trialLimit?: number;
};

export function ChatHeader({
  mascotName,
  mascotSubtitle,
  mascotImage,
  isLiked,
  likeCount,
  onBack,
  onToggleLike,
  tabs,
  activeTab,
  onTabChange,
  isToggling = false,
  insets,
  isTrial = false,
  trialCount = 0,
  trialLimit = 5,
}: ChatHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.outline,
          paddingTop: Platform.OS !== 'web' ? Math.max(insets?.top ?? 0, 8) + 8 : 16,
        },
      ]}
    >
      <Image
        source={mascotImage}
        style={styles.headerMascotImage}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.headerRow}>
        <View style={styles.headerBackContainer}>
          <IconButton iconName="arrow-left" onPress={onBack} />
        </View>

        <View style={styles.headerTextContainer}>
          <Text
            style={[
              styles.headerMascotName,
              {
                fontFamily: textStyles.cardTitle.fontFamily,
                fontSize: 18,
                letterSpacing: 0.36,
                lineHeight: 23,
                color: colors.text,
              },
            ]}
          >
            {mascotName}
          </Text>
          <Text
            style={[
              styles.headerMascotSubtitle,
              {
                fontFamily: fontFamilies.figtree.medium,
                fontSize: 11,
                letterSpacing: 0.5,
                color: colors.textMuted,
              },
            ]}
          >
            {mascotSubtitle}
          </Text>
        </View>

        <View style={styles.favoriteContainer}>
          <IconButton iconName="favourite" isSelected={isLiked} onPress={onToggleLike} disabled={isToggling} />
          {likeCount > 0 && (
            <Text
              style={[
                styles.likeCount,
                {
                  fontFamily: fontFamilies.figtree.medium,
                  color: colors.textMuted,
                },
              ]}
            >
              {likeCount}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <View style={styles.tabsLeft}>
          {tabs.map((tab) => (
            <ColoredTab key={tab.key} label={tab.label} isActive={activeTab === tab.key} onPress={() => onTabChange(tab.key)} />
          ))}
        </View>

        {/* Trial Progress Bar - Inline with tabs, right-aligned */}
        {isTrial && (
          <View style={styles.trialProgressInline}>
            <Text
              style={[
                styles.trialProgressText,
                {
                  fontFamily: fontFamilies.figtree.medium,
                  fontSize: 12,
                  color: colors.textMuted,
                },
              ]}
            >
              Trial: {trialCount} / {trialLimit}
            </Text>
            <View style={[styles.trialProgressBarContainer, { backgroundColor: colors.outline }]}>
              <View
                style={[
                  styles.trialProgressBarFill,
                  {
                    width: `${(trialCount / trialLimit) * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingBottom: 16,
    flexDirection: 'column',
    gap: 4,
    borderBottomWidth: 1,
    position: 'relative',
    overflow: 'visible',
  },
  headerMascotImage: {
    position: 'absolute',
    width: 100,
    height: 100,
    left: 53,
    bottom: 0,
    zIndex: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    zIndex: 1,
  },
  headerBackContainer: {
    width: 143,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerMascotName: {
    textAlign: 'left',
  },
  headerMascotSubtitle: {
    textAlign: 'left',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingLeft: 150,
    gap: 16,
  },
  tabsLeft: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  favoriteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeCount: {
    fontSize: 11,
  },
  trialProgressInline: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 120,
  },
  trialProgressText: {
    textAlign: 'right',
    fontSize: 11,
  },
  trialProgressBarContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: 100,
  },
  trialProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
