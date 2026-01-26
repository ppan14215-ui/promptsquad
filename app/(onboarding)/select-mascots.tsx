import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fontFamilies } from '@/design-system';
import { useMascots, MascotBasic } from '@/services/admin';
import { unlockMascots } from '@/services/mascot-access';
import { getMascotImageSource, getMascotGrayscaleImageSource } from '@/services/admin/mascot-images';
import { MascotCard, BigPrimaryButton, TextButton } from '@/components';
import type { MascotColorVariant } from '@/components/mascot/MascotCard';

const REQUIRED_SELECTION = 4;
const DESKTOP_BREAKPOINT = 768;

export default function SelectMascotsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { mascots, isLoading } = useMascots();
  const [selectedMascots, setSelectedMascots] = useState<string[]>([]);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Show all mascots: first 10 are free (selectable), 11-20 are pro (visible but not selectable)
  const allMascots = useMemo(() => {
    if (mascots.length === 0) return [];
    return mascots;
  }, [mascots]);

  // Only free mascots are selectable
  const selectableMascots = useMemo(() => {
    return allMascots.filter(m => m.is_free === true);
  }, [allMascots]);

  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const allSelected = selectedMascots.length === REQUIRED_SELECTION;

  const handleMascotToggle = (mascotId: string) => {
    setSelectedMascots(prev => {
      if (prev.includes(mascotId)) {
        // Deselect
        return prev.filter(id => id !== mascotId);
      } else {
        // Select (but limit to 4)
        if (prev.length >= REQUIRED_SELECTION) {
          Alert.alert(
            'Selection Limit',
            `You can only select ${REQUIRED_SELECTION} mascots. Please deselect one first.`
          );
          return prev;
        }
        return [...prev, mascotId];
      }
    });
  };

  const handleContinue = () => {
    if (selectedMascots.length !== REQUIRED_SELECTION) {
      Alert.alert('Selection Required', `Please select ${REQUIRED_SELECTION} mascots to continue.`);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setShowConfirmModal(false);
    setIsUnlocking(true);

    try {
      console.log('handleConfirm: Starting unlock process for mascots:', selectedMascots);

      const { error } = await unlockMascots(selectedMascots);

      if (error) {
        console.error('handleConfirm: Unlock failed:', error);
        Alert.alert(
          'Error',
          `Failed to unlock mascots: ${error.message || 'Unknown error'}. Please try again.`
        );
        setIsUnlocking(false);
        return;
      }

      console.log('handleConfirm: Successfully unlocked mascots, navigating to home');

      // Small delay to ensure database updates are propagated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to home
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Error in handleConfirm:', err);
      Alert.alert(
        'Error',
        `An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`
      );
      setIsUnlocking(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Pinned Header */}
      <View style={[styles.pinnedHeader, {
        backgroundColor: colors.background,
        borderBottomColor: colors.outline,
      }]}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: colors.text,
              },
            ]}
          >
            Choose Your Mascots
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                fontFamily: fontFamilies.figtree.regular,
                color: colors.textMuted,
              },
            ]}
          >
            Select {REQUIRED_SELECTION} mascots to get started. This choice cannot be changed later.
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextContainer}>
              <Text
                style={[
                  styles.progressText,
                  {
                    fontFamily: fontFamilies.figtree.medium,
                    color: colors.text,
                  },
                ]}
              >
                {selectedMascots.length} / {REQUIRED_SELECTION} selected
              </Text>
              <Text
                style={[
                  styles.progressPercentage,
                  {
                    fontFamily: fontFamilies.figtree.medium,
                    color: colors.textMuted,
                  },
                ]}
              >
                {Math.round((selectedMascots.length / REQUIRED_SELECTION) * 100)}%
              </Text>
            </View>
            <View style={[styles.progressBarContainer, { backgroundColor: colors.outline }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${(selectedMascots.length / REQUIRED_SELECTION) * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Scrollable Mascot Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {allMascots.map((mascot) => {
            const isSelected = selectedMascots.includes(mascot.id);
            const mascotId = parseInt(mascot.id);
            const isPro = mascot.is_pro || (mascotId >= 11 && mascotId <= 20); // Fallback to ID check if flag missing
            const isSelectable = mascot.is_free === true; // Use explicit is_free flag
            const isLocked = !isSelectable || (!isSelected && isSelectable);

            const imageSource = getMascotImageSource(mascot.image_url || '');
            const grayscaleSource = getMascotGrayscaleImageSource(mascot.image_url || '');

            return (
              <View key={mascot.id} style={styles.mascotCardWrapper}>
                <MascotCard
                  id={mascot.id}
                  name={mascot.name}
                  subtitle={mascot.subtitle || ''}
                  imageSource={imageSource}
                  grayscaleImageSource={grayscaleSource}
                  colorVariant={(mascot.color || 'yellow') as MascotColorVariant}
                  onPress={() => {
                    if (isSelectable) {
                      handleMascotToggle(mascot.id);
                    }
                  }}
                  isLocked={isLocked && !isSelected}
                  isPro={isPro}
                  isUnlocked={false}
                  forceState={isSelected ? 'hover' : (isLocked ? 'locked' : 'default')}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Pinned Continue Button */}
      <View style={[styles.pinnedButtonContainer, {
        backgroundColor: colors.background,
        paddingBottom: Math.max(16, insets.bottom),
        borderTopColor: colors.outline,
      }]}>
        <BigPrimaryButton
          label={allSelected ? `Continue with ${REQUIRED_SELECTION} Mascots` : `Continue with ${selectedMascots.length} Mascot${selectedMascots.length !== 1 ? 's' : ''}`}
          onPress={handleContinue}
          disabled={!allSelected || isUnlocking}
        />
        {isUnlocking && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            color={colors.primary}
          />
        )}
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowConfirmModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.confirmModalContent, { backgroundColor: colors.surface, borderColor: colors.outline }]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.text,
                },
              ]}
            >
              Confirm Selection
            </Text>
            <Text
              style={[
                styles.modalText,
                {
                  fontFamily: fontFamilies.figtree.regular,
                  color: colors.textMuted,
                },
              ]}
            >
              Do you wanna confirm the selection? This selection cannot be changed afterwards.
            </Text>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TextButton
                label="Cancel"
                onPress={() => setShowConfirmModal(false)}
              />
              <BigPrimaryButton
                label="Confirm"
                onPress={handleConfirm}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pinnedHeader: {
    paddingTop: Platform.OS === 'web' ? 16 : 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  contentContainerDesktop: {
    padding: 24,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    gap: 8,
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 16,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  progressText: {
    fontSize: 16,
  },
  progressPercentage: {
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  grid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  mascotCardWrapper: {
    position: 'relative',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      width: 'calc(50% - 8px)' as any,
      maxWidth: 280,
      minWidth: 200,
    } : {
      width: '48%',
    }),
  },
  pinnedButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  loadingIndicator: {
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 500 : '95%',
    borderRadius: 16,
    borderWidth: 1,
    padding: Platform.OS === 'web' ? 24 : 16,
    gap: Platform.OS === 'web' ? 20 : 16,
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    marginBottom: 8,
  },
  modalText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    lineHeight: Platform.OS === 'web' ? 22 : 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 12 : 8,
    marginTop: 8,
  },
});
