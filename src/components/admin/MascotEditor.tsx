import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fontFamilies } from '@/design-system';
import { Icon } from '../ui/Icon';
import { BigPrimaryButton } from '../ui/BigPrimaryButton';
import { BigSecondaryButton } from '../ui/BigSecondaryButton';
import { InputField } from '../ui/InputField';

type AccessTier = 'free' | 'pro';

type MascotEditorProps = {
  visible: boolean;
  mascotId: string;
  currentName: string;
  currentSubtitle: string | null;
  currentBio?: string | null;
  currentLongBio?: string | null;
  currentIsPro?: boolean;
  currentIsFree?: boolean;
  currentIsReady?: boolean;
  currentIsVisible?: boolean;
  currentSortOrder?: number;
  currentColor?: string;
  onClose: () => void;
  onSave: (
    name: string,
    subtitle: string,
    shortBio: string,
    longBio: string,
    isPro: boolean,
    isFree: boolean,
    isReady: boolean,
    sortOrder: number,
    color: string,
    isVisible: boolean
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
};

function getAccessTier(isPro: boolean, isFree: boolean): AccessTier {
  if (isFree) return 'free';
  return 'pro'; // Default to pro if not free
}

export function MascotEditor({
  visible,
  mascotId,
  currentName,
  currentSubtitle,
  currentBio = '',
  currentLongBio = '',
  currentIsPro = false,
  currentIsFree = false,
  currentIsReady = false,
  currentIsVisible = true,
  currentSortOrder = 0,
  currentColor = 'yellow',
  onClose,
  onSave,
  onDelete,
}: MascotEditorProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const [name, setName] = useState(currentName);
  const [subtitle, setSubtitle] = useState(currentSubtitle || '');
  const [bio, setBio] = useState(currentBio || '');
  const [longBio, setLongBio] = useState(currentLongBio || '');
  const [accessTier, setAccessTier] = useState<AccessTier>(getAccessTier(currentIsPro, currentIsFree));
  const [isReady, setIsReady] = useState(currentIsReady);
  const [isVisible, setIsVisible] = useState(currentIsVisible);
  const [sortOrder, setSortOrder] = useState(String(currentSortOrder));
  const [color, setColor] = useState(currentColor);
  const [error, setError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setSubtitle(currentSubtitle || '');
      setBio(currentBio || '');
      setLongBio(currentLongBio || '');
      setAccessTier(getAccessTier(currentIsPro, currentIsFree));
      setIsReady(currentIsReady);
      setIsVisible(currentIsVisible);
      setSortOrder(String(currentSortOrder));
      setColor(currentColor);
      setError(null);
      setIsSaving(false);
    }
  }, [visible, currentName, currentSubtitle, currentBio, currentLongBio, currentIsPro, currentIsFree, currentIsReady, currentIsVisible, currentSortOrder, currentColor]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    const isPro = accessTier === 'pro';
    const isFree = accessTier === 'free';

    try {
      await onSave(
        name.trim(),
        subtitle.trim(),
        bio.trim(),
        longBio.trim(),
        isPro,
        isFree,
        isReady,
        parseInt(sortOrder, 10) || 0,
        color,
        isVisible
      );
      onClose();
    } catch (err: any) {
      console.error('MascotEditor save error:', err);
      setError(err.message || 'Failed to save mascot');
    } finally {
      setIsSaving(false);
    }
  };

  const tierOptions: { key: AccessTier; label: string; description: string }[] = [
    { key: 'free', label: 'Free', description: 'Available to all users' },
    { key: 'pro', label: 'Pro', description: 'Requires subscription' },
  ];

  const modalContentHeight = isNative ? Math.min(windowHeight * 0.9, windowHeight - insets.top - insets.bottom - 24) : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={true}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View
          style={[
            styles.modalView,
            { backgroundColor: colors.background, borderColor: colors.outline },
            isNative && modalContentHeight != null && { height: modalContentHeight, maxHeight: modalContentHeight },
            isNative && { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: Math.max(insets.left, 12), paddingRight: Math.max(insets.right, 12) },
          ]}
        >
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

          {/* Content - wrapped so ScrollView gets bounded height on native */}
          <View style={styles.contentWrapper}>
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
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

              <InputField
                label="Short bio"
                value={bio}
                onChangeText={(text) => {
                  setBio(text);
                  setError(null);
                }}
                placeholder="Short summary shown in mascot details card"
                multiline
                numberOfLines={3}
              />

              <InputField
                label="Long bio"
                value={longBio}
                onChangeText={(text) => {
                  setLongBio(text);
                  setError(null);
                }}
                placeholder="Long text shown on the Agents page"
                multiline
                numberOfLines={6}
              />

              <View style={styles.spacer} />

              {/* Access Tier Segmented Control */}
              <View style={[styles.segmentedContainer, { borderColor: colors.outline }]}>
                <Text style={[styles.switchLabel, { fontFamily: fontFamilies.figtree.medium, color: colors.text }]}>
                  Access Tier
                </Text>
                <Text style={[styles.switchDescription, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted, marginBottom: 12 }]}>
                  Determines which users can access this mascot
                </Text>
                <View style={[styles.segmentedControl, { backgroundColor: colors.outline + '40' }]}>
                  {tierOptions.map((option) => {
                    const isSelected = accessTier === option.key;
                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => setAccessTier(option.key)}
                        style={[
                          styles.segmentedOption,
                          isSelected && {
                            backgroundColor: option.key === 'pro' ? colors.primary : option.key === 'free' ? colors.green : colors.text,
                          },
                        ]}
                      >
                        <Text style={[
                          styles.segmentedOptionLabel,
                          {
                            fontFamily: fontFamilies.figtree.semiBold,
                            color: isSelected ? '#ffffff' : colors.text,
                          },
                        ]}>
                          {option.label}
                        </Text>
                        <Text style={[
                          styles.segmentedOptionDesc,
                          {
                            fontFamily: fontFamilies.figtree.regular,
                            color: isSelected ? 'rgba(255,255,255,0.75)' : colors.textMuted,
                          },
                        ]}>
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.spacer} />

              {/* Mascot Ready Toggle */}
              <View style={[styles.switchContainer, { borderColor: colors.outline }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { fontFamily: fontFamilies.figtree.medium, color: colors.text }]}>
                    Mascot Ready
                  </Text>
                  <Text style={[styles.switchDescription, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                    Configuration complete, skills & personality set up
                  </Text>
                </View>
                <Switch
                  value={isReady}
                  onValueChange={setIsReady}
                  trackColor={{ false: colors.outline, true: colors.green }}
                  thumbColor={'#ffffff'}
                />
              </View>

              {/* Visible to Users Toggle */}
              <View style={[styles.switchContainer, { borderColor: colors.outline }]}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { fontFamily: fontFamilies.figtree.medium, color: colors.text }]}>
                    Visible to Users
                  </Text>
                  <Text style={[styles.switchDescription, { fontFamily: fontFamilies.figtree.regular, color: colors.textMuted }]}>
                    When off, completely hidden from pro & standard users
                  </Text>
                </View>
                <Switch
                  value={isVisible}
                  onValueChange={setIsVisible}
                  trackColor={{ false: colors.outline, true: colors.primary }}
                  thumbColor={'#ffffff'}
                />
              </View>

              <View style={styles.spacer} />

              <InputField
                label="Sort Order"
                value={sortOrder}
                onChangeText={setSortOrder}
                placeholder="Enter sort order (e.g. 0, 1, 2...)"
                keyboardType="numeric"
              />

              <View style={styles.spacer} />

              <View style={styles.colorSelector}>
                <Text style={[styles.switchLabel, { fontFamily: fontFamilies.figtree.medium, color: colors.text, marginBottom: 8 }]}>
                  Mascot Color
                </Text>
                <View style={styles.colorGrid}>
                  {['yellow', 'red', 'green', 'pink', 'purple', 'darkPurple', 'brown', 'teal', 'orange', 'blue'].map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: (colors as any)[c] || c },
                        color === c && { borderColor: colors.text, borderWidth: 2 }
                      ]}
                    />
                  ))}
                </View>
              </View>

            </View>

            <View style={styles.spacer} />

            {/* Delete Button */}
            {onDelete && (
              <Pressable
                style={({ pressed }) => [
                  styles.deleteButton,
                  {
                    borderColor: colors.red,
                    backgroundColor: colors.red + '10',
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
                onPress={async () => {
                  if (Platform.OS === 'web') {
                    if (window.confirm(`Are you sure you want to delete "${currentName}"? This action cannot be undone.`)) {
                      try {
                        await onDelete();
                        onClose();
                      } catch (err: any) {
                        setError(err.message || 'Failed to delete mascot');
                      }
                    }
                  } else {
                    Alert.alert(
                      'Delete Mascot',
                      `Are you sure you want to delete "${currentName}"? This action cannot be undone.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await onDelete();
                              onClose();
                            } catch (err: any) {
                              setError(err.message || 'Failed to delete mascot');
                            }
                          }
                        }
                      ]
                    );
                  }
                }}
              >
                <Icon name="delete" size={20} color={colors.red} />
                <Text style={[styles.deleteButtonText, { color: colors.red, fontFamily: fontFamilies.figtree.medium }]}>
                  Delete Mascot
                </Text>
              </Pressable>
            )}

              {/* Error Display - inside scroll so it's visible when keyboard is open */}
              {error && (
                <View style={[styles.errorContainer, { backgroundColor: colors.red + '20', borderColor: colors.red }]}>
                  <Text style={[styles.errorText, { color: colors.red, fontFamily: fontFamilies.figtree.medium }]}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Footer - inside scroll on mobile so Save/Cancel are reachable above keyboard */}
              <View style={[styles.footer, { borderTopColor: colors.outline, marginTop: 8 }]}>
                <BigSecondaryButton label="Cancel" onPress={onClose} disabled={isSaving} />
                <BigPrimaryButton
                  label={isSaving ? "Saving..." : "Save Details"}
                  onPress={handleSave}
                  disabled={isSaving}
                />
              </View>
            </ScrollView>
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
  contentWrapper: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
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
  segmentedContainer: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segmentedOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  segmentedOptionLabel: {
    fontSize: 14,
  },
  segmentedOptionDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  colorSelector: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: '#D9D9D9',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
});
