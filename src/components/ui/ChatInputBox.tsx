import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Text,
  Image,
  Modal,
} from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative } from '@/design-system';
import { Icon } from './Icon';
import { PaywallModal } from './PaywallModal';
import { ProBadge } from './ProBadge';
import * as ImagePicker from 'expo-image-picker';
import { LLM_OPTIONS, LLMPreference, llmOptionSubtitle } from '@/services/preferences';
import { resolveMascotColor, getContrastColor } from '@/lib/utils/mascot-colors';

export type ChatInputBoxRef = {
  focus: () => void;
};

type ChatInputBoxProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text: string, attachment?: { uri: string; base64?: string; mimeType?: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  mascotColor?: string;
  // LLM picker
  showLLMPicker?: boolean;
  chatLLM?: LLMPreference;
  onLLMChange?: (llm: LLMPreference) => void;
  // Toggle buttons
  webSearchEnabled?: boolean;
  onWebSearchToggle?: () => void;
  deepThinkingEnabled?: boolean;
  onDeepThinkingToggle?: () => void;
  // Admin-only features
  isAdmin?: boolean;
  // Voice
  isRecording?: boolean;
  onVoicePress?: () => void;
  // Pro status
  isPro?: boolean;
  maxWidth?: number;
  isLoading?: boolean;
};

