import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { BigPrimaryButton } from '@/components/ui/BigPrimaryButton';
import { BigSecondaryButton } from '@/components/ui/BigSecondaryButton';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { MascotSkill, createSkill, updateSkill, deleteSkill } from '@/services/admin';

type SkillEditorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  mascotId: string;
  mascotName?: string;
  skill?: MascotSkill | null; // null = create new, MascotSkill = edit existing
};

export function SkillEditor({
  visible,
  onClose,
  onSave,
  mascotId,
  mascotName,
  skill,
}: SkillEditorProps) {
  const { colors } = useTheme();
  const [skillLabel, setSkillLabel] = useState('');
  const [skillPrompt, setSkillPrompt] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!skill;

  // Reset form when skill changes
  useEffect(() => {
    if (skill) {
      setSkillLabel(skill.skill_label);
      setSkillPrompt(skill.skill_prompt || '');
      setSortOrder(String(skill.sort_order));
    } else {
      setSkillLabel('');
      setSkillPrompt('');
      setSortOrder('0');
    }
    setError(null);
  }, [skill, visible]);

  const handleSave = async () => {
    if (!skillLabel.trim()) {
      setError('Skill label is required');
      return;
    }
    if (!skillPrompt.trim()) {
      setError('Skill prompt is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEditing && skill) {
        await updateSkill(skill.id, {
          skill_label: skillLabel.trim(),
          skill_prompt: skillPrompt.trim(),
          sort_order: parseInt(sortOrder, 10) || 0,
        });
      } else {
        await createSkill(
          mascotId,
          skillLabel.trim(),
          skillPrompt.trim(),
          parseInt(sortOrder, 10) || 0
        );
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving skill:', err);
      setError(err.message || 'Failed to save skill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!skill) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteSkill(skill.id);
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error deleting skill:', err);
      setError(err.message || 'Failed to delete skill');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.outline }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.text} />
          </Pressable>
          <Text
            style={[
              styles.headerTitle,
              { fontFamily: fontFamilies.semibold, color: colors.text },
            ]}
          >
            {isEditing ? 'Edit Skill' : 'New Skill'}
          </Text>
          {mascotName && (
            <Text
              style={[
                styles.headerSubtitle,
                { fontFamily: fontFamilies.regular, color: colors.textSecondary },
              ]}
            >
              for {mascotName}
            </Text>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Skill Label */}
          <View style={styles.fieldContainer}>
            <Text
              style={[
                styles.label,
                { fontFamily: fontFamilies.medium, color: colors.text },
              ]}
            >
              Skill Label *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  fontFamily: fontFamilies.regular,
                  color: colors.text,
                  borderColor: colors.outline,
                  backgroundColor: colors.surface,
                },
                Platform.OS === 'web' && ({ boxShadow: shadowToCSS('xs') } as unknown as object),
              ]}
              value={skillLabel}
              onChangeText={setSkillLabel}
              placeholder="e.g., Stock analysis"
              placeholderTextColor={colors.textMuted}
              editable={true}
              selectTextOnFocus={false}
            />
          </View>

          {/* Sort Order */}
          <View style={styles.fieldContainer}>
            <Text
              style={[
                styles.label,
                { fontFamily: fontFamilies.medium, color: colors.text },
              ]}
            >
              Sort Order
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.smallInput,
                {
                  fontFamily: fontFamilies.regular,
                  color: colors.text,
                  borderColor: colors.outline,
                  backgroundColor: colors.surface,
                },
                Platform.OS === 'web' && ({ boxShadow: shadowToCSS('xs') } as unknown as object),
              ]}
              value={sortOrder}
              onChangeText={setSortOrder}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          {/* Skill Prompt */}
          <View style={styles.fieldContainer}>
            <Text
              style={[
                styles.label,
                { fontFamily: fontFamilies.medium, color: colors.text },
              ]}
            >
              Skill Prompt *
            </Text>
            <Text
              style={[
                styles.hint,
                { fontFamily: fontFamilies.regular, color: colors.textSecondary },
              ]}
            >
              The full system prompt for this skill. Use [placeholders] for user inputs.
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  fontFamily: fontFamilies.regular,
                  color: colors.text,
                  borderColor: colors.outline,
                  backgroundColor: colors.surface,
                },
                Platform.OS === 'web' && ({ boxShadow: shadowToCSS('xs') } as unknown as object),
              ]}
              value={skillPrompt}
              onChangeText={setSkillPrompt}
              placeholder="Enter the detailed skill prompt..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
              editable={true}
              selectTextOnFocus={false}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[styles.errorText, { color: '#C62828' }]}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Buttons */}
        <View style={[styles.footer, { borderTopColor: colors.outline }]}>
          {isEditing && (
            <Pressable
              onPress={handleDelete}
              disabled={isLoading}
              style={[styles.deleteButton, { opacity: isLoading ? 0.5 : 1 }]}
            >
              <Icon name="delete" size={20} color="#C62828" />
              <Text style={[styles.deleteText, { fontFamily: fontFamilies.medium }]}>
                Delete
              </Text>
            </Pressable>
          )}
          <View style={styles.actionButtons}>
            <BigSecondaryButton
              label="Cancel"
              onPress={onClose}
              disabled={isLoading}
            />
            <BigPrimaryButton
              label={isLoading ? 'Saving...' : 'Save Skill'}
              onPress={handleSave}
              disabled={isLoading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  fieldContainer: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  smallInput: {
    width: 100,
  },
  textArea: {
    minHeight: 250,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#C62828',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 'auto',
  },
});
