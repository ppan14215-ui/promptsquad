import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, fontFamilies } from '@/design-system';
import { resolveMascotColor, getContrastColor } from '@/lib/utils/mascot-colors';
import {
  Icon,
  BigPrimaryButton,
  SkillPreview,
  SkillEditor,
  PersonalityEditor,
  MascotEditor,
} from '@/components';
import {
  useIsAdmin,
  useMascots,
  useMascotSkills,
  useMascotPersonality,
  MascotSkill,
  updateMascot,
} from '@/services/admin';
import { useAuth } from '@/services/auth';

export default function SkillsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { mascots, isLoading: isMascotsLoading, refetch: refetchMascots } = useMascots();

  const [selectedMascotId, setSelectedMascotId] = useState<string | null>(null);
  const [skillEditorVisible, setSkillEditorVisible] = useState(false);
  const [personalityEditorVisible, setPersonalityEditorVisible] = useState(false);
  const [mascotEditorVisible, setMascotEditorVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState<MascotSkill | null>(null);

  // Get skills and personality for selected mascot
  const {
    skills,
    isLoading: isSkillsLoading,
    refetch: refetchSkills,
    error: skillsError,
  } = useMascotSkills(selectedMascotId);
  const {
    personality: mascotPersonality,
    isLoading: isPersonalityLoading,
    refetch: refetchPersonality,
  } = useMascotPersonality(selectedMascotId);

  // Log skills changes for debugging
  React.useEffect(() => {
    console.log('[SkillsScreen] Skills updated:', skills.length, 'skills for mascot', selectedMascotId);
    if (skills.length > 0) {
      console.log('[SkillsScreen] Skills:', skills.map(s => ({ id: s.id, label: s.skill_label, active: s.is_active })));
    }
  }, [skills, selectedMascotId]);

  const selectedMascot = mascots.find((m) => m.id === selectedMascotId);
  const mascotColor = resolveMascotColor(selectedMascot?.color);

  // Auto-select first mascot when loaded
  React.useEffect(() => {
    if (mascots.length > 0 && !selectedMascotId) {
      setSelectedMascotId(mascots[0].id);
    }
  }, [mascots, selectedMascotId]);

  const handleAddSkill = () => {
    setEditingSkill(null);
    setSkillEditorVisible(true);
  };

  const handleEditSkill = (skill: MascotSkill) => {
    setEditingSkill(skill);
    setSkillEditorVisible(true);
  };

  // Use a ref to track skills for debugging
  const skillsRef = useRef(skills);
  useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);

  const handleSkillSaved = async () => {
    console.log('[SkillsScreen] Skill saved, refreshing skills list...');
    console.log('[SkillsScreen] Current skills count before refetch:', skillsRef.current.length);

    try {
      // Add a small delay to ensure database commit is complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force refetch - this should update the skills state
      await refetchSkills();

      // Wait a bit for state to update, then log
      setTimeout(() => {
        console.log('[SkillsScreen] Skills list refreshed. New count:', skillsRef.current.length);
        if (skillsRef.current.length > 0) {
          console.log('[SkillsScreen] Skills:', skillsRef.current.map(s => s.skill_label));
        }
      }, 300);
    } catch (error) {
      console.error('[SkillsScreen] Error refreshing skills list:', error);
      console.error('[SkillsScreen] Skills error details:', error);
    }
  };

  const handlePersonalitySaved = () => {
    refetchPersonality();
  };

  const handleMascotSaved = async (name: string, subtitle: string, isPro: boolean, isFree: boolean, isReady: boolean, sortOrder: number, color: string) => {
    if (!selectedMascotId) return;
    try {
      await updateMascot(selectedMascotId, {
        name,
        subtitle,
        is_pro: isPro,
        is_free: isFree,
        is_ready: isReady,
        sort_order: sortOrder,
        color
      });
      // Refresh mascots list without reloading the page
      await refetchMascots();
    } catch (error) {
      console.error('Error updating mascot:', error);
      throw error;
    }
  };

  const handleMoveMascot = async (mascotId: string, direction: 'left' | 'right') => {
    const currentIndex = mascots.findIndex(m => m.id === mascotId);
    if (direction === 'left' && currentIndex > 0) {
      const otherMascot = mascots[currentIndex - 1];
      let currentSort = mascots[currentIndex].sort_order ?? currentIndex;
      let otherSort = otherMascot.sort_order ?? (currentIndex - 1);

      // If they are equal, force a difference
      if (currentSort === otherSort) {
        currentSort = currentIndex;
        otherSort = currentIndex - 1;
      }

      // Swap sort orders
      await updateMascot(mascotId, { sort_order: otherSort });
      await updateMascot(otherMascot.id, { sort_order: currentSort });
      await refetchMascots();
    } else if (direction === 'right' && currentIndex < mascots.length - 1) {
      const otherMascot = mascots[currentIndex + 1];
      let currentSort = mascots[currentIndex].sort_order ?? currentIndex;
      let otherSort = otherMascot.sort_order ?? (currentIndex + 1);

      // If they are equal, force a difference
      if (currentSort === otherSort) {
        currentSort = currentIndex;
        otherSort = currentIndex + 1;
      }

      // Swap sort orders
      await updateMascot(mascotId, { sort_order: otherSort });
      await updateMascot(otherMascot.id, { sort_order: currentSort });
      await refetchMascots();
    }
  };

  // Loading state
  if (isAdminLoading || isMascotsLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            styles.loadingText,
            { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
          ]}
        >
          Loading...
        </Text>
      </View>
    );
  }

  // Non-admin view
  if (!isAdmin) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.restrictedBox, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Icon name="lock" size={48} color={colors.textMuted} />
          <Text
            style={[
              styles.restrictedTitle,
              { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
            ]}
          >
            Admin Access Required
          </Text>
          <Text
            style={[
              styles.restrictedText,
              { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
            ]}
          >
            You need admin privileges to manage skills and personality.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
          ]}
        >
          Skills Management
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
          ]}
        >
          Manage mascot skills and personality
        </Text>
      </View>

      {/* Mascot Selector */}
      <View style={styles.mascotSelector}>
        <Text
          style={[
            styles.sectionLabel,
            { fontFamily: fontFamilies.figtree.medium, color: colors.text },
          ]}
        >
          Select Mascot
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mascotScroll}>
          {mascots.map((mascot) => {
            const isSelected = mascot.id === selectedMascotId;
            const mascotColor = resolveMascotColor(mascot.color);
            return (
              <View key={mascot.id} style={styles.mascotTabWrapper}>
                <Pressable
                  onPress={() => setSelectedMascotId(mascot.id)}
                  style={[
                    styles.mascotPill,
                    {
                      backgroundColor: isSelected ? mascotColor : colors.surface,
                      borderColor: isSelected ? mascotColor : colors.outline,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.mascotPillText,
                      {
                        fontFamily: fontFamilies.figtree.medium,
                        color: isSelected ? getContrastColor(mascotColor) : colors.text,
                      },
                    ]}
                  >
                    {mascot.name}
                  </Text>
                </Pressable>
                {isAdmin && isSelected && (
                  <View style={styles.reorderButtons}>
                    <Pressable onPress={() => handleMoveMascot(mascot.id, 'left')} style={styles.reorderButton}>
                      <Icon name="arrow-left" size={16} color={colors.textMuted} />
                    </Pressable>
                    <Pressable onPress={() => handleMoveMascot(mascot.id, 'right')} style={styles.reorderButton}>
                      <Icon name="arrow-right" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {selectedMascot && (
          <>
            {/* Mascot Details Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
                  ]}
                >
                  Mascot Details
                </Text>
                <Pressable
                  onPress={() => setMascotEditorVisible(true)}
                  style={[styles.editButton, { backgroundColor: colors.surface }]}
                >
                  <Icon name="edit" size={18} color={mascotColor} />
                  <Text
                    style={[
                      styles.editButtonText,
                      { fontFamily: fontFamilies.figtree.medium, color: mascotColor },
                    ]}
                  >
                    Edit
                  </Text>
                </Pressable>
              </View>
              <View
                style={[
                  styles.mascotDetailsBox,
                  { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
              >
                <Text
                  style={[
                    styles.mascotName,
                    { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
                  ]}
                >
                  {selectedMascot.name}
                </Text>
                {selectedMascot.subtitle && (
                  <Text
                    style={[
                      styles.mascotSubtitle,
                      { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
                    ]}
                  >
                    {selectedMascot.subtitle}
                  </Text>
                )}
                <View style={styles.mascotMeta}>
                  <Text
                    style={[
                      styles.mascotMetaText,
                      { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
                    ]}
                  >
                    ID: {selectedMascot.id} • Color: {selectedMascot.color}
                  </Text>
                </View>

                {/* Status Badges */}
                <View style={styles.badgesRow}>
                  {/* Pro Status - Only show if true (matches Home screen) */}
                  {selectedMascot.is_pro && (
                    <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      <Text style={[styles.badgeText, { color: colors.buttonText, fontFamily: fontFamilies.figtree.semiBold }]}>
                        PRO
                      </Text>
                    </View>
                  )}

                  {/* Ready Status - Only show if NOT ready (Hidden) */}
                  {!selectedMascot.is_ready && (
                    <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.textMuted }]}>
                      <Text style={[styles.badgeText, { color: colors.textMuted, fontFamily: fontFamilies.figtree.medium }]}>
                        Draft (Hidden)
                      </Text>
                    </View>
                  )}

                  {/* If visible/ready, we don't show a badge (standard behavior) */}
                </View>
              </View>
            </View>

            {/* Personality Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
                  ]}
                >
                  Mascot Personality
                </Text>
                <Pressable
                  onPress={() => setPersonalityEditorVisible(true)}
                  style={[styles.editButton, { backgroundColor: colors.surface }]}
                >
                  <Icon name="edit" size={18} color={mascotColor} />
                  <Text
                    style={[
                      styles.editButtonText,
                      { fontFamily: fontFamilies.figtree.medium, color: mascotColor },
                    ]}
                  >
                    Edit
                  </Text>
                </Pressable>
              </View>
              <View
                style={[
                  styles.instructionsBox,
                  { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
              >
                {isPersonalityLoading ? (
                  <ActivityIndicator size="small" color={mascotColor} />
                ) : mascotPersonality ? (
                  <Text
                    style={[
                      styles.instructionsText,
                      { fontFamily: fontFamilies.figtree.regular, color: colors.text },
                    ]}
                  >
                    {mascotPersonality.personality}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.noDataText,
                      { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
                    ]}
                  >
                    No personality set. Click Edit to add personality.
                  </Text>
                )}
              </View>
            </View>

            {/* Skills Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
                  ]}
                >
                  Skills ({skills.length})
                </Text>
                <BigPrimaryButton label="Add Skill" onPress={handleAddSkill} color={mascotColor} />
              </View>

              {isSkillsLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : skills.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    { backgroundColor: colors.surface, borderColor: colors.outline },
                  ]}
                >
                  <Icon name="add-circle" size={32} color={colors.textMuted} />
                  <Text
                    style={[
                      styles.emptyText,
                      { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
                    ]}
                  >
                    No skills yet. Add your first skill!
                  </Text>
                </View>
              ) : (
                <View style={styles.skillsList}>
                  {skills.map((skill) => (
                    <Pressable
                      key={skill.id}
                      onPress={() => handleEditSkill(skill)}
                      style={styles.skillCard}
                    >
                      <SkillPreview
                        skillLabel={skill.skill_label}
                        skillPromptPreview={skill.skill_prompt_preview || ''}
                        isFullAccess={skill.is_full_access || false}
                        fullPrompt={skill.skill_prompt || ''}
                        mascotColor={selectedMascot.color}
                      />
                      <View style={styles.skillCardOverlay}>
                        <Icon name="edit" size={16} color={mascotColor} />
                        <Text
                          style={[
                            styles.editHint,
                            { fontFamily: fontFamilies.figtree.regular, color: mascotColor },
                          ]}
                        >
                          Tap to edit
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Skill Editor Modal */}
      <SkillEditor
        visible={skillEditorVisible}
        onClose={() => setSkillEditorVisible(false)}
        onSave={handleSkillSaved}
        mascotId={selectedMascotId || ''}
        mascotName={selectedMascot?.name}
        mascotColor={selectedMascot?.color}
        skill={editingSkill}
      />

      {/* Personality Editor Modal */}
      <PersonalityEditor
        visible={personalityEditorVisible}
        onClose={() => setPersonalityEditorVisible(false)}
        onSave={handlePersonalitySaved}
        mascotId={selectedMascotId || ''}
        mascotName={selectedMascot?.name}
        personality={mascotPersonality}
      />

      {/* Mascot Editor Modal */}
      {selectedMascot && (
        <MascotEditor
          visible={mascotEditorVisible}
          mascotId={selectedMascot.id}
          currentName={selectedMascot.name}
          currentSubtitle={selectedMascot.subtitle}
          currentIsPro={selectedMascot.is_pro || false}
          currentIsFree={selectedMascot.is_free || false}
          currentIsReady={selectedMascot.is_ready !== false} // Default to true if null/undefined for backward compat
          currentSortOrder={selectedMascot.sort_order || 0}
          currentColor={selectedMascot.color}
          onClose={() => setMascotEditorVisible(false)}
          onSave={handleMascotSaved}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  restrictedBox: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 400,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  restrictedText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 16, // Reduced from 60 since SafeAreaView handles the top
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24, // Reduced from 28
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  mascotSelector: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  mascotScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  mascotPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  mascotPillText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 0,
    gap: 32,
    paddingBottom: 100,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
  },
  instructionsBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 80,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  noDataText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  loader: {
    marginTop: 24,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  skillsList: {
    gap: 16,
  },
  skillCard: {
    position: 'relative',
  },
  skillCardOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.8,
  },
  editHint: {
    fontSize: 12,
  },
  mascotDetailsBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  mascotName: {
    fontSize: 18,
    fontWeight: '600',
  },
  mascotSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  mascotMeta: {
    marginTop: 8,
    paddingTop: 8,
  },
  mascotMetaText: {
    fontSize: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mascotTabWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    marginRight: 10,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reorderButton: {
    padding: 2,
  },
});
