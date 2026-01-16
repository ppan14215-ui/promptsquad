import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, fontFamilies } from '@/design-system';
import {
  Icon,
  BigPrimaryButton,
  SkillPreview,
  SkillEditor,
  InstructionsEditor,
} from '@/components';
import {
  useIsAdmin,
  useMascots,
  useMascotSkills,
  useMascotInstructions,
  MascotSkill,
} from '@/services/admin';
import { useAuth } from '@/services/auth';

export default function SkillsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { mascots, isLoading: isMascotsLoading } = useMascots();

  const [selectedMascotId, setSelectedMascotId] = useState<string | null>(null);
  const [skillEditorVisible, setSkillEditorVisible] = useState(false);
  const [instructionsEditorVisible, setInstructionsEditorVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState<MascotSkill | null>(null);

  // Get skills and instructions for selected mascot
  const {
    skills,
    isLoading: isSkillsLoading,
    refetch: refetchSkills,
  } = useMascotSkills(selectedMascotId);
  const {
    instructions,
    isLoading: isInstructionsLoading,
    refetch: refetchInstructions,
  } = useMascotInstructions(selectedMascotId);

  const selectedMascot = mascots.find((m) => m.id === selectedMascotId);

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

  const handleSkillSaved = () => {
    refetchSkills();
  };

  const handleInstructionsSaved = () => {
    refetchInstructions();
  };

  // Loading state
  if (isAdminLoading || isMascotsLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            styles.loadingText,
            { fontFamily: fontFamilies.regular, color: colors.textSecondary },
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
          <Icon name="lock" size={48} color={colors.textSecondary} />
          <Text
            style={[
              styles.restrictedTitle,
              { fontFamily: fontFamilies.semibold, color: colors.text },
            ]}
          >
            Admin Access Required
          </Text>
          <Text
            style={[
              styles.restrictedText,
              { fontFamily: fontFamilies.regular, color: colors.textSecondary },
            ]}
          >
            You need admin privileges to manage skills and instructions.
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
            { fontFamily: fontFamilies.semibold, color: colors.text },
          ]}
        >
          Skills Management
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { fontFamily: fontFamilies.regular, color: colors.textSecondary },
          ]}
        >
          Manage mascot skills and instructions
        </Text>
      </View>

      {/* Mascot Selector */}
      <View style={styles.mascotSelector}>
        <Text
          style={[
            styles.sectionLabel,
            { fontFamily: fontFamilies.medium, color: colors.text },
          ]}
        >
          Select Mascot
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mascotScroll}>
          {mascots.map((mascot) => {
            const isSelected = mascot.id === selectedMascotId;
            return (
              <Pressable
                key={mascot.id}
                onPress={() => setSelectedMascotId(mascot.id)}
                style={[
                  styles.mascotPill,
                  {
                    backgroundColor: isSelected ? mascot.color || colors.primary : colors.surface,
                    borderColor: isSelected ? mascot.color || colors.primary : colors.outline,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.mascotPillText,
                    {
                      fontFamily: fontFamilies.medium,
                      color: isSelected ? '#FFFFFF' : colors.text,
                    },
                  ]}
                >
                  {mascot.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {selectedMascot && (
          <>
            {/* Instructions Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: fontFamilies.semibold, color: colors.text },
                  ]}
                >
                  Mascot Instructions
                </Text>
                <Pressable
                  onPress={() => setInstructionsEditorVisible(true)}
                  style={[styles.editButton, { backgroundColor: colors.surface }]}
                >
                  <Icon name="edit" size={18} color={colors.primary} />
                  <Text
                    style={[
                      styles.editButtonText,
                      { fontFamily: fontFamilies.medium, color: colors.primary },
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
                {isInstructionsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : instructions ? (
                  <Text
                    style={[
                      styles.instructionsText,
                      { fontFamily: fontFamilies.regular, color: colors.text },
                    ]}
                  >
                    {instructions.instructions}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.noDataText,
                      { fontFamily: fontFamilies.regular, color: colors.textMuted },
                    ]}
                  >
                    No instructions set. Click Edit to add instructions.
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
                    { fontFamily: fontFamilies.semibold, color: colors.text },
                  ]}
                >
                  Skills ({skills.length})
                </Text>
                <BigPrimaryButton label="Add Skill" onPress={handleAddSkill} />
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
                      { fontFamily: fontFamilies.regular, color: colors.textMuted },
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
                        skillPromptPreview={skill.skill_prompt_preview}
                        isFullAccess={skill.is_full_access}
                        fullPrompt={skill.skill_prompt}
                        mascotColor={selectedMascot.color}
                      />
                      <View style={styles.skillCardOverlay}>
                        <Icon name="edit" size={16} color={colors.primary} />
                        <Text
                          style={[
                            styles.editHint,
                            { fontFamily: fontFamilies.regular, color: colors.primary },
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
        skill={editingSkill}
      />

      {/* Instructions Editor Modal */}
      <InstructionsEditor
        visible={instructionsEditorVisible}
        onClose={() => setInstructionsEditorVisible(false)}
        onSave={handleInstructionsSaved}
        mascotId={selectedMascotId || ''}
        mascotName={selectedMascot?.name}
        instructions={instructions}
      />
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
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
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
});
