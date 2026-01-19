import React from 'react';
import { View, Text, Image, StyleSheet, Platform, ImageSourcePropType } from 'react-native';
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
      <Image source={mascotImage} style={styles.headerMascotImage} resizeMode="cover" />

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
        {tabs.map((tab) => (
          <ColoredTab key={tab.key} label={tab.label} isActive={activeTab === tab.key} onPress={() => onTabChange(tab.key)} />
        ))}
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
    gap: 8,
    paddingTop: 16,
    paddingLeft: 150,
    flexWrap: 'wrap',
  },
  favoriteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeCount: {
    fontSize: 11,
  },
});
