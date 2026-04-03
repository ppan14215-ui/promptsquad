import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, ScrollView, Modal, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';

import { CircularMascotCarousel, Icon, MascotDetails, PaywallModal } from '@/components';
import { useTheme, fontFamilies } from '@/design-system';
import { useMergedMascots } from '@/hooks/useMergedMascots';
import type { OwnedMascot } from '@/config/mascots';
import type { Skill } from '@/components';
import { useAuth } from '@/services/auth';
import { useSubscription } from '@/services/subscription';
import { useIsAdmin, useMascotSkills, MascotSkill, deleteMascot } from '@/services/admin';

export default function AgentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { isAdmin } = useIsAdmin();

  const { availableMascots, isLoading, refetch } = useMergedMascots();

  const [detailsMascot, setDetailsMascot] = useState<OwnedMascot | null>(null);
  const [paywallProps, setPaywallProps] = useState<{ visible: boolean; feature?: string; mascotId?: string; mascotName?: string }>({
    visible: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const LAST_MASCOT_KEY = 'lastSelectedMascotId';

  const deckMascots = useMemo(() => {
    return availableMascots.slice(0, 4);
  }, [availableMascots]);

  // Persist selection so the deck feels consistent between sessions.
  useEffect(() => {
    if (!deckMascots.length) return;

    let cancelled = false;
    const run = async () => {
      try {
        const lastMascotId = await AsyncStorage.getItem(LAST_MASCOT_KEY);
        if (cancelled) return;
        if (!lastMascotId) return;
        const idx = deckMascots.findIndex((m) => m.id === lastMascotId);
        if (idx >= 0) setSelectedIndex(idx);
      } catch {
        // Ignore persistence errors.
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [deckMascots]);

  useEffect(() => {
    if (!deckMascots.length) return;
    if (selectedIndex >= deckMascots.length) setSelectedIndex(0);
  }, [deckMascots.length, selectedIndex]);

  // Warm image cache to reduce first-paint lag in the carousel.
  useEffect(() => {
    const sources = deckMascots.flatMap((m) => [m.image, m.grayscaleImage]).filter(Boolean);
    const uris = sources
      .map((src: any) => (typeof src === 'string' ? src : src?.uri))
      .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
    if (!uris.length) return;
    void ExpoImage.prefetch(uris, 'memory-disk').catch(() => {});
  }, [deckMascots]);

  const { skills: detailsDbSkills } = useMascotSkills(detailsMascot?.id ?? '', detailsMascot?.isFree ?? false);

  const detailsModalSkills = useMemo((): Skill[] => {
    if (!detailsMascot) return [];
    if (detailsDbSkills.length > 0) {
      return detailsDbSkills.map((s: MascotSkill) => ({
        id: s.id,
        label: s.skill_label,
        prompt: s.skill_prompt || undefined,
        summary: s.skill_summary?.trim() || undefined,
        promptPreview: s.skill_prompt_preview?.trim() || undefined,
      }));
    }
    return detailsMascot.skills ?? [];
  }, [detailsDbSkills, detailsMascot]);

  const activeMascot = deckMascots[selectedIndex] ?? deckMascots[0];

  const recommendedAiPills = useMemo(() => {
    if (!activeMascot) return [];
    return (activeMascot.models ?? []).filter(Boolean).slice(0, 6);
  }, [activeMascot]);

  const bioText = useMemo(() => {
    if (!activeMascot) return '';

    const explicitLongBio = activeMascot.longBio?.trim();
    if (explicitLongBio) return explicitLongBio;

    const skillLabels = (activeMascot.skills ?? [])
      .map((s) => s.label)
      .filter(Boolean)
      .slice(0, 6);

    const models = (activeMascot.models ?? []).filter(Boolean).slice(0, 4);
    const prompt = activeMascot.questionPrompt?.trim();
    const subtitle = activeMascot.subtitle?.trim();

    const skillSentence = skillLabels.length
      ? `It focuses on ${skillLabels.join(', ')}, so you can move from a messy request to a clear deliverable without guessing.`
      : `It helps you go from a messy request to a clear deliverable by structuring the work and guiding the next steps.`;

    const modelSentence =
      models.length > 0
        ? `When you ask, it leans on ${models.join(', ')} to structure the output, fill gaps, and refine it until it matches what you meant.`
        : `When you ask, it structures the output and refines it until it matches what you meant.`;

    const promptSentence = prompt
      ? `You can use it to answer ${prompt} and turn the result into something you can ship.`
      : `You can use it to turn your input into something you can ship.`;

    const subtitleSentence = subtitle
      ? `For ${subtitle}, this is the fastest path from idea to execution.`
      : `This is the fastest path from idea to execution.`;

    return `${subtitleSentence} I built this to help you go from “what do I do?” to “here’s the work.” ${skillSentence} ${modelSentence} ${promptSentence}`;
  }, [activeMascot]);

  const handleStartChatWithSkill = (skill: Skill) => {
    if (!activeMascot) return;
    if (activeMascot.isComingSoon) return;

    router.push({
      pathname: `/chat/${activeMascot.id}`,
      params: {
        questionPrompt: activeMascot.questionPrompt,
        // Important: chat auto-sends when `initialMessage` is truthy.
        // We use the skill label so the chat starts with something meaningful,
        // even if the backend skill ID differs from this UI's skill ID.
        initialMessage: skill.label,
        // Pass label so chat can match either by id or by label.
        skillId: skill.label,
      },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!deckMascots.length) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{'No mascots available right now.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Wrapper component - use KeyboardAvoidingView on both platforms
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Platform.OS !== 'web' ? Math.max(12, insets.bottom) : 24,
            // RN Web: fill the scroll viewport so flexGrow + justifyContent center vertically.
            ...(Platform.OS === 'web' ? { minHeight: '100%' } : null),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View
          style={[
            styles.pageContainer,
            Platform.OS === 'web' ? { paddingHorizontal: 48 } : null,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionArrowIcon}>
                <Icon name="arrow-right" size={12} color={colors.textMuted} strokeWidth={1.6} />
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
          <CircularMascotCarousel
            mascots={deckMascots}
            activeIndex={selectedIndex}
            onActiveIndexChange={(next) => {
              setSelectedIndex(next);
              void AsyncStorage.setItem(LAST_MASCOT_KEY, deckMascots[next]?.id).catch(() => {});
            }}
            onActiveMascotPress={(mascot) => {
              if (mascot.isComingSoon) return;
              setDetailsMascot(mascot);
            }}
            descriptionChipsOverride={recommendedAiPills}
            descriptionTextOverride={bioText}
            onSkillTabPress={handleStartChatWithSkill}
          />
        </View>
      </ScrollView>

      <Modal visible={detailsMascot !== null} transparent animationType="fade" onRequestClose={() => setDetailsMascot(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDetailsMascot(null)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalContent}>
            {detailsMascot && (
              <MascotDetails
                name={detailsMascot.name}
                subtitle={detailsMascot.subtitle}
                imageSource={detailsMascot.image}
                personality={detailsMascot.personality}
                models={detailsMascot.models}
                skills={detailsModalSkills}
                customBio={detailsMascot.longBio ?? undefined}
                variant={!detailsMascot.isFree && !isSubscribed && !isAdmin ? 'locked' : 'available'}
                mascotId={detailsMascot.id}
                isPro={detailsMascot.isPro}
                isCustom={detailsMascot.isCustom}
                onClose={() => setDetailsMascot(null)}
                onStartChat={() => {
                  const id = detailsMascot.id;
                  setDetailsMascot(null);
                  router.push({ pathname: `/chat/${id}`, params: { questionPrompt: detailsMascot.questionPrompt } });
                }}
                onTryOut={() => {
                  const id = detailsMascot.id;
                  setDetailsMascot(null);
                  router.push({ pathname: `/chat/${id}`, params: { questionPrompt: detailsMascot.questionPrompt } });
                }}
                onUnlock={() => {
                  setPaywallProps({
                    visible: true,
                    feature: 'Premium Mascot',
                    mascotId: detailsMascot.id,
                    mascotName: detailsMascot.name,
                  });
                  setDetailsMascot(null);
                }}
                onSkillPress={(skill) => {
                  const id = detailsMascot.id;
                  const qp = detailsMascot.questionPrompt;
                  const isDbSkill = skill.id && String(skill.id).length > 10;
                  setDetailsMascot(null);
                  router.push({
                    pathname: `/chat/${id}`,
                    params: {
                      questionPrompt: qp,
                      initialMessage: skill.label,
                      ...(isDbSkill ? { skillId: skill.id } : {}),
                    },
                  });
                }}
                onDelete={
                  user && detailsMascot.isCustom && detailsMascot.ownerId === user.id
                    ? async () => {
                        const confirmed =
                          Platform.OS === 'web'
                            ? window.confirm('Delete this mascot? This cannot be undone.')
                            : await new Promise<boolean>((resolve) => {
                                Alert.alert('Delete Mascot', 'This cannot be undone.', [
                                  { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                                  { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
                                ]);
                              });
                        if (!confirmed) return;
                        try {
                          await deleteMascot(detailsMascot.id);
                          setDetailsMascot(null);
                          void refetch();
                        } catch {
                          if (Platform.OS === 'web') window.alert('Failed to delete mascot.');
                          else Alert.alert('Error', 'Failed to delete mascot.');
                        }
                      }
                    : undefined
                }
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <PaywallModal
        visible={paywallProps.visible}
        onClose={() => setPaywallProps({ ...paywallProps, visible: false })}
        feature={paywallProps.feature}
        mascotId={paywallProps.mascotId}
        mascotName={paywallProps.mascotName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageContainer: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
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
  sectionArrowIcon: {
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {},
});