export const ChatInputBox = forwardRef<ChatInputBoxRef, ChatInputBoxProps>(({
  value,
  onChangeText,
  onSend,
  placeholder = 'Write a message',
  disabled = false,
  mascotColor = '#EDB440',
  showLLMPicker: showLLMPickerProp = true,
  chatLLM = 'auto',
  onLLMChange,
  webSearchEnabled = false,
  onWebSearchToggle,
  deepThinkingEnabled = false,
  onDeepThinkingToggle,
  isAdmin = false,
  isRecording = false,
  onVoicePress,
  isPro = false,
  maxWidth = 720,
  isLoading = false,
}, ref) => {
  const { mode, colors } = useTheme();
  const [showLLMDropdown, setShowLLMDropdown] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showWebSearchTooltip, setShowWebSearchTooltip] = useState(false);
  const [showDeepThinkingTooltip, setShowDeepThinkingTooltip] = useState(false);
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [isWebSearchHovered, setIsWebSearchHovered] = useState(false);
  const [isDeepThinkingHovered, setIsDeepThinkingHovered] = useState(false);
  const [isSendHovered, setIsSendHovered] = useState(false);
  const [isLlmPickerHovered, setIsLlmPickerHovered] = useState(false);
  const [hoveredLlmOption, setHoveredLlmOption] = useState<LLMPreference | null>(null);
  const [isContainerHovered, setIsContainerHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(48); // Start with min height
  const [attachedImage, setAttachedImage] = useState<{ uri: string; base64?: string; mimeType?: string } | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const sendButtonColor = resolveMascotColor(mascotColor);
  const sendIconColor = getContrastColor(sendButtonColor);
  const accentOutline = isContainerHovered || isInputFocused;
  const containerShadowStyle = Platform.select({
    web: {
      boxShadow: shadowToCSS(accentOutline ? 'lg' : 'xs'),
    } as object,
    default: shadowToNative(accentOutline ? 'lg' : 'xs'),
  });
  const webIconTransitionStyle = Platform.select({
    web: {
      transition: 'all 160ms ease-out',
      cursor: 'pointer',
    } as unknown as object,
    default: {},
  });

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      // Use setTimeout to ensure focus happens after any DOM updates
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
  }));

  const isSendDisabled = disabled || isLoading || (!value.trim() && !attachedImage);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disabled to avoid crop UI issues on mobile
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[ChatInput] Image selected:', result.assets[0].mimeType);
        setAttachedImage({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64 ?? undefined,
          mimeType: result.assets[0].mimeType ?? 'image/jpeg',
        });
        // On web, focus doesn't always work immediately after file picker closes
        setTimeout(() => inputRef.current?.focus(), 500);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const clearAttachment = () => {
    setAttachedImage(null);
  };

  const handleSend = () => {
    // If we have an image but no text, we can still send
    if (attachedImage || value.trim()) {
      onSend(value, attachedImage || undefined);
      setAttachedImage(null);
      // Reset height is handled by effect on value change, but if value was empty:
      if (!value.trim()) setInputHeight(MIN_INPUT_HEIGHT);
    }
  };

  // Min and max heights for the input
  const MIN_INPUT_HEIGHT = 48;
  const MAX_INPUT_HEIGHT = 200; // Max height before scrolling (like Gemini)

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    // Clamp height between min and max
    const newHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(height, MAX_INPUT_HEIGHT));
    setInputHeight(newHeight);
  };

  // Reset height when value is cleared (e.g., after sending)
  useEffect(() => {
    if (!value.trim()) {
      setInputHeight(MIN_INPUT_HEIGHT);
    }
  }, [value]);

  useEffect(() => {
    if (!showLLMDropdown) setHoveredLlmOption(null);
  }, [showLLMDropdown]);

  const handlePaste = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;

    // Check for image data in clipboard
    const items = e.clipboardData?.items;
    if (!items) return;

    // Convert DataTransferItemList to array
    const itemsArray = Array.from(items) as DataTransferItem[];

    for (const item of itemsArray) {
      if (item.type && item.type.indexOf('image') !== -1) {
        // Found an image
        e.preventDefault(); // Prevent default paste behavior for images

        const blob = item.getAsFile();
        if (!blob) continue;

        const reader = new FileReader();

        reader.onload = (event) => {
          if (event.target?.result) {
            const uri = event.target.result as string;
            setAttachedImage({
              uri,
              mimeType: item.type,
              base64: uri.split(',')[1],
            });
          }
        };

        reader.readAsDataURL(blob);
        return;
      }
    }
  }, []);

  // Attach paste event listener on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !inputRef.current) return;

    const inputElement = inputRef.current as any;
    inputElement.addEventListener('paste', handlePaste);

    return () => {
      inputElement.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const handleKeyPress = (e: any) => {
    // Send on Enter (without Shift for new line)
    // Only if not disabled (has text or image)
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      if (!isSendDisabled) {
        handleSend();
      }
    }
  };

  return (
    <>
      <View
        style={[
          styles.container,
          containerShadowStyle,
          {
            backgroundColor: mode === 'dark' ? colors.surface : colors.background,
            borderColor: accentOutline ? sendButtonColor : colors.outline,
            maxWidth,
          },
          Platform.OS === 'web' &&
            showLLMDropdown && {
              zIndex: 2000,
              position: 'relative' as const,
            },
          Platform.OS === 'web' &&
            ({
              transitionProperty: 'border-color, box-shadow',
              transitionDuration: '160ms',
              transitionTimingFunction: 'ease-out',
            } as object),
        ]}
        {...(Platform.OS === 'web'
          ? ({
              onMouseEnter: () => setIsContainerHovered(true),
              onMouseLeave: () => setIsContainerHovered(false),
            } as any)
          : {})}
      >
        {/* Image Preview */}
        {attachedImage && (
          <View style={styles.previewContainer}>
            <Pressable
              onPress={() => {
                console.log('[ChatInputBox] Opening image preview');
                setShowImagePreview(true);
              }}
              style={({ pressed }) => [
                styles.previewImagePressable,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Image
                source={{ uri: attachedImage.uri }}
                style={[styles.previewImage, { borderColor: colors.outline }]}
                resizeMode="cover"
              />
            </Pressable>
            <Pressable
              style={[styles.removePreviewButton, { borderColor: colors.outline }]}
              onPress={(e) => {
                e.stopPropagation();
                clearAttachment();
              }}
            >
              <Icon name="close" size={12} color={colors.buttonText} />
            </Pressable>
          </View>
        )}

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.text,
              outlineStyle: 'none',
              height: inputHeight,
              maxHeight: MAX_INPUT_HEIGHT,
            } as any,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          multiline
          textAlignVertical="top"
          selectionColor={sendButtonColor}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          onKeyPress={handleKeyPress}
          onContentSizeChange={handleContentSizeChange}
          blurOnSubmit={false}
          editable={!disabled} // Only disable editing if actually disabled (e.g. trial ended), not just loading
          scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
        />

        {/* Bottom row: LLM picker on left, buttons on right */}
        <View style={styles.bottomRow}>
          {/* Left Side: LLM Picker */}
          {showLLMPickerProp && onLLMChange && (
            <View style={styles.llmPickerContainer}>
              <Pressable
                style={[
                  styles.llmPickerButton,
                  {
                    backgroundColor: mode === 'dark' ? colors.chatBubble : colors.background,
                    borderColor:
                      Platform.OS === 'web' && isLlmPickerHovered ? sendButtonColor : colors.outline,
                  },
                  Platform.OS === 'web' &&
                    ({
                      transition: 'border-color 140ms ease-out, box-shadow 140ms ease-out',
                      cursor: 'pointer',
                    } as object),
                ]}
                onPress={() => setShowLLMDropdown(!showLLMDropdown)}
                disabled={disabled}
                onHoverIn={() => {
                  if (Platform.OS === 'web') setIsLlmPickerHovered(true);
                }}
                onHoverOut={() => {
                  if (Platform.OS === 'web') setIsLlmPickerHovered(false);
                }}
              >
                {(() => {
                  const sel = LLM_OPTIONS.find((o) => o.code === chatLLM);
                  const sub = llmOptionSubtitle(sel);
                  return (
                    <View style={styles.llmPickerLabelBlock}>
                      <Text
                        style={[
                          styles.llmPickerText,
                          {
                            fontFamily: fontFamilies.figtree.medium,
                            color: colors.text,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {sel?.name ?? 'Auto'}
                      </Text>
                      {sub ? (
                        <Text
                          style={[
                            styles.llmPickerVendor,
                            {
                              fontFamily: fontFamilies.figtree.regular,
                              color: colors.textMuted,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {sub}
                        </Text>
                      ) : null}
                    </View>
                  );
                })()}
              </Pressable>

              {/* Dropdown */}
              {showLLMDropdown && (
                <View
                  style={[
                    styles.llmDropdown,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outline,
                      left: 0, // Align left since it's on the left side now
                      right: 'auto', // Reset right
                    },
                    Platform.OS === 'web' &&
                      ({
                        boxShadow: shadowToCSS('md'),
                        width: 'max-content',
                        maxWidth: 'min(100vw - 32px, 420px)',
                      } as unknown as object),
                  ]}
                >
                  {LLM_OPTIONS.map((option) => {
                    const isProModel = option.code === 'perplexity' || option.code === 'grok' || option.code === 'claude';
                    // Enable Pro models for: Admins, Pro Users (remove __DEV__ to test locally)
                    const canAccessPro = isPro || isAdmin;
                    const isLocked = isProModel && !canAccessPro;
                    const isSelected = chatLLM === option.code;
                    const optionSub = llmOptionSubtitle(option);
                    const isRowHovered = Platform.OS === 'web' && hoveredLlmOption === option.code && !isSelected;

                    return (
                      <Pressable
                        key={option.code}
                        style={[
                          styles.llmDropdownItem,
                          isSelected && { backgroundColor: colors.primaryBg },
                          isRowHovered && {
                            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                          },
                          isLocked && { opacity: 0.5, backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
                          Platform.OS === 'web' &&
                            ({
                              transition: 'background-color 120ms ease-out',
                              cursor: isLocked ? 'default' : 'pointer',
                            } as object),
                        ]}
                        onPress={() => {
                          if (isLocked) {
                            setShowUpgradeModal(true);
                            setShowLLMDropdown(false);
                            return;
                          }
                          onLLMChange(option.code);
                          setShowLLMDropdown(false);
                        }}
                        onHoverIn={() => {
                          if (Platform.OS === 'web') setHoveredLlmOption(option.code);
                        }}
                        onHoverOut={() => {
                          if (Platform.OS === 'web') {
                            setHoveredLlmOption((prev) => (prev === option.code ? null : prev));
                          }
                        }}
                      >
                        <View style={styles.llmDropdownRow}>
                          <View style={styles.llmDropdownTextCol}>
                            <Text
                              style={[
                                styles.llmDropdownItemText,
                                {
                                  fontFamily: fontFamilies.figtree.semiBold,
                                  color: isSelected ? (mode === 'dark' ? colors.buttonText : colors.primary) : (isLocked ? colors.textMuted : colors.text),
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {option.name}
                            </Text>
                            {optionSub ? (
                              <Text
                                style={[
                                  styles.llmDropdownItemVendor,
                                  {
                                    fontFamily: fontFamilies.figtree.regular,
                                    color: isLocked ? colors.textMuted : colors.textMuted,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {optionSub}
                              </Text>
                            ) : null}
                          </View>
                          {isProModel && (
                            <View style={styles.llmDropdownBadgeWrap}>
                              {isLocked ? (
                                <Icon name="lock" size={12} color={colors.textMuted} />
                              ) : (
                                <ProBadge size="small" color={colors.primary} />
                              )}
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Right Side: Add Image, Deep Thinking, Voice, Send */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Add Image Button */}
            <Pressable
              style={[
                styles.iconButton,
                webIconTransitionStyle,
                isAddHovered && { backgroundColor: colors.surface },
              ]}
              onPress={handlePickImage}
              disabled={disabled || isLoading}
              onHoverIn={() => setIsAddHovered(true)}
              onHoverOut={() => setIsAddHovered(false)}
            >
              <Icon
                name="add"
                size={20}
                color={isAddHovered ? colors.text : (mode === 'dark' ? colors.text : colors.icon)}
              />
            </Pressable>

            {/* Buttons Container */}
            <View style={styles.buttonsContainer}>
              {/* Web Search toggle */}
              {onWebSearchToggle && (
                <View style={styles.tooltipWrapper}>
                  {showWebSearchTooltip && (
                    <View style={[styles.tooltip, { backgroundColor: colors.darkButtonHover }]}>
                      <Text style={[styles.tooltipText, { color: colors.buttonText, fontFamily: fontFamilies.figtree.medium }]}>
                        Web search
                      </Text>
                    </View>
                  )}
                  <Pressable
                    style={[
                      styles.iconButton,
                      webIconTransitionStyle,
                      webSearchEnabled && { backgroundColor: colors.primaryBg },
                      isWebSearchHovered && !webSearchEnabled && { backgroundColor: colors.surface },
                    ]}
                    onPress={onWebSearchToggle}
                    disabled={disabled || isLoading}
                    onHoverIn={() => {
                      setIsWebSearchHovered(true);
                      if (Platform.OS === 'web') setShowWebSearchTooltip(true);
                    }}
                    onHoverOut={() => {
                      setIsWebSearchHovered(false);
                      if (Platform.OS === 'web') setShowWebSearchTooltip(false);
                    }}
                  >
                    <Icon
                      name="globe"
                      size={18}
                      color={
                        webSearchEnabled
                          ? (mode === 'dark' ? colors.buttonText : colors.primary)
                          : (isWebSearchHovered ? colors.text : colors.icon)
                      }
                    />
                  </Pressable>
                </View>
              )}

              {/* Deep thinking toggle - only for admins */}
              {isAdmin && onDeepThinkingToggle && (
                <View style={styles.tooltipWrapper}>
                  {showDeepThinkingTooltip && (
                    <View style={[styles.tooltip, { backgroundColor: colors.darkButtonHover }]}>
                      <Text style={[styles.tooltipText, { color: colors.buttonText, fontFamily: fontFamilies.figtree.medium }]}>
                        Pro models
                      </Text>
                    </View>
                  )}
                  <Pressable
                    style={[
                      styles.iconButton,
                      webIconTransitionStyle,
                      deepThinkingEnabled && { backgroundColor: colors.primaryBg },
                      isDeepThinkingHovered && !deepThinkingEnabled && { backgroundColor: colors.surface },
                    ]}
                    onPress={onDeepThinkingToggle}
                    disabled={disabled || isLoading}
                    onHoverIn={() => {
                      setIsDeepThinkingHovered(true);
                      if (Platform.OS === 'web') setShowDeepThinkingTooltip(true);
                    }}
                    onHoverOut={() => {
                      setIsDeepThinkingHovered(false);
                      if (Platform.OS === 'web') setShowDeepThinkingTooltip(false);
                    }}
                  >
                    <Icon
                      name="idea"
                      size={18}
                      color={
                        deepThinkingEnabled
                          ? (mode === 'dark' ? colors.buttonText : colors.primary)
                          : (isDeepThinkingHovered ? colors.text : colors.icon)
                      }
                    />
                  </Pressable>
                </View>
              )}

              {/* Send button - colored bubble */}
              <Pressable
                style={[
                  styles.sendButton,
                  webIconTransitionStyle,
                  {
                    backgroundColor: sendButtonColor,
                    opacity: isSendDisabled ? 0.4 : 1, // Lower opacity when disabled
                  },
                  isSendHovered && !isSendDisabled && { transform: [{ scale: 1.04 }] },
                ]}
                onPress={handleSend}
                disabled={isSendDisabled}
                onHoverIn={() => setIsSendHovered(true)}
                onHoverOut={() => setIsSendHovered(false)}
              >
                <Icon
                  name="send"
                  size={16}
                  color={sendIconColor}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Full Image Preview Modal - Outside container */}
      <Modal
        visible={showImagePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePreview(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            console.log('[ChatInputBox] Closing image preview');
            setShowImagePreview(false);
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalImageContainer}>
            <Image
              source={{ uri: attachedImage?.uri || '' }}
              style={styles.modalImage}
              resizeMode="contain"
            />
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowImagePreview(false)}
            >
              <Icon name="close" size={20} color={colors.buttonText} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <PaywallModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Premium AI Model"
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: Platform.OS === 'web' ? 24 : 16, // 16px on mobile, 24px on desktop
    borderWidth: 1,
    width: '100%',
    // Default / elevated shadow is applied inline (xs idle, lg on hover/focus).
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    width: '100%',
    padding: 0, // Remove default padding to allow precise height control
    margin: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  llmPickerContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  llmPickerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  llmPickerLabelBlock: {
    flexShrink: 1,
  },
  llmPickerText: {
    fontSize: 11,
    lineHeight: 14,
  },
  llmPickerVendor: {
    fontSize: 9,
    marginTop: 1,
    lineHeight: 12,
  },
  llmDropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 3000,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    alignItems: 'stretch',
    ...Platform.select({
      default: { elevation: 24 },
      web: {},
    }),
  },
  llmDropdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 8,
  },
  llmDropdownTextCol: {
    flexShrink: 1,
  },
  llmDropdownBadgeWrap: {
    marginTop: 2,
    flexShrink: 0,
  },
  llmDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'stretch',
  },
  llmDropdownItemText: {
    fontSize: 14,
  },
  llmDropdownItemVendor: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tooltipWrapper: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    bottom: 40,
    left: -8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 20,
    ...Platform.select({
      web: { whiteSpace: 'nowrap' } as any,
      default: {}
    }),
  },
  tooltipText: {
    fontSize: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 99,
  },
  sendButton: {
    padding: 10,
    borderRadius: 99,
  },
  previewContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    width: 60,
    height: 60,
  },
  previewImagePressable: {
    width: 60,
    height: 60,
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
      default: {},
    }),
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
  },
  removePreviewButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#000000',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    width: '90%',
    height: '90%',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
