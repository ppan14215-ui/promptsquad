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
  ActivityIndicator,
} from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { BigPrimaryButton } from '@/components/ui/BigPrimaryButton';
import { BigSecondaryButton } from '@/components/ui/BigSecondaryButton';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { MascotSkill, createSkill, updateSkill, deleteSkill } from '@/services/admin';
import { LLM_OPTIONS, llmOptionSubtitle } from '@/services/preferences';
import { resolveMascotColor } from '@/lib/utils/mascot-colors';
import { logger } from '@/lib/utils/logger';

type SkillEditorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  mascotId: string;
  mascotName?: string;
  mascotColor?: string;
  skill?: MascotSkill | null; // null = create new, MascotSkill = edit existing
};

export function SkillEditor({
  visible,
  onClose,
  onSave,
  mascotId,
  mascotName,
  mascotColor,
  skill,
}: SkillEditorProps) {
  const { colors } = useTheme();
  const themeMascotColor = resolveMascotColor(mascotColor);
  const [skillLabel, setSkillLabel] = useState('');
  const [skillSummary, setSkillSummary] = useState('');
  const [skillPrompt, setSkillPrompt] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [preferredProvider, setPreferredProvider] = useState<string | null>('auto');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isModelPickerHovered, setIsModelPickerHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!skill;

  // Reset form when skill changes
  useEffect(() => {
    if (skill) {
      setSkillLabel(skill.skill_label);
      setSkillSummary(skill.skill_summary || '');
      setSkillPrompt(skill.skill_prompt || '');
      setSortOrder(skill.sort_order?.toString() || '0');
      setPreferredProvider(skill.preferred_provider || 'auto');
    } else {
      setSkillLabel('');
      setSkillSummary('');
      setSkillPrompt('');
      setSortOrder('0');
      setPreferredProvider('auto');
    }
    setError(null);
    setShowModelPicker(false);
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
          skill_summary: skillSummary.trim() || null,
          skill_prompt: skillPrompt.trim(),
          sort_order: parseInt(sortOrder, 10) || 0,
          preferred_provider: preferredProvider,
        });
      } else {
        await createSkill(
          mascotId,
          skillLabel.trim(),
          skillPrompt.trim(),
          parseInt(sortOrder, 10) || 0,
          preferredProvider,
          skillSummary.trim() || null
        );
      }
      logger.debug('[SkillEditor] Skill saved successfully, calling onSave callback');
      onSave();
      onClose();
    } catch (err: any) {
      logger.error('[SkillEditor] Error saving skill:', err);
      logger.error('[SkillEditor] Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        stack: err.stack,
      });
      setError(err.message || 'Failed to save skill. Please check the console for details.');
      // Don't close modal on error so user can see the error and try again
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
      logger.error('Error deleting skill:', err);
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
          <Text
            style={[
              styles.headerTitle,
              { fontFamily: fontFamilies.figtree.semiBold, color: colors.text },
            ]}
          >
            {isEditing ? 'Edit Skill' : 'New Skill'}
          </Text>
          {mascotName && (
            <Text
              style={[
                styles.headerSubtitle,
                { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
              ]}
            >
              for {mascotName}
            </Text>
          )}
          <Pressable
            onPress={onClose}
            style={[styles.closeButton, { zIndex: 10 }]}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Icon name="close" size={24} color={colors.text} />
          </Pressable>
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
                { fontFamily: fontFamilies.figtree.medium, color: colors.text },
              ]}
            >
              Skill Label *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  fontFamily: fontFamilies.figtree.regular,
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
                { fontFamily: fontFamilies.figtree.medium, color: colors.text },
              ]}
            >
              Sort Order
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.smallInput,
                {
                  fontFamily: fontFamilies.figtree.regular,
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

          {/* Preferred Model Picker */}
          <View style={[styles.fieldContainer, { zIndex: 100 }]}>
            <Text
              style={[
                styles.label,
                { fontFamily: fontFamilies.figtree.medium, color: colors.text },
              ]}
            >
              Preferred AI Model
            </Text>
            <Pressable
              onPress={() => setShowModelPicker(!showModelPicker)}
              style={[
                styles.input,
                {
                  fontFamily: fontFamilies.figtree.regular,
                  color: colors.text,
                  borderColor:
                    Platform.OS === 'web' && isModelPickerHovered ? colors.primary : colors.outline,
                  backgroundColor: colors.surface,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  minHeight: 48,
                  height: undefined,
                },
                Platform.OS === 'web' && ({ boxShadow: shadowToCSS('xs') } as unknown as object),
                Platform.OS === 'web' &&
                  ({ transition: 'border-color 140ms ease-out' } as unknown as object),
              ]}
              onHoverIn={() => {
                if (Platform.OS === 'web') setIsModelPickerHovered(true);
              }}
              onHoverOut={() => {
                if (Platform.OS === 'web') setIsModelPickerHovered(false);
              }}
            >
              <View style={{ flexShrink: 1 }}>
                <Text
                  style={{ fontFamily: fontFamilies.figtree.regular, color: colors.text, fontSize: 14 }}
                  numberOfLines={1}
                >
                  {LLM_OPTIONS.find((o) => o.code === (preferredProvider || 'auto'))?.name || 'Auto'}
                </Text>
                {(() => {
                  const sel = LLM_OPTIONS.find((o) => o.code === (preferredProvider || 'auto'));
                  const sub = llmOptionSubtitle(sel);
                  return sub ? (
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                      {sub}
                    </Text>
                  ) : null;
                })()}
              </View>
              <Icon name={showModelPicker ? "arrow-up" : "arrow-down"} size={20} color={colors.textMuted} />
            </Pressable>

            {showModelPicker && (
              <View
                style={{
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.outline,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  minWidth: 320,
                  alignSelf: 'stretch',
                  maxHeight: 280,
                }}
              >
                <ScrollView nestedScrollEnabled style={{ maxHeight: 280 }}>
                  {LLM_OPTIONS.map((option, index) => {
                    const optionSub = llmOptionSubtitle(option);
                    return (
                      <Pressable
                        key={option.code}
                        onPress={() => {
                          setPreferredProvider(option.code);
                          setShowModelPicker(false);
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderBottomWidth: index < LLM_OPTIONS.length - 1 ? 1 : 0,
                          borderBottomColor: colors.outline,
                          backgroundColor: preferredProvider === option.code ? themeMascotColor + '15' : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: preferredProvider === option.code ? fontFamilies.figtree.semiBold : fontFamilies.figtree.regular,
                            color: preferredProvider === option.code ? themeMascotColor : colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {option.name}
                        </Text>
                        {optionSub ? (
                          <Text
                            style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}
                            numberOfLines={1}
                          >
                            {optionSub}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Skill Prompt */}
          <View style={styles.fieldContainer}>
            <Text
              style={[
                styles.label,
                { fontFamily: fontFamilies.figtree.medium, color: colors.text },
              ]}
            >
              Skill Summary
            </Text>
            <Text
              style={[
                styles.hint,
                { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
              ]}
            >
              Short text shown on Agent page skill cards.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  fontFamily: fontFamilies.figtree.regular,
                  color: colors.text,
                  borderColor: colors.outline,
                  backgroundColor: colors.surface,
                },
                Platform.OS === 'web' && ({ boxShadow: shadowToCSS('xs') } as unknown as object),
              ]}
              value={skillSummary}
              onChangeText={setSkillSummary}
              placeholder="One concise summary line..."
              placeholderTextColor={colors.textMuted}
              editable={true}
              selectTextOnFocus={false}
              maxLength={180}
            />
          </View>

          {/* Skill Prompt */}
          <View style={styles.fieldContainer}>
            <Text
              style={[
                styles.label,
                { fontFamily: fontFamilies.figtree.medium, color: colors.text },
              ]}
            >
              Skill Prompt *
            </Text>
            <Text
              style={[
                styles.hint,
                { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted },
              ]}
            >
              The full system prompt for this skill. Use [placeholders] for user inputs.
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  fontFamily: fontFamilies.figtree.regular,
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
              <Text style={[styles.errorText, { color: '#C62828', fontFamily: fontFamilies.figtree.medium }]}>
                Error: {error}
              </Text>
            </View>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                {isEditing ? 'Updating skill...' : 'Creating skill...'}
              </Text>
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
              <Text style={[styles.deleteText, { fontFamily: fontFamilies.figtree.medium }]}>
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
              color={themeMascotColor}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal >
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  loadingText: {
    fontSize: 14,
  },
});
