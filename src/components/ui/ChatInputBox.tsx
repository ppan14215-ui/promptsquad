import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Text,
  Image,
} from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative, textStyles } from '@/design-system';
import { Icon } from './Icon';
import * as ImagePicker from 'expo-image-picker';
import { LLM_OPTIONS, LLMPreference } from '@/services/preferences';

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
}, ref) => {
  const { colors } = useTheme();
  const [showLLMDropdown, setShowLLMDropdown] = useState(false);
  const [showWebSearchTooltip, setShowWebSearchTooltip] = useState(false);
  const [showDeepThinkingTooltip, setShowDeepThinkingTooltip] = useState(false);
  const [inputHeight, setInputHeight] = useState(48); // Start with min height
  const [attachedImage, setAttachedImage] = useState<{ uri: string; base64?: string; mimeType?: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      // Use setTimeout to ensure focus happens after any DOM updates
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
  }));

  const isSendDisabled = disabled || (!value.trim() && !attachedImage);

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
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.outline,
          maxWidth,
        },
      ]}
    >
      {/* Image Preview */}
      {attachedImage && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: attachedImage.uri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          <Pressable style={styles.removePreviewButton} onPress={clearAttachment}>
            <Icon name="close" size={12} color="#FFFFFF" />
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
        selectionColor={colors.primary}
        onKeyPress={handleKeyPress}
        onContentSizeChange={handleContentSizeChange}
        blurOnSubmit={false}
        editable={!disabled}
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
                  backgroundColor: colors.background,
                  borderColor: colors.outline,
                },
              ]}
              onPress={() => setShowLLMDropdown(!showLLMDropdown)}
            >
              <Text
                style={[
                  styles.llmPickerText,
                  {
                    fontFamily: fontFamilies.figtree.medium,
                    color: colors.textMuted,
                  },
                ]}
              >
                {chatLLM === 'auto' ? 'Auto' : chatLLM === 'gemini' ? 'Gemini' : chatLLM === 'perplexity' ? 'Perplexity' : chatLLM === 'openai' ? 'GPT' : 'Auto'}
              </Text>
            </Pressable>

            {/* Dropdown */}
            {showLLMDropdown && (
              <View
                style={[
                  styles.llmDropdown,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.outline,
                    left: 0, // Align left since it's on the left side now
                    right: 'auto', // Reset right
                  },
                  Platform.OS === 'web' && ({ boxShadow: shadowToCSS('md') } as unknown as object),
                ]}
              >
                {LLM_OPTIONS.map((option) => {
                  const isPerplexity = option.code === 'perplexity';
                  const isLocked = isPerplexity && !isPro && !isAdmin;

                  return (
                    <Pressable
                      key={option.code}
                      style={[
                        styles.llmDropdownItem,
                        chatLLM === option.code && { backgroundColor: colors.primaryBg },
                        isLocked && { opacity: 0.6 },
                      ]}
                      onPress={() => {
                        if (isLocked) {
                          // TODO: Show upgrade modal?
                          return;
                        }
                        onLLMChange(option.code);
                        setShowLLMDropdown(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.llmDropdownItemText,
                            {
                              fontFamily: fontFamilies.figtree.semiBold,
                              color: chatLLM === option.code ? colors.primary : colors.text,
                            },
                          ]}
                        >
                          {option.name}
                        </Text>
                        {isPerplexity && !isPro && !isAdmin && (
                          <View style={{ backgroundColor: colors.primary, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
                            <Text style={{ fontFamily: fontFamilies.figtree.semiBold, fontSize: 9, color: '#FFFFFF' }}>PRO</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.llmDropdownItemDesc,
                          {
                            fontFamily: fontFamilies.figtree.regular,
                            color: colors.textMuted,
                          },
                        ]}
                      >
                        {option.description}
                      </Text>
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
            style={styles.iconButton}
            onPress={handlePickImage}
            disabled={disabled}
          >
            <Icon name="add" size={20} color={colors.icon} />
          </Pressable>

          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            {/* Deep thinking toggle - only for admins */}
            {isAdmin && onDeepThinkingToggle && (
              <View style={styles.tooltipWrapper}>
                {showDeepThinkingTooltip && (
                  <View style={[styles.tooltip, { backgroundColor: colors.darkButtonHover }]}>
                    <Text style={[styles.tooltipText, { color: colors.buttonText, fontFamily: fontFamilies.figtree.medium }]}>
                      Deep thinking
                    </Text>
                  </View>
                )}
                <Pressable
                  style={[
                    styles.iconButton,
                    deepThinkingEnabled && { backgroundColor: colors.primaryBg },
                  ]}
                  onPress={onDeepThinkingToggle}
                  disabled={disabled}
                  {...(Platform.OS === 'web' && {
                    onHoverIn: () => setShowDeepThinkingTooltip(true),
                    onHoverOut: () => setShowDeepThinkingTooltip(false),
                  })}
                >
                  <Icon
                    name="idea"
                    size={18}
                    color={deepThinkingEnabled ? colors.primary : colors.icon}
                  />
                </Pressable>
              </View>
            )}

            {/* Voice input button - Hidden for now as it's unstable */}
            {/* {onVoicePress && (
              <Pressable
                style={[
                  styles.iconButton,
                  isRecording && { backgroundColor: colors.red + '20' },
                ]}
                onPress={onVoicePress}
                disabled={disabled}
              >
                <Icon
                  name={isRecording ? 'stop' : 'mic'}
                  size={18}
                  color={isRecording ? colors.red : colors.icon}
                />
              </Pressable>
            )} */}

            {/* Send button - colored bubble */}
            <Pressable
              style={[
                styles.sendButton,
                {
                  backgroundColor: mascotColor,
                  opacity: isSendDisabled ? 0.4 : 1, // Lower opacity when disabled
                },
              ]}
              onPress={handleSend}
              disabled={isSendDisabled}
            >
              <Icon
                name="send"
                size={16}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: Platform.OS === 'web' ? 24 : 16, // 16px on mobile, 24px on desktop
    borderWidth: 1,
    width: '100%',
    // Softer shadow on mobile, full shadow on web
    // On web, use boxShadow (CSS), on native use shadow properties
    ...(Platform.OS === 'web'
      ? ({ boxShadow: shadowToCSS('lg') } as any)
      : {
        shadowColor: '#0A0D12',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03, // Even softer on mobile
        shadowRadius: 3, // Slightly larger radius for softer blur
        elevation: 1, // Lower elevation for Android
      }),
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
  },
  llmPickerButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  llmPickerText: {
    fontSize: 12,
  },
  llmDropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 160,
    zIndex: 100,
    overflow: 'hidden',
  },
  llmDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  llmDropdownItemText: {
    fontSize: 14,
  },
  llmDropdownItemDesc: {
    marginTop: 2,
    fontSize: 11,
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
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
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
    borderColor: '#FFFFFF',
  },
});
