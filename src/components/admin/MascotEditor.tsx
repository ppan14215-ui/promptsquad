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
  Switch,
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
  currentIsPro?: boolean;
  currentIsFree?: boolean; // New Prop
  currentIsReady?: boolean;
  onClose: () => void;
  onSave: (name: string, subtitle: string, isPro: boolean, isFree: boolean, isReady: boolean) => Promise<void>;
};

export function MascotEditor({
  visible,
  mascotId,
  currentName,
  currentSubtitle,
  currentIsPro = false,
  currentIsFree = false, // Default
  currentIsReady = false,
  onClose,
  onSave,
}: MascotEditorProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(currentName);
  const [subtitle, setSubtitle] = useState(currentSubtitle || '');
  const [isPro, setIsPro] = useState(currentIsPro);
  const [isFree, setIsFree] = useState(currentIsFree); // State
  const [isReady, setIsReady] = useState(currentIsReady);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setSubtitle(currentSubtitle || '');
      setIsPro(currentIsPro);
      setIsFree(currentIsFree);
      setIsReady(currentIsReady);
      setError(null);
    }
  }, [visible, currentName, currentSubtitle, currentIsPro, currentIsFree, currentIsReady]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      await onSave(name.trim(), subtitle.trim(), isPro, isFree, isReady);
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
              <Text style={[styles.modalTitle, { fontFamily: fontFamilies.figtree.semiBold, color: colors.text }]}>
                Edit Mascot
              </Text>
              <Text style={[styles.modalSubtitle, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                Update properties and visibility
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
              />

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

              <View style={styles.spacer} />

              <View style={[styles.switchContainer, { borderColor: colors.outline }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { fontFamily: fontFamilies.figtree.medium, color: colors.text }]}>
                    Pro Mascot
                  </Text>
                  <Text style={[styles.switchDescription, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                    Requires subscription or purchase
                  </Text>
                </View>
                <Switch
                  value={isPro}
                  onValueChange={(value) => {
                    setIsPro(value);
                    if (value) setIsFree(false); // Turn off Free when Pro is turned on
                  }}
                  trackColor={{ false: colors.outline, true: colors.primary }}
                  thumbColor={'#ffffff'}
                />
              </View>

              <View style={[styles.switchContainer, { borderColor: colors.outline }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { fontFamily: fontFamilies.figtree.medium, color: colors.text }]}>
                    Free Mascot
                  </Text>
                  <Text style={[styles.switchDescription, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                    Available for free users (cheaper models)
                  </Text>
                </View>
                <Switch
                  value={isFree}
                  onValueChange={(value) => {
                    setIsFree(value);
                    if (value) setIsPro(false); // Turn off Pro when Free is turned on
                  }}
                  trackColor={{ false: colors.outline, true: colors.green }}
                  thumbColor={'#ffffff'}
                />
              </View>

              <View style={[styles.switchContainer, { borderColor: colors.outline }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { fontFamily: fontFamilies.figtree.medium, color: colors.text }]}>
                    Mascot Ready
                  </Text>
                  <Text style={[styles.switchDescription, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                    Visible to normal users in the app
                  </Text>
                </View>
                <Switch
                  value={isReady}
                  onValueChange={setIsReady}
                  trackColor={{ false: colors.outline, true: colors.primary }}
                  thumbColor={'#ffffff'}
                />
              </View>

            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.outline }]}>
            <BigSecondaryButton label="Cancel" onPress={onClose} />
            <BigPrimaryButton label="Save Details" onPress={handleSave} />
          </View>
        </View >
      </KeyboardAvoidingView >
    </Modal >
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
  },
});
