import { View, StyleSheet, Text, Pressable, Platform, Image, useWindowDimensions, Modal, ActivityIndicator, Keyboard, LayoutAnimation, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon, Skill, ChatInputBox, MascotDetails, LinkPill, HomeHeader, MascotCarousel, PaywallModal, FormattedText } from '@/components';
import { useTheme, fontFamilies } from '@/design-system';
import { useAuth } from '@/services/auth';
import { useSubscription } from '@/services/subscription';
import { useMascotSkills, MascotSkill, useIsAdmin, useMascots, MascotBasic } from '@/services/admin';
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

import { useChatPreferences } from '@/context/ChatPreferencesContext';

// ...

export default function HomeScreen() {
  const { colors } = useTheme();
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
  const [hoveredSkillPrompt, setHoveredSkillPrompt] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // Use the new hook for merged mascots
  const { availableMascots, isLoading: isLoadingMascots } = useMergedMascots();
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

  // Fetch skills from database for the selected mascot (only if mascot exists)
  const { skills: dbSkills, isLoading: skillsLoading } = useMascotSkills(selectedMascot?.id || '', selectedMascot?.isFree ?? false);

  // Use DB skills if available, otherwise fall back to hardcoded
  const displaySkills = useMemo(() => {
    if (!selectedMascot) return [];

    if (dbSkills.length > 0) {
      return dbSkills.map((s) => ({ id: s.id, label: s.skill_label, prompt: s.skill_prompt || undefined }));
    }
    // Fallback to hardcoded skills if available
    if (selectedMascot.skills && selectedMascot.skills.length > 0) {
      return selectedMascot.skills;
    }
    // Final fallback: find from ALL_MASCOTS
    const hardcodedMascot = ALL_MASCOTS.find((m) => m.id === selectedMascot.id);
    return hardcodedMascot?.skills || [];
  }, [dbSkills, selectedMascot?.id, selectedMascot?.skills]);

  const userName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Julian';

  const handlePrevMascot = async () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : availableMascots.length - 1;
    setSelectedIndex(newIndex);
    // Save to storage
    try {
      await AsyncStorage.setItem(LAST_MASCOT_KEY, availableMascots[newIndex].id);
    } catch (error) {
      console.error('Error saving last mascot:', error);
    }
  };

  const handleNextMascot = async () => {
    const newIndex = selectedIndex < availableMascots.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    // Save to storage
    try {
      await AsyncStorage.setItem(LAST_MASCOT_KEY, availableMascots[newIndex].id);
    } catch (error) {
      console.error('Error saving last mascot:', error);
    }
  };

  const handleSkillPress = (skill: Skill) => {
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



  const handleMascotCardPress = async (mascot: any, actualIndex: number, isSelected: boolean) => {
    // Find the full OwnedMascot from availableMascots
    const fullMascot = availableMascots.find(m => m.id === mascot.id);
    if (!fullMascot) return;
    if (isSelected) {
      // If already selected, open details modal
      setSelectedMascotDetails(fullMascot);
    } else {
      // If not selected, select this mascot
      setSelectedIndex(actualIndex);
      // Save to storage
      try {
        await AsyncStorage.setItem(LAST_MASCOT_KEY, fullMascot.id);
      } catch (error) {
        console.error('Error saving last mascot:', error);
      }
    }
  };

  const handleSkillHover = (skill: Skill | null) => {
    if (!skill) {
      setHoveredSkillPrompt(null);
      return;
    }

    // Check if skill object already has the prompt
    if ('prompt' in skill && typeof (skill as any).prompt === 'string') {
      setHoveredSkillPrompt((skill as any).prompt);
      return;
    }

    // Fallback: Find full skill data in DB skills
    const dbSkill = dbSkills.find(s => s.id === skill.id);
    if (dbSkill?.skill_prompt) {
      setHoveredSkillPrompt(dbSkill.skill_prompt);
    } else {
      setHoveredSkillPrompt(null);
    }
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
            No mascots available. Please complete onboarding.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={wrapperBehavior}
        keyboardVerticalOffset={0}
      >
        {/* Top Section: Header + Skills (Pinned to Top) */}
        <HomeHeader
          userName={userName}
          questionPrompt={selectedMascot.questionPrompt}
          skills={displaySkills}
          onSkillPress={handleSkillPress}
          onSkillHover={handleSkillHover}
          keyboardVisible={keyboardVisible}
          skillsLoading={skillsLoading}
          isDesktop={isDesktop}
        />

        {/* Spacer to push carousel and input to bottom */}
        <View style={styles.spacer}>
          {hoveredSkillPrompt && !keyboardVisible && (
            <ScrollView
              style={styles.previewScrollContainer}
              contentContainerStyle={styles.previewContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <FormattedText
                style={styles.previewText}
                baseColor={colors.textMuted}
              >
                {hoveredSkillPrompt}
              </FormattedText>
            </ScrollView>
          )}
        </View>

        {/* Bottom Section: Carousel + Input (Pinned to Bottom) */}
        <View style={styles.bottomSection}>
          <MascotCarousel
            mascots={availableMascots.map((m, index) => {
              // Free tier limit: Only mascots marked as FREE in DB
              // Unless user is Pro or Admin
              // Fallback to index logic if isFree is undefined (should fail safe to locked)
              const isFreeMascot = m.isFree !== undefined ? m.isFree : (index < 4);
              const isLocked = !isFreeMascot && !isSubscribed && !isAdmin;

              return {
                id: m.id,
                name: m.name,
                subtitle: m.subtitle,
                image: m.image,
                color: m.color as any,
                // If locked, we show Pro badge (or lock icon if supported)
                // isPro is passed from useMergedMascots which is equivalent to !isFree
                isPro: m.isPro || isLocked,
              };
            })}
            selectedIndex={selectedIndex}
            onMascotPress={(mascot, actualIndex, isSelected) => {
              // Find the full mascot object (since handler arg is incomplete)
              // But we can check availableMascots[actualIndex]
              const fullMascot = availableMascots[actualIndex];
              const isFreeMascot = fullMascot?.isFree !== undefined ? fullMascot.isFree : (actualIndex < 4);
              const isLocked = !isFreeMascot && !isSubscribed && !isAdmin;

              if (isLocked) {
                // Show upgrade alert
                // Show paywall
                setPaywallProps({
                  visible: true,
                  feature: 'Premium Mascot',
                  mascotId: fullMascot.id,
                  mascotName: fullMascot.name
                });
                return;
              }

              handleMascotCardPress(mascot, actualIndex, isSelected);
            }}
            onPrev={handlePrevMascot}
            onNext={handleNextMascot}
            isDesktop={isDesktop}
            scale={0.75}
          />

          {/* Chat Input - sits right below carousel */}
          <View style={[
            styles.inputSection,
            isDesktop && styles.inputSectionDesktop,
            { paddingBottom: Platform.OS !== 'web' ? Math.max(16, insets.bottom) : 24 },
          ]}>
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
              maxWidth={800} // Slightly wider on home screen
            />
          </View>
        </View>
      </KeyboardAvoidingView>

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
                variant="available"
                mascotId={selectedMascotDetails.id}
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
                onUnlock={() => console.log('Unlock pressed')}
                onSkillPress={(skill) => {
                  setSelectedMascotDetails(null);
                  router.push({
                    pathname: `/chat/${selectedMascotDetails.id}`,
                    params: {
                      questionPrompt: selectedMascotDetails.questionPrompt,
                      initialMessage: skill.label,
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
  spacer: {
    flex: 1,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 16,
  },
  bottomSectionDesktop: {
    alignItems: 'center',
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
  previewScrollContainer: {
    flex: 1,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  previewContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'normal',
    lineHeight: 20,
    opacity: 0.8,
    // @ts-ignore
    userSelect: 'none',
  },
});
