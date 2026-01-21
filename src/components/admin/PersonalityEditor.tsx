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
import { MascotPersonality, upsertPersonality } from '@/services/admin';
import { logger } from '@/lib/utils/logger';

type PersonalityEditorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  mascotId: string;
  mascotName?: string;
  personality?: MascotPersonality | null;
};

export function PersonalityEditor({
  visible,
  onClose,
  onSave,
  mascotId,
  mascotName,
  personality,
}: PersonalityEditorProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when personality changes
  useEffect(() => {
    setText(personality?.personality || '');
    setError(null);
  }, [personality, visible]);

  const handleSave = async () => {
    if (!text.trim()) {
      setError('Personality is required');
      return;
    }

    if (!mascotId) {
      setError('Mascot ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.debug('[PersonalityEditor] Saving personality for mascot:', mascotId);
      logger.debug('[PersonalityEditor] Personality text length:', text.trim().length);
      
      const result = await upsertPersonality(mascotId, text.trim());
      
      logger.debug('[PersonalityEditor] Personality saved successfully:', result);
      
      // Call onSave to refresh the data
      onSave();
      
      // Close the modal
      onClose();
    } catch (err: any) {
      logger.error('[PersonalityEditor] Error saving personality:', err);
      logger.error('[PersonalityEditor] Error details:', {
        message: err.message,
        stack: err.stack,
        mascotId,
      });
      setError(err.message || 'Failed to save personality. Please check the console for details.');
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
          <Pressable 
            onPress={onClose} 
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={24} color={colors.text} />
          </Pressable>
          <Text
            style={[
              styles.headerTitle,
              { fontFamily: fontFamilies.semibold, color: colors.text },
            ]}
          >
            Mascot Personality
          </Text>
          {mascotName && (
            <Text
              style={[
                styles.headerSubtitle,
                { fontFamily: fontFamilies.regular, color: colors.textMuted },
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
          {/* Personality Info */}
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <Icon name="idea" size={20} color={colors.primary} />
            <Text
              style={[
                styles.infoText,
                { fontFamily: fontFamilies.regular, color: colors.textMuted },
              ]}
            >
              Personality defines the mascot's traits and behavior. It is combined with skill prompts to create the final system prompt for the AI.
            </Text>
          </View>

          {/* Personality Text Area */}
          <View style={styles.fieldContainer}>
            <Text
              style={[
                styles.label,
                { fontFamily: fontFamilies.medium, color: colors.text },
              ]}
            >
              Personality *
            </Text>
            <Text
              style={[
                styles.hint,
                { fontFamily: fontFamilies.regular, color: colors.textMuted },
              ]}
            >
              Define personality traits, communication style, and general behaviors.
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
              value={text}
              onChangeText={setText}
              placeholder="e.g., You are always friendly, very thorough, and ask questions to clarify before giving an answer. Never more than 2 questions at a time..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              editable={true}
              selectTextOnFocus={false}
            />
          </View>

          {/* Example Personality */}
          <View style={[styles.exampleBox, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <Text
              style={[
                styles.exampleTitle,
                { fontFamily: fontFamilies.medium, color: colors.text },
              ]}
            >
              Example Personality
            </Text>
            <Text
              style={[
                styles.exampleText,
                { fontFamily: fontFamilies.regular, color: colors.textMuted },
              ]}
            >
              {`• Be friendly and approachable
• Ask clarifying questions (max 2 at a time)
• Be thorough in your analysis
• Use markdown formatting for readability
• Stay focused on the user's request
• Provide actionable recommendations`}
            </Text>
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
          <View style={styles.actionButtons}>
            <BigSecondaryButton
              label="Cancel"
              onPress={onClose}
              disabled={isLoading}
            />
            <BigPrimaryButton
              label={isLoading ? 'Saving...' : 'Save Personality'}
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
    padding: 8,
    zIndex: 10,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
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
  textArea: {
    minHeight: 200,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  exampleBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 22,
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
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
