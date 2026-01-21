import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Text,
} from 'react-native';
import { useTheme, fontFamilies, shadowToCSS, shadowToNative, textStyles } from '@/design-system';
import { Icon } from './Icon';
import { LLM_OPTIONS, LLMPreference } from '@/services/preferences';

export type ChatInputBoxRef = {
  focus: () => void;
};

type ChatInputBoxProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
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
  // Max width
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
  maxWidth = 720,
}, ref) => {
  const { colors } = useTheme();
  const [showLLMDropdown, setShowLLMDropdown] = useState(false);
  const [showWebSearchTooltip, setShowWebSearchTooltip] = useState(false);
  const [showDeepThinkingTooltip, setShowDeepThinkingTooltip] = useState(false);
  const [inputHeight, setInputHeight] = useState(48); // Start with min height
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

  const isSendDisabled = disabled || !value.trim();

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
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      onSend();
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
        Platform.OS === 'web' && ({ boxShadow: shadowToCSS('lg') } as unknown as object),
      ]}
    >
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
        {/* LLM Picker */}
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
                  },
                  Platform.OS === 'web' && ({ boxShadow: shadowToCSS('md') } as unknown as object),
                ]}
              >
                {LLM_OPTIONS.map((option) => (
                  <Pressable
                    key={option.code}
                    style={[
                      styles.llmDropdownItem,
                      chatLLM === option.code && { backgroundColor: colors.primaryBg },
                    ]}
                    onPress={() => {
                      onLLMChange(option.code);
                      setShowLLMDropdown(false);
                    }}
                  >
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
                ))}
              </View>
            )}
          </View>
        )}

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

          {/* Voice input button */}
          {onVoicePress && (
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
          )}
          
          {/* Send button - colored bubble */}
          <Pressable
            style={[
              styles.sendButton,
              { 
                backgroundColor: mascotColor,
                opacity: isSendDisabled ? 0.4 : 1, // Lower opacity when disabled
              },
            ]}
            onPress={onSend}
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
    whiteSpace: 'nowrap',
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
});
