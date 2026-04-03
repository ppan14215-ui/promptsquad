import { View, StyleSheet, Text, Pressable, Platform, useWindowDimensions, Modal, ActivityIndicator, Keyboard, LayoutAnimation, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { Icon, Skill, ChatInputBox, MascotDetails, HomeHeader, PaywallModal, MascotCardDeck } from '@/components';
import { SkillCard } from '@/components/ui/SkillCard';
import { useTheme, fontFamilies, shadowToCSS } from '@/design-system';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';
import { useSubscription } from '@/services/subscription';
import { useMascotSkills, useIsAdmin, useMascots, MascotBasic, deleteMascot } from '@/services/admin';
import { getMascotImageSource, getMascotGrayscaleImageSource } from '@/services/admin/mascot-images';
import { useUnlockedMascots } from '@/services/mascot-access';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FREE_MASCOTS,
  PREMIUM_MASCOTS,
  ALL_MASCOTS,
  COLOR_MAP,
  COLOR_LIGHT_MAP,
  MascotColor,
  OwnedMascot,
  mascotImages
} from '@/config/mascots';
import { useMergedMascots } from '@/hooks/useMergedMascots';
import { resolveMascotColor } from '@/lib/utils/mascot-colors';

// Responsive breakpoint
const DESKTOP_BREAKPOINT = 768;
const DESKTOP_SIDENAV_WIDTH = 300;

import { useChatPreferences } from '@/context/ChatPreferencesContext';

