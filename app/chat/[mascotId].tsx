import React, { useState, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Pressable, 
  Image, 
  Platform,
  KeyboardAvoidingView,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { useTheme, fontFamilies, textStyles, shadowToCSS, shadowToNative } from '@/design-system';
import { useI18n } from '@/i18n';
import { Icon, IconButton, ColoredTab, LinkPill } from '@/components';
import { streamChat, ChatMessage, AIProvider } from '@/services/ai';

// Message types
type MessageRole = 'user' | 'assistant';

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  model?: string;
  isThinking?: boolean;
};

// Chat tabs
type ChatTab = 'chat' | 'sources' | 'skills' | 'instructions';

// Local mascot images
const mascotImages: Record<string, ImageSourcePropType> = {
  bear: require('../../assets/mascots/Bear.png'),
  cat: require('../../assets/mascots/cat.png'),
  fox: require('../../assets/mascots/fox.png'),
  owl: require('../../assets/mascots/owl.png'),
  panda: require('../../assets/mascots/panda.png'),
  turtle: require('../../assets/mascots/turtle.png'),
  zebra: require('../../assets/mascots/zebra.png'),
  badger: require('../../assets/mascots/badger.png'),
  mouse: require('../../assets/mascots/mouse.png'),
  pig: require('../../assets/mascots/pig.png'),
};

// Mascot data (simplified - in real app this would come from a store/API)
const MASCOT_DATA: Record<string, { 
  name: string; 
  image: string; 
  color: string;
  greeting: string;
  skills: string[];
  systemPrompt: string;
  provider: AIProvider;
}> = {
  '1': { 
    name: 'Analyst Bear', 
    image: 'bear', 
    color: '#EDB440',
    greeting: 'Hi, there I am analyst bear. I am great at all kinds of analysis.\nWhat can I help you with?',
    skills: ['Stock analysis', 'Competitive analysis', 'Market analysis'],
    systemPrompt: `You are Analyst Bear, a friendly and thorough analytical assistant. Your personality is methodical, patient, and detail-oriented. You excel at:
- Stock and financial analysis
- Competitive analysis and market research
- Data interpretation and insights

Always provide structured, well-reasoned analysis. Use markdown formatting for better readability (headers, bullet points, bold for emphasis). Be friendly but professional. Keep responses concise but comprehensive.`,
    provider: 'gemini',
  },
  '2': { 
    name: 'Writer Fox', 
    image: 'fox', 
    color: '#E64140',
    greeting: 'Hey! I\'m Writer Fox, your creative writing companion.\nWhat would you like me to write for you?',
    skills: ['Blog posts', 'Email drafts', 'Social media'],
    systemPrompt: `You are Writer Fox, a creative and witty writing assistant. Your personality is clever, eloquent, and imaginative. You excel at:
- Blog posts and articles
- Email drafts and professional communication
- Social media content and captions

Write with flair and personality. Use markdown formatting when appropriate. Be creative but adapt your tone to the user's needs. Keep responses engaging and polished.`,
    provider: 'gemini',
  },
  '3': { 
    name: 'UX Panda', 
    image: 'panda', 
    color: '#74AE58',
    greeting: 'Hello! I\'m UX Panda, here to help with all things user experience.\nWhat design challenge can I help you solve?',
    skills: ['User research', 'Wireframing', 'Usability testing'],
    systemPrompt: `You are UX Panda, an empathetic and user-focused design assistant. Your personality is thoughtful, detail-oriented, and user-centric. You excel at:
- User research methodologies
- Wireframing and prototyping advice
- Usability testing and feedback analysis

Always consider the end user's perspective. Use markdown formatting for clarity. Provide actionable UX recommendations. Be supportive and collaborative.`,
    provider: 'gemini',
  },
  '4': { 
    name: 'Advice Zebra', 
    image: 'zebra', 
    color: '#EB3F71',
    greeting: 'Hi there! I\'m Advice Zebra, ready to offer balanced perspectives.\nWhat\'s on your mind?',
    skills: ['Life coaching', 'Decision making', 'Problem solving'],
    systemPrompt: `You are Advice Zebra, a wise and balanced life advisor. Your personality is supportive, thoughtful, and non-judgmental. You excel at:
- Life coaching and personal development
- Decision making frameworks
- Problem solving and perspective shifts

Offer balanced, thoughtful advice. Use markdown formatting when helpful. Ask clarifying questions when needed. Be empathetic but also practical. Help users see multiple perspectives.`,
    provider: 'gemini',
  },
};

