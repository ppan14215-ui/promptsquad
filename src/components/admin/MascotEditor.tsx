import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme, fontFamilies, shadowToCSS } from '@/design-system';
import { Icon } from '../ui/Icon';
import { BigPrimaryButton } from '../ui/BigPrimaryButton';
import { BigSecondaryButton } from '../ui/BigSecondaryButton';
import { InputField } from '../ui/InputField';

type MascotEditorProps = {
  visible: boolean;
  mascotId: string;
  currentName: string;
  currentSubtitle: string | null;
  onClose: () => void;
  onSave: (name: string, subtitle: string) => Promise<void>;
};

export function MascotEditor({
  visible,
  mascotId,
  currentName,
  currentSubtitle,
  onClose,
  onSave,
}: MascotEditorProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(currentName);
  const [subtitle, setSubtitle] = useState(currentSubtitle || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setSubtitle(currentSubtitle || '');
      setError(null);
    }
  }, [visible, currentName, currentSubtitle]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      await onSave(name.trim(), subtitle.trim());
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      // Don't close modal on error
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={[styles.modalView, { backgroundColor: colors.background, borderColor: colors.outline }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.outline }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
              <Icon name="edit" size={24} color={colors.buttonText} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.modalTitle, { fontFamily: fontFamilies.semibold, color: colors.text }]}>
                Edit Mascot
              </Text>
              <Text style={[styles.modalSubtitle, { fontFamily: fontFamilies.regular, color: colors.textMuted }]}>
                Update mascot details
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            <View style={styles.form}>
              <InputField
                label="Name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError(null);
                }}
                placeholder="Enter mascot name"
                error={error && error.includes('Name') ? error : undefined}
              />

              <View style={styles.spacer} />

              <InputField
                label="Subtitle"
                value={subtitle}
                onChangeText={(text) => {
                  setSubtitle(text);
                  setError(null);
                }}
                placeholder="Enter mascot subtitle"
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.outline }]}>
            <BigSecondaryButton label="Cancel" onPress={onClose} />
            <BigPrimaryButton label="Save" onPress={handleSave} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: Platform.OS === 'web' ? '40%' : '90%',
    maxWidth: 600,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  form: {
    gap: 16,
  },
  spacer: {
    height: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
});