// ...

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { isAdmin } = useIsAdmin();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedIndex, setSelectedIndex] = useState(2); // Start with Panda selected (index 2)
  const [message, setMessage] = useState('');
  const [paywallProps, setPaywallProps] = useState<{ visible: boolean; feature?: string; mascotId?: string; mascotName?: string }>({ visible: false });

  const {
    webSearchEnabled, setWebSearchEnabled,
    deepThinkingEnabled, setDeepThinkingEnabled,
    llm: chatLLM, setLLM: setChatLLM
  } = useChatPreferences();

  const [selectedMascotDetails, setSelectedMascotDetails] = useState<OwnedMascot | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [hoveredHomeSkillId, setHoveredHomeSkillId] = useState<string | null>(null);
  const [hoveredSidenavIndex, setHoveredSidenavIndex] = useState<number | null>(null);
  const [hoverAddMoreAgents, setHoverAddMoreAgents] = useState(false);

  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // Use the new hook for merged mascots
  const { availableMascots, isLoading: isLoadingMascots, refetch: refetchMergedMascots } = useMergedMascots();
  // We still need this for specific checks if needed, but useMergedMascots handles the filtering
  const { unlockedMascotIds, isLoading: isLoadingUnlocked } = useUnlockedMascots();

  // Storage key for last selected mascot
  const LAST_MASCOT_KEY = 'lastSelectedMascotId';

  // Load last selected mascot on mount
  useEffect(() => {
    const loadLastMascot = async () => {
      try {
        const lastMascotId = await AsyncStorage.getItem(LAST_MASCOT_KEY);
        if (lastMascotId && availableMascots.length > 0) {
          const index = availableMascots.findIndex(m => m.id === lastMascotId);
          if (index !== -1) {
            setSelectedIndex(index);
          }
        }
      } catch (error) {
        // Handle error silently
      }
    };
    loadLastMascot();
  }, [isAdmin, availableMascots.length]); // Re-run when admin status or available mascots change

  // Listen for keyboard events on mobile
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardVisible(true);
      }
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardVisible(false);
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const selectedMascot = availableMascots[selectedIndex] || availableMascots[0];
  const isSelectedMascotLocked = !!selectedMascot && !selectedMascot.isFree && !isSubscribed && !isAdmin;

  useEffect(() => {
    setHoveredHomeSkillId(null);
  }, [selectedMascot?.id]);

  // Fetch skills from database for the selected mascot (only if mascot exists)
  const { skills: dbSkills } = useMascotSkills(selectedMascot?.id || '', selectedMascot?.isFree ?? false);

  // Use DB skills if available, otherwise fall back to hardcoded
  const displaySkills = useMemo(() => {
    if (!selectedMascot) return [];

    if (dbSkills.length > 0) {
      return dbSkills.map((s) => ({
        id: s.id,
        label: s.skill_label,
        prompt: s.skill_prompt || undefined,
        summary: s.skill_summary?.trim() || undefined,
        promptPreview: s.skill_prompt_preview?.trim() || undefined,
      }));
    }
    // Fallback to hardcoded skills if available
    if (selectedMascot.skills && selectedMascot.skills.length > 0) {
      return selectedMascot.skills;
    }
    // Final fallback: find from ALL_MASCOTS
    const hardcodedMascot = ALL_MASCOTS.find((m) => m.id === selectedMascot.id);
    return hardcodedMascot?.skills || [];
  }, [dbSkills, selectedMascot?.id, selectedMascot?.skills]);

  const homeSkillSummaries = useMemo(() => {
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
    const maxChars = 115;
    const clamp = (text: string) =>
      text.length > maxChars ? `${text.slice(0, maxChars - 1).trim()}…` : text;
    const summarize = (label: string, prompt?: string) => {
      const raw = prompt ? clean(prompt) : '';
      if (!raw) {
        return `Use ${label.toLowerCase()} to get a guided response with clear next steps.`;
      }
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
      const picked = sentences.slice(0, 2).join(' ');
      return clamp(picked);
    };
    return new Map(
      displaySkills.map((sk) => {
        const s = sk as Skill;
        const fromAdmin = s.summary?.trim();
        if (fromAdmin) return [sk.id, fromAdmin] as const;
        const fromPreview = s.promptPreview?.trim();
        if (fromPreview) return [sk.id, clamp(fromPreview)] as const;
        return [sk.id, summarize(sk.label, sk.prompt)] as const;
      })
    );
  }, [displaySkills]);

  const homeSkillAccent = useMemo(
    () => (selectedMascot ? resolveMascotColor(selectedMascot.color) : undefined),
    [selectedMascot?.color]
  );

  const userName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Julian';

  const handleDeckIndexChange = (newIndex: number) => {
    setSelectedIndex(newIndex);
    // Persist selection in background to avoid blocking swipe animation.
    void AsyncStorage.setItem(LAST_MASCOT_KEY, availableMascots[newIndex].id).catch((error) => {
      console.error('Error saving last mascot:', error);
    });
  };

  const handleSkillPress = (skill: Skill) => {
    if (!selectedMascot) return;
    if (selectedMascot.isComingSoon) return;
    if (isSelectedMascotLocked) {
      setPaywallProps({
        visible: true,
        feature: 'Premium Mascot',
        mascotId: selectedMascot.id,
        mascotName: selectedMascot.name,
      });
      return;
    }

    // Check if this is a database skill (has UUID-like ID)
    const isDbSkill = skill.id && skill.id.includes('-') && skill.id.length > 10;

    // Navigate to chat with params
    router.push({
      pathname: `/chat/${selectedMascot.id}`,
      params: {
        questionPrompt: selectedMascot.questionPrompt,
        initialMessage: skill.label,
        ...(isDbSkill && { skillId: skill.id }),
        webSearch: webSearchEnabled ? 'true' : 'false',
        deepThinking: deepThinkingEnabled ? 'true' : 'false',
        llm: chatLLM,
      },
    });
  };

  const handleSendMessage = (text?: string, attachment?: { uri: string; base64?: string; mimeType?: string }) => {
    const textToSend = typeof text === 'string' ? text : message;
    if (!textToSend.trim() && !attachment) return;
    if (selectedMascot?.isComingSoon) return;
    if (isSelectedMascotLocked) {
      setPaywallProps({
        visible: true,
        feature: 'Premium Mascot',
        mascotId: selectedMascot.id,
        mascotName: selectedMascot.name,
      });
      return;
    }

    // Navigate to chat with params
    router.push({
      pathname: `/chat/${selectedMascot.id}`,
      params: {
        questionPrompt: selectedMascot.questionPrompt,
        initialMessage: textToSend,
        ...(attachment && {
          initialAttachmentUri: attachment.uri,
          initialAttachmentMime: attachment.mimeType,
          initialAttachmentBase64: attachment.base64
        }),
        deepThinking: deepThinkingEnabled ? 'true' : 'false',
        llm: chatLLM,
        webSearch: webSearchEnabled ? 'true' : 'false',
      },
    });
    setMessage('');
  };

  const handleDeleteMascot = async (mascotId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this mascot? This action cannot be undone.');
      if (!confirmed) return;
    } else {
      // Create a promise to handle Alert async behavior on native
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Delete Mascot',
          'Are you sure you want to delete this mascot? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
          ]
        );
      });
      if (!confirmed) return;
    }

    try {
      await deleteMascot(mascotId);
      setSelectedMascotDetails(null);
      // Wait a moment for DB to update then refresh
      if (refetchMergedMascots) {
        setTimeout(() => refetchMergedMascots(), 500);
      }
    } catch (error) {
      console.error('Failed to delete mascot:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete mascot. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete mascot. Please try again.');
      }
    }
  };

  const mobileDeckMascots = useMemo(() => {
    return availableMascots.map((m, index) => {
      const isFreeMascot = m.isFree !== undefined ? m.isFree : (index < 4);
      const hasOwnedAccess = unlockedMascotIds.includes(m.id);
      const isLocked = !isFreeMascot && !isSubscribed && !isAdmin && !hasOwnedAccess;
      return {
        id: m.id,
        name: m.name,
        subtitle: m.subtitle,
        image: m.image,
        color: m.color,
        questionPrompt: m.questionPrompt,
        skills: m.skills || [],
        models: m.models || [],
        bio: m.bio,
        isCustom: m.isCustom || false,
        isPro: !m.isCustom && (m.isPro || isLocked),
        isLocked,
        isComingSoon: !!m.isComingSoon,
      };
    });
  }, [availableMascots, isAdmin, isSubscribed, unlockedMascotIds]);

  const launchFromDeck = (mascotId: string, questionPrompt: string, initialMessage?: string, skillId?: string) => {
    const selected = availableMascots.find((m) => m.id === mascotId);
    if (!selected) return;
    if (selected.isComingSoon) return;
    const hasOwnedAccess = unlockedMascotIds.includes(selected.id);
    const isLocked = !!selected && !selected.isFree && !isSubscribed && !isAdmin && !hasOwnedAccess;
    if (isLocked) {
      setPaywallProps({
        visible: true,
        feature: 'Premium Mascot',
        mascotId: selected.id,
        mascotName: selected.name,
      });
      return;
    }

    router.push({
      pathname: `/chat/${mascotId}`,
      params: {
        questionPrompt,
        ...(initialMessage ? { initialMessage } : {}),
        ...(skillId ? { skillId } : {}),
        webSearch: webSearchEnabled ? 'true' : 'false',
        deepThinking: deepThinkingEnabled ? 'true' : 'false',
        llm: chatLLM,
      },
    });
  };

  // Wrapper component - use KeyboardAvoidingView on both platforms
  // iOS: 'padding' behavior works best
  // Android: 'height' behavior works with adjustResize manifest setting
  const wrapperBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  // Show loading or empty state if no mascots available
  if (isLoadingMascots || isLoadingUnlocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedMascot || availableMascots.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No mascots available right now.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isDesktop) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.mobileDeckContainer}>
          <View style={styles.mobileDeckHeader}>
            <Text
              style={[
                styles.mobileDeckTitle,
                { color: colors.text, fontFamily: fontFamilies.figtree.semiBold },
              ]}
            >
              My agent deck
            </Text>
            <Text
              style={[
                styles.mobileDeckSubtitle,
                { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular },
              ]}
            >
              Swipe to explore, push to chat
            </Text>
          </View>
          <MascotCardDeck
            mascots={mobileDeckMascots}
            selectedIndex={selectedIndex}
            onIndexChange={handleDeckIndexChange}
            onActivateMascot={(mascot) => {
              launchFromDeck(mascot.id, mascot.questionPrompt);
            }}
            onActivateSkill={(mascot, skill) => {
              const isDbSkill = skill.id && skill.id.includes('-') && skill.id.length > 10;
              launchFromDeck(
                mascot.id,
                mascot.questionPrompt,
                skill.label,
                isDbSkill ? skill.id : undefined
              );
            }}
          />
          <Link href="/store" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t.home.addMoreAgents}
              style={StyleSheet.flatten([
                styles.sidenavAddMore,
                styles.mobileStoreLink,
                {
                  borderColor: colors.outline,
                  backgroundColor: colors.background,
                },
              ])}
            >
              <Icon name="add-circle" size={20} color={colors.textMuted} />
              <Text
                style={[
                  styles.sidenavAddMoreLabel,
                  {
                    color: colors.textMuted,
                    fontFamily: fontFamilies.figtree.semiBold,
                  },
                ]}
              >
                {t.home.addMoreAgents}
              </Text>
            </Pressable>
          </Link>
        </View>

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

  const handleSidenavMascotPress = (mascot: OwnedMascot, index: number) => {
    if (index === selectedIndex) {
      setSelectedMascotDetails(mascot);
      return;
    }
    setSelectedIndex(index);
    void AsyncStorage.setItem(LAST_MASCOT_KEY, mascot.id).catch((error) => {
      console.error('Error saving last mascot:', error);
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.desktopShell}>
        {/* Left: mascot sidenav (desktop only — mobile uses deck screen above) */}
        <View
          style={[
            styles.sidenav,
            {
              width: DESKTOP_SIDENAV_WIDTH,
              borderRightColor: colors.outline,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text
            style={[
              styles.sidenavTitle,
              { color: colors.textMuted, fontFamily: fontFamilies.figtree.semiBold },
            ]}
          >
            Your agents
          </Text>
          <ScrollView
            style={styles.sidenavScroll}
            contentContainerStyle={styles.sidenavScrollContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
            keyboardShouldPersistTaps="handled"
          >
            {availableMascots.map((m, index) => {
              const isFreeMascot = m.isFree !== undefined ? m.isFree : index < 4;
              const hasOwnedAccess = unlockedMascotIds.includes(m.id);
              const isLocked = !isFreeMascot && !isSubscribed && !isAdmin && !hasOwnedAccess;
              const isSelected = index === selectedIndex;
              const isNotReady = !!m.isComingSoon;
              const subtitleLine = (m.subtitle ?? '').trim();
              const isSidenavHover = Platform.OS === 'web' && hoveredSidenavIndex === index;
              const sidenavRowActive = isSelected || isSidenavHover;
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${m.name}`}
                  onPress={() => handleSidenavMascotPress(m, index)}
                  style={({ pressed }) => [
                    styles.sidenavBubble,
                    {
                      backgroundColor: sidenavRowActive ? colors.surface : 'transparent',
                      opacity: isNotReady
                        ? 0.52
                        : pressed && Platform.OS !== 'web'
                          ? 0.88
                          : 1,
                    },
                    Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                    Platform.OS === 'web'
                      ? ({
                          transitionDuration: '150ms',
                          transitionTimingFunction: 'ease-out',
                          transitionProperty: 'background-color',
                        } as any)
                      : null,
                  ]}
                  {...(Platform.OS === 'web'
                    ? {
                        onHoverIn: () => setHoveredSidenavIndex(index),
                        onHoverOut: () =>
                          setHoveredSidenavIndex((prev) => (prev === index ? null : prev)),
                      }
                    : {})}
                >
                  <ExpoImage
                    source={m.image}
                    style={[styles.sidenavAvatar, { backgroundColor: colors.surface }]}
                    contentFit="cover"
                    transition={0}
                  />
                  <View style={styles.sidenavBubbleTextCol}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.sidenavName,
                        {
                          color: isNotReady ? colors.textMuted : colors.text,
                          fontFamily: fontFamilies.figtree.semiBold,
                        },
                      ]}
                    >
                      {m.name}
                    </Text>
                    {subtitleLine ? (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.sidenavSubtitle,
                          { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular },
                        ]}
                      >
                        {subtitleLine}
                      </Text>
                    ) : null}
                  </View>
                  {isLocked ? <Icon name="lock" size={14} color={colors.textMuted} /> : null}
                </Pressable>
              );
            })}
            <Link href="/store" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t.home.addMoreAgents}
                style={StyleSheet.flatten([
                  styles.sidenavAddMore,
                  {
                    borderColor:
                      Platform.OS === 'web' && hoverAddMoreAgents ? colors.primary : colors.outline,
                    backgroundColor: colors.background,
                  },
                  Platform.OS === 'web' && hoverAddMoreAgents
                    ? ({ boxShadow: shadowToCSS('md') } as object)
                    : null,
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                  Platform.OS === 'web'
                    ? ({
                        transition: 'all 200ms ease-out',
                      } as any)
                    : null,
                ])}
                {...(Platform.OS === 'web'
                  ? {
                      onHoverIn: () => setHoverAddMoreAgents(true),
                      onHoverOut: () => setHoverAddMoreAgents(false),
                    }
                  : {})}
              >
                <Icon
                  name="add-circle"
                  size={20}
                  color={
                    Platform.OS === 'web' && hoverAddMoreAgents ? colors.primary : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.sidenavAddMoreLabel,
                    {
                      color:
                        Platform.OS === 'web' && hoverAddMoreAgents ? colors.primary : colors.textMuted,
                      fontFamily: fontFamilies.figtree.semiBold,
                    },
                  ]}
                >
                  {t.home.addMoreAgents}
                </Text>
              </Pressable>
            </Link>
          </ScrollView>
        </View>

        <KeyboardAvoidingView
          style={styles.desktopMain}
          behavior={wrapperBehavior}
          keyboardVerticalOffset={0}
        >
          {/* Top Section: Header + Skills (Pinned to Top) */}
          <HomeHeader
            userName={userName}
            questionPrompt={selectedMascot.questionPrompt}
            keyboardVisible={keyboardVisible}
            isDesktop={isDesktop}
          />

          <ScrollView
            style={styles.agentPanelScroll}
            contentContainerStyle={styles.agentPanelContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
            keyboardShouldPersistTaps="handled"
          >
            {!keyboardVisible && (
              <View
                style={[
                  styles.agentSkillsStack,
                  selectedMascot?.isComingSoon ? { opacity: 0.45 } : null,
                ]}
              >
                {displaySkills.map((skill) => {
                    const summaryText = (homeSkillSummaries.get(skill.id) ?? '').trim();
                    const isHovered = Platform.OS === 'web' && hoveredHomeSkillId === skill.id;
                    return (
                      <SkillCard
                        key={skill.id}
                        title={skill.label}
                        summary={summaryText.length > 0 ? summaryText : undefined}
                        onPress={() => handleSkillPress(skill)}
                        hovered={isHovered}
                        accentBorderColor={homeSkillAccent}
                        onHoverIn={() => setHoveredHomeSkillId(skill.id)}
                        onHoverOut={() =>
                          setHoveredHomeSkillId((prev) => (prev === skill.id ? null : prev))
                        }
                      />
                    );
                  })}
              </View>
            )}
          </ScrollView>

          <View style={[styles.bottomSection, styles.bottomSectionDesktopSidenav]}>
            <View
              style={[
                styles.inputSection,
                styles.inputSectionDesktop,
                { paddingBottom: Platform.OS !== 'web' ? Math.max(16, insets.bottom) : 24 },
              ]}
            >
              <ChatInputBox
                value={message}
                onChangeText={setMessage}
                onSend={(text, attachment) => handleSendMessage(text, attachment)}
                placeholder={selectedMascot?.questionPrompt || 'Ask anything...'}
                mascotColor={resolveMascotColor(selectedMascot.color)}
                showLLMPicker={true}
                chatLLM={chatLLM}
                onLLMChange={setChatLLM}
                deepThinkingEnabled={deepThinkingEnabled}
                onDeepThinkingToggle={() => setDeepThinkingEnabled(!deepThinkingEnabled)}
                webSearchEnabled={webSearchEnabled}
                onWebSearchToggle={() => setWebSearchEnabled(!webSearchEnabled)}
                isAdmin={isAdmin}
                isPro={isSubscribed || isAdmin}
                onVoicePress={() => console.log('Voice input not implemented on home screen')}
                maxWidth={800}
                disabled={!!selectedMascot?.isComingSoon}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Mascot Details Modal */}
      <Modal
        visible={selectedMascotDetails !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMascotDetails(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedMascotDetails(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            {selectedMascotDetails && (
              <MascotDetails
                name={selectedMascotDetails.name}
                subtitle={selectedMascotDetails.subtitle}
                imageSource={selectedMascotDetails.image}
                personality={selectedMascotDetails.personality}
                models={selectedMascotDetails.models}
                // Use displaySkills if this is the currently selected mascot (which has dynamic skills loaded)
                // Otherwise use the mascot's own skills (fallback/static)
                skills={selectedMascotDetails.id === selectedMascot?.id ? displaySkills : selectedMascotDetails.skills}
                variant={(!selectedMascotDetails.isFree && !isSubscribed && !isAdmin) ? "locked" : "available"}
                mascotId={selectedMascotDetails.id}
                isCustom={selectedMascotDetails.isCustom}
                onDelete={
                  // Allow delete if user is owner of custom mascot
                  (user && selectedMascotDetails.ownerId === user.id)
                    ? () => handleDeleteMascot(selectedMascotDetails.id)
                    : undefined
                }
                onClose={() => setSelectedMascotDetails(null)}
                onStartChat={() => {
                  setSelectedMascotDetails(null);
                  router.push({
                    pathname: `/chat/${selectedMascotDetails.id}`,
                    params: {
                      questionPrompt: selectedMascotDetails.questionPrompt,
                    },
                  });
                }}
                onTryOut={() => {
                  setSelectedMascotDetails(null);
                  router.push({
                    pathname: `/chat/${selectedMascotDetails.id}`,
                    params: {
                      questionPrompt: selectedMascotDetails.questionPrompt,
                    },
                  });
                }}
                onUnlock={() => {
                  setSelectedMascotDetails(null);
                  setPaywallProps({
                    visible: true,
                    feature: 'Premium Mascot',
                    mascotId: selectedMascotDetails.id,
                    mascotName: selectedMascotDetails.name,
                  });
                }}
                onSkillPress={(skill) => {
                  setSelectedMascotDetails(null);
                  const isDbSkill = skill.id && String(skill.id).length > 10;
                  router.push({
                    pathname: `/chat/${selectedMascotDetails.id}`,
                    params: {
                      questionPrompt: selectedMascotDetails.questionPrompt,
                      initialMessage: skill.label,
                      ...(isDbSkill ? { skillId: skill.id } : {}),
                    },
                  });
                }}
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
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  sidenav: {
    borderRightWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sidenavTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sidenavScroll: {
    flex: 1,
  },
  sidenavScrollContent: {
    paddingBottom: 16,
    paddingHorizontal: 6,
  },
  sidenavBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 3,
    borderRadius: 22,
  },
  sidenavAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sidenavBubbleTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  sidenavName: {
    fontSize: 16,
    lineHeight: 20,
  },
  sidenavSubtitle: {
    fontSize: 13,
    lineHeight: 16,
  },
  sidenavAddMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  sidenavAddMoreLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  mobileStoreLink: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginTop: 16,
  },
  agentPanelScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  agentPanelContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  agentSkillsStack: {
    gap: 12,
    width: '100%',
    alignItems: 'stretch',
  },
  desktopMain: {
    flex: 1,
    minWidth: 0,
  },
  mobileDeckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDeckHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  mobileDeckTitle: {
    fontSize: 26,
    lineHeight: 34,
    marginBottom: 6,
    textAlign: 'center',
  },
  mobileDeckSubtitle: {
    fontSize: 16,
    lineHeight: 16,
    textAlign: 'center',
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
  headerSection: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
    justifyContent: 'flex-start',
  },
  headerSectionDesktop: {
    alignItems: 'center',
  },
  headerSectionMobile: {
    // Reduce top padding on mobile
    paddingTop: 16,
  },
  headerSectionKeyboard: {
    // When keyboard is visible, minimize the header space
    // but keep flex: 1 so it doesn't collapse to 0
    paddingTop: 0,
    paddingBottom: 0,
  },
  headerContent: {
    width: '100%',
  },
  headerContentDesktop: {
    maxWidth: 678,
  },
  header: {
    gap: 4,
  },
  greeting: {
    fontSize: 18,
    lineHeight: 18 * 1.3,
  },
  questionPrompt: {
    fontSize: 28,
    lineHeight: 36,
  },
  skillPills: {
    marginTop: 16,
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 16,
  },
  bottomSectionDesktop: {
    alignItems: 'center',
  },
  bottomSectionDesktopSidenav: {
    gap: 0,
    paddingTop: 8,
  },
  carouselSection: {
    alignItems: 'center',
  },
  carousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mascotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mascotCard: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  mascotTextContainer: {
    alignItems: 'center',
    gap: 2,
  },
  mascotName: {
    textAlign: 'center',
  },
  mascotSubtitle: {
    textAlign: 'center',
  },
  mascotImage: {
    position: 'absolute',
    bottom: 0,
  },
  arrowButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  inputSectionDesktop: {
    // Container handles max width via ChatInputBox prop
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    // Prevents clicks from propagating to overlay
  },
});
