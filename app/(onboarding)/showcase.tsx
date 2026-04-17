import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigPrimaryButton, CircularMascotCarousel, Icon } from '@/components';
import { useTheme, textStyles, fontFamilies } from '@/design-system';
import { useMergedMascots } from '@/hooks/useMergedMascots';
import { useMascotsData } from '@/context/MascotsDataContext';
import { unlockMascots } from '@/services/mascot-access';

const DEFAULT_ONBOARDING_IDS = ['1', '2', '3', '4'];

/**
 * Carousel deck height mirrors the internal scale used by CircularMascotCarousel:
 * deckContainerHeight = round(420 * (cardWidth / 208))
 *   compact phone  (<=380): cardWidth 150 -> ~303
 *   mid phone/tab  (<768):  cardWidth 176 -> ~355
 *   desktop        (>=768): cardWidth 208 -> 420
 * Reserving this space + the arrow row + the description column prevents the
 * carousel from drifting vertically when bio text reflows or on index change.
 */
function getDeckReservedHeight(width: number): number {
  if (width <= 380) return 303;
  if (width < 768) return 355;
  return 420;
}

/**
 * Final onboarding step. Visually mirrors the live /(tabs)/agents view so the
 * user recognizes the layout when they land there after finishing onboarding.
 * Same header ("YOUR SQUAD OF AGENTS" + globe icon), same carousel, same
 * vertical rhythm — the only thing that differs is the CTA pinned to the
 * bottom, which unlocks the starter squad and routes into the app.
 */
export default function OnboardingShowcaseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { availableMascots, isLoading } = useMergedMascots();
  const { mascots, isLoading: isMascotsLoading } = useMascotsData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const isDesktop = width >= 768;

  const deckMascots = useMemo(() => {
    const byId = new Map(availableMascots.map((m) => [m.id, m]));
    const fixed = DEFAULT_ONBOARDING_IDS
      .map((id) => byId.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
    if (fixed.length === DEFAULT_ONBOARDING_IDS.length) return fixed;

    const freeBySort = [...mascots]
      .filter((m) => m.is_active !== false && m.is_free === true)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      .slice(0, 4)
      .map((m) => byId.get(m.id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));

    return freeBySort;
  }, [availableMascots, mascots]);

  useEffect(() => {
    if (!deckMascots.length) return;
    if (selectedIndex >= deckMascots.length) {
      setSelectedIndex(0);
    }
  }, [deckMascots.length, selectedIndex]);

  if (isLoading || isMascotsLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const idsToUnlock = deckMascots.map((m) => m.id);
      const { error } = await unlockMascots(idsToUnlock);
      if (error) throw error;
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Setup failed', 'Could not initialize your starter squad. Please try again.');
      setIsStarting(false);
    }
  };

  const deckReservedHeight = getDeckReservedHeight(width);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.pageContainer,
            Platform.OS === 'web' ? { paddingHorizontal: 48 } : null,
          ]}
        >
          {/* Section header — mirrors /(tabs)/agents so users land on a layout
              they already recognize. */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionHeaderIcon}>
                <Icon name="globe" size={14} color={colors.textMuted} strokeWidth={1.6} />
              </View>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, fontFamily: fontFamilies.figtree.medium },
                ]}
              >
                YOUR SQUAD OF AGENTS
              </Text>
            </View>
          </View>

          {/*
           * Fixed-height slot so description text reflow between mascots doesn't
           * make the carousel drift vertically.
           */}
          <View
            style={[
              styles.carouselContainer,
              { minHeight: deckReservedHeight },
            ]}
          >
            {deckMascots.length > 0 ? (
              <CircularMascotCarousel
                mascots={deckMascots}
                activeIndex={selectedIndex}
                onActiveIndexChange={setSelectedIndex}
                onActiveMascotPress={() => {}}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <Text
                  style={[
                    textStyles.body,
                    styles.emptyText,
                    { color: colors.textMuted },
                  ]}
                >
                  No mascots available right now.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/*
       * Footer sits outside the ScrollView so the CTA always stays visible
       * and doesn't shift with content.
       */}
      <View style={[styles.footer, isDesktop && styles.footerDesktop]}>
        <View style={styles.buttonWrap}>
          <BigPrimaryButton
            label={isStarting ? 'Setting up your squad...' : 'Start with Default Squad'}
            onPress={handleStart}
            disabled={isStarting || deckMascots.length < 4}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 24 : 8,
    paddingBottom: 16,
  },
  scrollContentDesktop: {
    justifyContent: 'center',
  },
  pageContainer: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  // Matches /(tabs)/agents spacing so the header sits the same distance from
  // the carousel in both places.
  sectionHeader: {
    width: '100%',
    marginBottom: 32,
    paddingTop: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  // Anchored at top of its slot — minHeight reserves vertical space so the
  // carousel doesn't move when bio text height changes between mascots.
  carouselContainer: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'stretch',
  },
  footerDesktop: {
    alignItems: 'center',
  },
  buttonWrap: {
    width: '100%',
    maxWidth: 420,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