export default function ChatScreen() {
  const { mascotId } = useLocalSearchParams<{ mascotId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const scrollViewRef = useRef<ScrollView>(null);

  const mascot = MASCOT_DATA[mascotId || '1'] || MASCOT_DATA['1'];
  const mascotImage = mascotImages[mascot.image];

  const [activeTab, setActiveTab] = useState<ChatTab>('chat');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: mascot.greeting,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessageContent = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
    };

    const assistantMessageId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setStreamingContent('');

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Build chat history for AI
      const chatHistory: ChatMessage[] = [
        { role: 'system', content: mascot.systemPrompt },
        ...messages
          .filter((m) => !m.isThinking)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        { role: 'user', content: userMessageContent },
      ];

      let fullContent = '';

      // Stream the response
      const response = await streamChat(
        chatHistory,
        (chunk) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
          // Auto-scroll while streaming
          scrollViewRef.current?.scrollToEnd({ animated: false });
        },
        mascot.provider
      );

      // Add the complete message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: response.content,
          model: response.model,
        },
      ]);
      setStreamingContent('');
    } catch (error) {
      console.error('AI Error:', error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: `Sorry, I encountered an error. Please try again.\n\n*Error: ${error instanceof Error ? error.message : 'Unknown error'}*`,
        },
      ]);
      setStreamingContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkillPress = async (skill: string) => {
    // Send the skill directly to AI
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: skill,
    };

    const assistantMessageId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Build chat history for AI
      const chatHistory: ChatMessage[] = [
        { role: 'system', content: mascot.systemPrompt },
        ...messages
          .filter((m) => !m.isThinking)
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        { role: 'user', content: skill },
      ];

      let fullContent = '';

      // Stream the response
      const response = await streamChat(
        chatHistory,
        (chunk) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
          scrollViewRef.current?.scrollToEnd({ animated: false });
        },
        mascot.provider
      );

      // Add the complete message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: response.content,
          model: response.model,
        },
      ]);
      setStreamingContent('');
    } catch (error) {
      console.error('AI Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: `Sorry, I encountered an error. Please try again.\n\n*Error: ${error instanceof Error ? error.message : 'Unknown error'}*`,
        },
      ]);
      setStreamingContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Tab labels
  const tabs: { key: ChatTab; label: string }[] = [
    { key: 'chat', label: t.chat.tabs.chat },
    { key: 'sources', label: t.chat.tabs.sources },
    { key: 'skills', label: t.chat.tabs.skills },
    { key: 'instructions', label: t.chat.tabs.instructions },
  ];

  // Markdown styles for assistant messages
  const markdownStyles = useMemo(() => ({
    body: {
      fontFamily: fontFamilies.figtree.medium,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 8,
    },
    strong: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontWeight: '600' as const,
    },
    em: {
      fontStyle: 'italic' as const,
    },
    heading1: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontSize: 20,
      marginTop: 16,
      marginBottom: 8,
      color: colors.text,
    },
    heading2: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontSize: 18,
      marginTop: 12,
      marginBottom: 6,
      color: colors.text,
    },
    heading3: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontSize: 16,
      marginTop: 10,
      marginBottom: 4,
      color: colors.text,
    },
    bullet_list: {
      marginBottom: 8,
    },
    ordered_list: {
      marginBottom: 8,
    },
    list_item: {
      marginBottom: 4,
    },
    code_inline: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      backgroundColor: colors.surface,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      color: colors.primary,
    },
    code_block: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
      color: colors.text,
    },
    fence: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
      color: colors.text,
    },
    blockquote: {
      backgroundColor: colors.surface,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'underline' as const,
    },
    hr: {
      backgroundColor: colors.outline,
      height: 1,
      marginVertical: 16,
    },
  }), [colors]);

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.outline,
          },
        ]}
      >
        <View style={styles.headerContent}>
          {/* Back button + Mascot info */}
          <View style={styles.headerLeft}>
            <IconButton
              iconName="arrow-left"
              onPress={handleBack}
            />
            <View style={styles.mascotInfo}>
              <View 
                style={[
                  styles.mascotAvatar, 
                  { 
                    backgroundColor: `${mascot.color}33`,
                    borderColor: mascot.color,
                  }
                ]}
              >
                <Image
                  source={mascotImage}
                  style={styles.mascotImage}
                  resizeMode="cover"
                />
              </View>
              <Text
                style={[
                  styles.mascotName,
                  {
                    fontFamily: textStyles.cardTitle.fontFamily,
                    color: colors.text,
                  },
                ]}
              >
                {mascot.name}
              </Text>
            </View>
          </View>

          {/* Favorite button */}
          <IconButton
            iconName="favourite"
            onPress={() => console.log('Favorite pressed')}
          />
        </View>

        {/* Tabs - inside header, above the border */}
        <View style={styles.tabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {tabs.map((tab) => (
              <ColoredTab
                key={tab.key}
                label={tab.label}
                isActive={activeTab === tab.key}
                onPress={() => setActiveTab(tab.key)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper,
            ]}
          >
            {message.role === 'user' ? (
              <View
                style={[
                  styles.userBubble,
                  { backgroundColor: colors.chatBubble },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    {
                      fontFamily: fontFamilies.figtree.medium,
                      color: colors.text,
                    },
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            ) : (
              <View style={styles.assistantMessage}>
                <Markdown
                  style={markdownStyles}
                >
                  {message.content}
                </Markdown>
                {message.model && (
                  <Text
                    style={[
                      styles.modelLabel,
                      {
                        fontFamily: fontFamilies.figtree.semiBold,
                        color: colors.icon,
                      },
                    ]}
                  >
                    {message.model}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Streaming response */}
        {isLoading && streamingContent && (
          <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
            <View style={styles.assistantMessage}>
              <Markdown style={markdownStyles}>
                {streamingContent}
              </Markdown>
            </View>
          </View>
        )}

        {/* Thinking indicator */}
        {isLoading && !streamingContent && (
          <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
            <Text
              style={[
                styles.thinkingText,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.icon,
                },
              ]}
            >
              {t.chat.thinking}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Skills suggestions */}
      <View style={styles.skillsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.skillsContent}
        >
          {mascot.skills.map((skill) => (
            <LinkPill
              key={skill}
              label={skill}
              onPress={() => handleSkillPress(skill)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <View
          style={[
            styles.inputWrapper,
            { 
              backgroundColor: colors.surface,
              borderColor: colors.outline,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                fontFamily: fontFamilies.figtree.medium,
                color: colors.text,
                outlineStyle: 'none',
              } as any,
            ]}
            placeholder={t.chat.placeholder}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            selectionColor={colors.primary}
            onKeyPress={(e) => {
              // Send on Enter (without Shift for new line)
              if (e.nativeEvent.key === 'Enter' && !(e.nativeEvent as any).shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            blurOnSubmit={false}
          />
          <View style={styles.sendButtonContainer}>
            <Pressable
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={isLoading || !inputText.trim()}
            >
              <Icon
                name="send"
                size={16}
                color={inputText.trim() && !isLoading ? colors.primary : colors.icon}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mascotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mascotAvatar: {
    width: 32,
    height: 32,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  mascotImage: {
    width: 20,
    height: 20,
  },
  mascotName: {
    fontSize: 14,
    letterSpacing: 0.28,
  },
  tabsContainer: {
    paddingTop: 16,
    marginLeft: -16,
    marginRight: -16,
    paddingLeft: 16,
  },
  tabsContent: {
    gap: 8,
    paddingRight: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 8,
  },
  messageWrapper: {
    width: '100%',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  userBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    maxWidth: '80%',
  },
  assistantMessage: {
    gap: 8,
    maxWidth: '100%',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  thinkingText: {
    fontSize: 14,
    lineHeight: 18,
  },
  modelLabel: {
    fontSize: 8,
    lineHeight: 8 * 1.3,
  },
  skillsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skillsContent: {
    gap: 8,
  },
  inputContainer: {
    padding: 16,
    paddingTop: 0,
  },
  inputWrapper: {
    borderRadius: 16,
    padding: 16,
    minHeight: 130,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 12,
    lineHeight: 12 * 1.3,
  },
  sendButtonContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

