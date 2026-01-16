import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Image, 
  Platform,
  Keyboard,
  ImageSourcePropType,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';

// Speech recognition is only available on web - disabled on native to avoid errors
const SPEECH_RECOGNITION_AVAILABLE = Platform.OS === 'web';
import { useTheme, fontFamilies, textStyles, shadowToCSS, shadowToNative } from '@/design-system';
import { useI18n } from '@/i18n';
import { usePreferences, selectBestProvider, TaskCategory, LLMPreference } from '@/services/preferences';
import { Icon, IconButton, ColoredTab, LinkPill, ChatInputBox, SkillPreview } from '@/components';
import { streamChat, ChatMessage, AI_CONFIG } from '@/services/ai';
import type { WebSource } from '@/services/ai';
import { useMascotSkills, useMascotInstructions, MascotSkill, getCombinedPrompt } from '@/services/admin';
import { useMascotLike } from '@/services/mascot-likes';

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
  camel: require('../../assets/mascots/camel.png'),
  frog: require('../../assets/mascots/frog.png'),
  giraffe: require('../../assets/mascots/giraffe.png'),
  lion: require('../../assets/mascots/lion.png'),
  seahorse: require('../../assets/mascots/searhorse.png'),
};

// Mascot data (simplified - in real app this would come from a store/API)
const MASCOT_DATA: Record<string, { 
  name: string; 
  image: string; 
  color: string;
  greeting: string;
  skills: string[];
  systemPrompt: string;
  taskCategory: TaskCategory; // Used for auto-selecting the best AI provider
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
    taskCategory: 'analysis', // OpenAI excels at data analysis
  },
  '2': { 
    name: 'Writer Fox', 
    image: 'fox', 
    color: '#ED7437',  // Orange
    greeting: 'Hey! I\'m Writer Fox, your creative writing companion.\nWhat would you like me to write for you?',
    skills: ['Blog posts', 'Email drafts', 'Social media'],
    systemPrompt: `You are Writer Fox, a creative and witty writing assistant. Your personality is clever, eloquent, and imaginative. You excel at:
- Blog posts and articles
- Email drafts and professional communication
- Social media content and captions

Write with flair and personality. Use markdown formatting when appropriate. Be creative but adapt your tone to the user's needs. Keep responses engaging and polished.`,
    taskCategory: 'creative', // OpenAI excels at creative writing
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
    taskCategory: 'ux', // OpenAI for nuanced UX advice
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
    taskCategory: 'conversation', // Gemini for fast, conversational advice
  },
  '5': { 
    name: 'Teacher Owl', 
    image: 'owl', 
    color: '#5E24CB',
    greeting: 'Hello! I\'m Teacher Owl, here to help with learning.\nWhat shall we learn today?',
    skills: ['Lesson planning', 'Homework help', 'Concept explanation'],
    systemPrompt: `You are Teacher Owl, a patient and knowledgeable educational assistant. Your personality is encouraging, thorough, and supportive. You excel at:
- Lesson planning and curriculum design
- Homework help and explanations
- Concept explanation and learning support

Be clear, patient, and encouraging. Use markdown formatting for better readability. Break down complex concepts into understandable parts.`,
    taskCategory: 'conversation',
  },
  '6': { 
    name: 'Prompt Turtle', 
    image: 'turtle', 
    color: '#59C19D',
    greeting: 'Hi! I\'m Prompt Turtle, your AI prompt engineering expert.\nWhat prompt can I help craft?',
    skills: ['Prompt engineering', 'AI optimization', 'Workflow automation'],
    systemPrompt: `You are Prompt Turtle, a methodical and precise prompt engineering assistant. Your personality is helpful, detail-oriented, and systematic. You excel at:
- Prompt engineering and optimization
- AI workflow automation
- Getting the most out of AI models

Be thorough and precise. Use markdown formatting. Provide clear, actionable prompt improvements.`,
    taskCategory: 'analysis',
  },
  '7': { 
    name: 'Data Badger', 
    image: 'badger', 
    color: '#826F57',
    greeting: 'Hello! I\'m Data Badger, your analytics expert.\nWhat data shall we explore?',
    skills: ['Data visualization', 'Statistical analysis', 'Report generation'],
    systemPrompt: `You are Data Badger, an analytical and persistent data expert. Your personality is detail-oriented, thorough, and persistent. You excel at:
- Data visualization and interpretation
- Statistical analysis
- Report generation and insights

Be precise and data-driven. Use markdown formatting with tables and charts when appropriate.`,
    taskCategory: 'analysis',
  },
  '8': { 
    name: 'Quick Mouse', 
    image: 'mouse', 
    color: '#2D6CF5',
    greeting: 'Hi! I\'m Quick Mouse, your fast problem solver.\nWhat needs a quick fix?',
    skills: ['Quick fixes', 'Troubleshooting', 'Time management'],
    systemPrompt: `You are Quick Mouse, a fast and efficient problem solver. Your personality is quick, resourceful, and solution-focused. You excel at:
- Quick fixes and troubleshooting
- Time management solutions
- Efficient problem-solving

Be concise and action-oriented. Get to solutions quickly. Use markdown for clarity.`,
    taskCategory: 'conversation',
  },
  '9': { 
    name: 'Creative Pig', 
    image: 'pig', 
    color: '#EB3F71',
    greeting: 'Hey! I\'m Creative Pig, your design thinking companion.\nWhat shall we create?',
    skills: ['Brainstorming', 'Ideation', 'Creative writing'],
    systemPrompt: `You are Creative Pig, a playful and innovative creative assistant. Your personality is creative, playful, and imaginative. You excel at:
- Brainstorming and ideation
- Creative writing and storytelling
- Design thinking

Be creative and open-minded. Use markdown formatting. Encourage wild ideas and creative thinking.`,
    taskCategory: 'creative',
  },
  '10': { 
    name: 'Code Cat', 
    image: 'cat', 
    color: '#2D2E66',
    greeting: 'Meow! I\'m Code Cat, your programming wizard.\nWhat code shall we write?',
    skills: ['Code review', 'Debugging', 'Architecture'],
    systemPrompt: `You are Code Cat, a logical and precise programming assistant. Your personality is patient, precise, and methodical. You excel at:
- Code review and best practices
- Debugging and troubleshooting
- Software architecture

Be precise and technical. Use code blocks and markdown formatting. Provide clear, actionable code solutions.`,
    taskCategory: 'analysis',
  },
  '11': { 
    name: 'Strategy Camel', 
    image: 'camel', 
    color: '#826F57',
    greeting: 'Hello! I\'m Strategy Camel, your planning expert.\nWhat strategy shall we plan?',
    skills: ['Business strategy', 'Goal setting', 'Roadmap planning'],
    systemPrompt: `You are Strategy Camel, a strategic and visionary planning assistant. Your personality is organized, forward-thinking, and methodical. You excel at:
- Business strategy development
- Goal setting and planning
- Roadmap creation

Be strategic and organized. Use markdown formatting with clear structure. Think long-term.`,
    taskCategory: 'analysis',
  },
  '12': { 
    name: 'Marketing Frog', 
    image: 'frog', 
    color: '#59C19D',
    greeting: 'Hi! I\'m Marketing Frog, your growth hacker.\nWhat marketing challenge can I help with?',
    skills: ['Campaign planning', 'Copywriting', 'Social strategy'],
    systemPrompt: `You are Marketing Frog, a persuasive and creative marketing assistant. Your personality is data-driven, creative, and persuasive. You excel at:
- Marketing campaign planning
- Copywriting and messaging
- Social media strategy

Be creative and data-driven. Use markdown formatting. Focus on results and engagement.`,
    taskCategory: 'creative',
  },
  '13': { 
    name: 'Product Giraffe', 
    image: 'giraffe', 
    color: '#EDB440',
    greeting: 'Hello! I\'m Product Giraffe, your product management expert.\nWhat product question can I help with?',
    skills: ['PRD writing', 'Feature prioritization', 'Stakeholder management'],
    systemPrompt: `You are Product Giraffe, a user-focused and organized product management assistant. Your personality is collaborative, organized, and user-centric. You excel at:
- PRD writing and documentation
- Feature prioritization
- Stakeholder management

Be clear and user-focused. Use markdown formatting. Balance user needs with business goals.`,
    taskCategory: 'ux',
  },
  '14': { 
    name: 'Support Lion', 
    image: 'lion', 
    color: '#ED7437',
    greeting: 'Hi! I\'m Support Lion, your customer success expert.\nHow can I help your customers?',
    skills: ['Customer support', 'FAQ creation', 'Escalation handling'],
    systemPrompt: `You are Support Lion, an empathetic and solution-oriented customer support assistant. Your personality is patient, empathetic, and solution-focused. You excel at:
- Customer support and troubleshooting
- FAQ creation and documentation
- Escalation handling

Be empathetic and solution-oriented. Use markdown formatting. Focus on customer satisfaction.`,
    taskCategory: 'conversation',
  },
  '15': { 
    name: 'Mentor Seahorse', 
    image: 'seahorse', 
    color: '#2D6CF5',
    greeting: 'Hello! I\'m Mentor Seahorse, your career guidance expert.\nWhat career question can I help with?',
    skills: ['Career coaching', 'Resume review', 'Interview prep'],
    systemPrompt: `You are Mentor Seahorse, a wise and encouraging career mentor. Your personality is experienced, encouraging, and supportive. You excel at:
- Career coaching and guidance
- Resume and CV review
- Interview preparation

Be encouraging and practical. Use markdown formatting. Provide actionable career advice.`,
    taskCategory: 'conversation',
  },
  '16': { 
    name: 'Project Camel', 
    image: 'camel', 
    color: '#ED7437',
    greeting: 'Hi! I\'m Project Camel, your project management expert.\nWhat project can I help manage?',
    skills: ['Project planning', 'Risk management', 'Status reporting'],
    systemPrompt: `You are Project Camel, a methodical and reliable project management assistant. Your personality is organized, reliable, and methodical. You excel at:
- Project planning and scheduling
- Risk management
- Status reporting and communication

Be organized and clear. Use markdown formatting with timelines and checklists. Keep projects on track.`,
    taskCategory: 'analysis',
  },
  '17': { 
    name: 'Research Frog', 
    image: 'frog', 
    color: '#74AE58',
    greeting: 'Hello! I\'m Research Frog, your market research expert.\nWhat research can I help with?',
    skills: ['Market analysis', 'Trend research', 'Competitor analysis'],
    systemPrompt: `You are Research Frog, a curious and thorough research assistant. Your personality is analytical, thorough, and curious. You excel at:
- Market analysis and insights
- Trend research
- Competitor analysis

Be thorough and data-driven. Use markdown formatting with clear structure. Provide actionable insights.`,
    taskCategory: 'analysis',
  },
  '18': { 
    name: 'Agile Giraffe', 
    image: 'giraffe', 
    color: '#5E24CB',
    greeting: 'Hi! I\'m Agile Giraffe, your Scrum master.\nWhat agile question can I help with?',
    skills: ['Sprint planning', 'Retrospectives', 'Team facilitation'],
    systemPrompt: `You are Agile Giraffe, an agile and collaborative Scrum master. Your personality is adaptive, collaborative, and facilitative. You excel at:
- Sprint planning and facilitation
- Retrospectives and continuous improvement
- Team facilitation and coaching

Be collaborative and adaptive. Use markdown formatting. Focus on team effectiveness.`,
    taskCategory: 'conversation',
  },
  '19': { 
    name: 'Brand Lion', 
    image: 'lion', 
    color: '#E64140',
    greeting: 'Hello! I\'m Brand Lion, your brand strategy expert.\nWhat brand question can I help with?',
    skills: ['Brand positioning', 'Voice & tone', 'Visual identity'],
    systemPrompt: `You are Brand Lion, a creative and strategic brand expert. Your personality is visionary, creative, and strategic. You excel at:
- Brand positioning and strategy
- Voice and tone development
- Visual identity guidance

Be creative and strategic. Use markdown formatting. Build strong, memorable brands.`,
    taskCategory: 'creative',
  },
  '20': { 
    name: 'Dev Seahorse', 
    image: 'seahorse', 
    color: '#2D2E66',
    greeting: 'Hi! I\'m Dev Seahorse, your full-stack developer.\nWhat development question can I help with?',
    skills: ['Full-stack development', 'API design', 'Code architecture'],
    systemPrompt: `You are Dev Seahorse, a technical and problem-solving development assistant. Your personality is curious, technical, and solution-oriented. You excel at:
- Full-stack development
- API design and architecture
- Code architecture and best practices

Be technical and precise. Use code blocks and markdown formatting. Provide clear, scalable solutions.`,
    taskCategory: 'analysis',
  },
};

export default function ChatScreen() {
  const { mascotId, questionPrompt, initialMessage, skillId } = useLocalSearchParams<{ 
    mascotId: string;
    questionPrompt?: string;
    initialMessage?: string;
    skillId?: string; // ID of skill selected from home
  }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const scrollViewRef = useRef<ScrollView>(null);

  const mascot = MASCOT_DATA[mascotId || '1'] || MASCOT_DATA['1'];
  const mascotImage = mascotImages[mascot.image] || mascotImages.bear; // Fallback to bear if image not found
  const { preferredLLM } = usePreferences();

  // Fetch skills and instructions from database
  const { skills: dbSkills, isLoading: skillsLoading } = useMascotSkills(mascotId || '1');
  const { instructions: dbInstructions, isLoading: instructionsLoading } = useMascotInstructions(mascotId || '1');
  
  // Fetch like data for mascot
  const { isLiked, likeCount, toggleLike, isToggling } = useMascotLike(mascotId || '1');

  // Active skill for enhanced prompting
  const [activeSkillId, setActiveSkillId] = useState<string | null>(skillId || null);
  const activeSkill = dbSkills.find((s) => s.id === activeSkillId);

  // Track if we've processed the initial message from home screen
  const hasProcessedInitialMessage = useRef(false);


  // Determine the initial assistant message
  const initialAssistantMessage = questionPrompt || mascot.greeting;

  const [activeTab, setActiveTab] = useState<ChatTab>('chat');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: initialAssistantMessage,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [chatLLM, setChatLLM] = useState<LLMPreference>('auto');
  const [showLLMPicker, setShowLLMPicker] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showWebSearchTooltip, setShowWebSearchTooltip] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [showDeepThinkingTooltip, setShowDeepThinkingTooltip] = useState(false);
  const [showSkills, setShowSkills] = useState(true);
  const [webSources, setWebSources] = useState<WebSource[]>([]);
  const [webSearchError, setWebSearchError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const formatSourcesForMessage = useCallback((sources: WebSource[]) => {
    return sources
      .map((source, index) => `${index + 1}. [${source.title}](${source.url})`)
      .join('\n');
  }, []);

  // Core function to send a message (used by handleSend and auto-send from home)
  const sendMessage = useCallback(async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent.trim(),
    };

    const assistantMessageId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setAutoScroll(true);
    setInputText('');
    setIsLoading(true);
    setStreamingContent('');

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Clear web sources if web search is disabled
      if (!webSearchEnabled) {
        setWebSources([]);
        setWebSearchError(null);
      }

      // Build chat history for AI - include current messages plus new user message
      const currentMessages = [...messages, userMessage];

      // Get the mascot's system prompt (with instructions and active skill)
      const mascotData = MASCOT_DATA[mascotId || '1'];
      let systemPrompt = mascotData?.systemPrompt || 'You are a helpful AI assistant.';
      
      // Add database instructions if available
      if (dbInstructions) {
        systemPrompt = `${systemPrompt}\n\n---\n\n${dbInstructions}`;
      }
      
      // Add active skill prompt if available
      if (activeSkill?.skill_prompt) {
        systemPrompt = `${systemPrompt}\n\n---\n\nIMPORTANT: The following skill-specific instructions must be followed precisely and take precedence when relevant:\n\n${activeSkill.skill_prompt}`;
      }

      // Convert to ChatMessage format with system prompt
      const chatHistory: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...currentMessages
          .filter((m) => !m.isThinking && (m.role === 'user' || m.role === 'assistant'))
          .map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
      ];

      let fullContent = '';

      // Select the best provider based on mascot's task category and user preference
      const taskCategory = mascotData?.taskCategory as TaskCategory || 'conversation';
      const selectedProvider = selectBestProvider(preferredLLM, taskCategory);
      
      const response = await streamChat(
        chatHistory,
        (chunk) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
          // Auto-scroll while streaming
          scrollViewRef.current?.scrollToEnd({ animated: false });
        },
        selectedProvider // Use the best provider for this mascot's task category
      );

      const assistantContent = response.content;

      // Add the complete message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent,
          model: response.model,
        },
      ]);
      setStreamingContent('');
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Detect specific error types
      const isCorsError = errorMessage.toLowerCase().includes('cors') || 
                         errorMessage.toLowerCase().includes('cross-origin');
      const isAuthError = errorMessage.toLowerCase().includes('unauthorized') ||
                         errorMessage.toLowerCase().includes('not authenticated');
      const isConnectionError = (errorMessage.toLowerCase().includes('connection') || 
                                errorMessage.toLowerCase().includes('network') ||
                                errorMessage.toLowerCase().includes('fetch') ||
                                errorMessage.toLowerCase().includes('timeout')) && !isCorsError;
      
      // Provide specific error messages
      let userFriendlyMessage = '';
      if (isCorsError) {
        userFriendlyMessage = 'Configuration error: The app is trying to connect directly to the API. This should be fixed automatically.';
      } else if (isAuthError) {
        userFriendlyMessage = 'Authentication error: Please sign in again.';
      } else if (isConnectionError) {
        userFriendlyMessage = 'Connection error: Please check your internet connection and try again.';
      } else {
        userFriendlyMessage = `Sorry, I encountered an error. Please try again.\n\n*Error: ${errorMessage}*`;
      }
      
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: userFriendlyMessage,
        },
      ]);
      setStreamingContent('');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, mascotId, formatSourcesForMessage]);

  // Auto-send initial message from home screen
  useEffect(() => {
    if (initialMessage && !hasProcessedInitialMessage.current) {
      hasProcessedInitialMessage.current = true;
      // Small delay to ensure the UI is ready
      setTimeout(() => {
        sendMessage(initialMessage);
      }, 300);
    }
  }, [initialMessage, sendMessage]);

  // Track keyboard state to fix padding issues
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Reset keyboard height immediately
        setKeyboardHeight(0);
        // Force a small delay to ensure KeyboardAvoidingView has processed the hide event
        // This helps prevent padding from persisting
        setTimeout(() => {
          setKeyboardHeight(0);
        }, 100);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Speech recognition is only available on web
  // On native platforms (iOS/Android), voice input is disabled to avoid errors
  const handleVoiceInput = async () => {
    // Only available on web
    if (!SPEECH_RECOGNITION_AVAILABLE) {
      console.warn('Speech recognition is only available on web');
      return;
    }

    // Web speech recognition would be handled here
    // For now, this is a placeholder - web speech recognition needs Web Speech API
    console.warn('Web speech recognition not yet implemented');
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    // Dismiss keyboard before sending to prevent padding issues
    Keyboard.dismiss();
    await sendMessage(inputText);
  };

  const handleSkillPress = async (skill: MascotSkill | string) => {
    // Send the skill directly to AI
    if (isLoading) return;
    // Dismiss keyboard if visible
    Keyboard.dismiss();

    // Handle both database skill objects and legacy string skills
    const skillLabel = typeof skill === 'string' ? skill : skill.skill_label;
    const skillPrompt = typeof skill === 'string' ? null : skill.skill_prompt;
    const skillIdToActivate = typeof skill === 'string' ? null : skill.id;

    // Set active skill for future messages
    if (skillIdToActivate) {
      setActiveSkillId(skillIdToActivate);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: skillLabel,
    };

    const assistantMessageId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');
    setShowSkills(false);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Clear web sources if web search is disabled
      if (!webSearchEnabled) {
        setWebSources([]);
        setWebSearchError(null);
      }

      // Get the mascot's system prompt (with instructions and skill prompt)
      const mascotData = MASCOT_DATA[mascotId || '1'];
      let systemPrompt = mascotData?.systemPrompt || 'You are a helpful AI assistant.';
      
      // Add database instructions if available
      if (dbInstructions) {
        systemPrompt = `${systemPrompt}\n\n---\n\n${dbInstructions}`;
      }
      
      // Add skill prompt if available
      if (skillPrompt) {
        systemPrompt = `${systemPrompt}\n\n---\n\nIMPORTANT: The following skill-specific instructions must be followed precisely and take precedence when relevant:\n\n${skillPrompt}`;
      }

      // Convert to ChatMessage format with system prompt
      const chatHistory: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
          .filter((m) => !m.isThinking && (m.role === 'user' || m.role === 'assistant'))
          .map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
        { role: 'user', content: skillLabel },
      ];

      let fullContent = '';

      // Select the best provider based on mascot's task category and user preference
      const taskCategory = mascotData?.taskCategory as TaskCategory || 'conversation';
      const selectedProvider = selectBestProvider(preferredLLM, taskCategory);
      
      const response = await streamChat(
        chatHistory,
        (chunk: string) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
          scrollViewRef.current?.scrollToEnd({ animated: false });
        },
        selectedProvider // Use the best provider for this mascot's task category
      );

      const assistantContent = response.content;

      // Add the complete message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent,
          model: response.model,
        },
      ]);
      setStreamingContent('');
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Detect specific error types
      const isCorsError = errorMessage.toLowerCase().includes('cors') || 
                         errorMessage.toLowerCase().includes('cross-origin');
      const isAuthError = errorMessage.toLowerCase().includes('unauthorized') ||
                         errorMessage.toLowerCase().includes('not authenticated');
      const isConnectionError = (errorMessage.toLowerCase().includes('connection') || 
                                errorMessage.toLowerCase().includes('network') ||
                                errorMessage.toLowerCase().includes('fetch') ||
                                errorMessage.toLowerCase().includes('timeout')) && !isCorsError;
      
      // Provide specific error messages
      let userFriendlyMessage = '';
      if (isCorsError) {
        userFriendlyMessage = 'Configuration error: The app is trying to connect directly to the API. This should be fixed automatically.';
      } else if (isAuthError) {
        userFriendlyMessage = 'Authentication error: Please sign in again.';
      } else if (isConnectionError) {
        userFriendlyMessage = 'Connection error: Please check your internet connection and try again.';
      } else {
        userFriendlyMessage = `Sorry, I encountered an error. Please try again.\n\n*Error: ${errorMessage}*`;
      }
      
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: userFriendlyMessage,
        },
      ]);
      setStreamingContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Tab labels (matching Figma design: Chat, Sources, Skills, Instructions)
  const tabs: { key: ChatTab; label: string }[] = [
    { key: 'chat', label: t.chat.tabs.chat },
    { key: 'sources', label: t.chat.tabs.sources },
    { key: 'skills', label: 'Skills' },
    { key: 'instructions', label: t.chat.tabs.instructions },
  ];

  // Markdown styles for assistant messages (Gemini-inspired)
  const markdownStyles = useMemo(() => ({
    body: {
      fontFamily: fontFamilies.figtree.regular, // Regular weight for body text
      fontSize: Platform.OS === 'web' ? 14 : 13,
      lineHeight: Platform.OS === 'web' ? 22 : 20, // More breathing room
      color: colors.text,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: Platform.OS === 'web' ? 12 : 10, // More spacing between paragraphs
    },
    strong: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontWeight: '600' as const,
    },
    em: {
      fontFamily: fontFamilies.figtree.regular,
      fontStyle: 'italic' as const,
    },
    heading1: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontSize: Platform.OS === 'web' ? 20 : 18,
      fontWeight: '600' as const,
      marginTop: Platform.OS === 'web' ? 20 : 16,
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      paddingTop: Platform.OS === 'web' ? 16 : 12,
      borderTopWidth: 1,
      borderTopColor: colors.outline + '30', // 30 = ~19% opacity
      color: colors.text,
      letterSpacing: -0.2, // Tighter letter spacing for headings
    },
    heading2: {
      fontFamily: fontFamilies.figtree.semiBold,
      fontSize: Platform.OS === 'web' ? 18 : 16,
      fontWeight: '600' as const,
      marginTop: Platform.OS === 'web' ? 18 : 14,
      marginBottom: Platform.OS === 'web' ? 6 : 5,
      paddingTop: Platform.OS === 'web' ? 12 : 10,
      borderTopWidth: 1,
      borderTopColor: colors.outline + '30',
      color: colors.text,
      letterSpacing: -0.1,
    },
    heading3: {
      fontFamily: fontFamilies.figtree.medium, // Medium weight for h3
      fontSize: Platform.OS === 'web' ? 16 : 14,
      fontWeight: '500' as const,
      marginTop: Platform.OS === 'web' ? 16 : 12,
      marginBottom: Platform.OS === 'web' ? 6 : 4,
      paddingTop: Platform.OS === 'web' ? 10 : 8,
      borderTopWidth: 1,
      borderTopColor: colors.outline + '25', // Lighter for h3
      color: colors.text,
    },
    bullet_list: {
      marginTop: Platform.OS === 'web' ? 4 : 3,
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      paddingLeft: Platform.OS === 'web' ? 4 : 3,
    },
    ordered_list: {
      marginTop: Platform.OS === 'web' ? 4 : 3,
      marginBottom: Platform.OS === 'web' ? 8 : 6,
      paddingLeft: Platform.OS === 'web' ? 4 : 3,
    },
    list_item: {
      marginBottom: Platform.OS === 'web' ? 6 : 4, // More spacing between list items
      paddingLeft: Platform.OS === 'web' ? 4 : 3,
    },
    code_inline: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      color: colors.primary,
    },
    code_block: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      backgroundColor: colors.surface,
      padding: Platform.OS === 'web' ? 12 : 10,
      borderRadius: 8,
      marginVertical: Platform.OS === 'web' ? 6 : 5,
      color: colors.text,
    },
    fence: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: Platform.OS === 'web' ? 13 : 12,
      backgroundColor: colors.surface,
      padding: Platform.OS === 'web' ? 12 : 10,
      borderRadius: 8,
      marginVertical: Platform.OS === 'web' ? 6 : 5,
      color: colors.text,
    },
    blockquote: {
      backgroundColor: colors.surface,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: Platform.OS === 'web' ? 16 : 12,
      paddingRight: Platform.OS === 'web' ? 16 : 12,
      paddingVertical: Platform.OS === 'web' ? 12 : 10,
      marginVertical: Platform.OS === 'web' ? 12 : 10,
      borderRadius: 4,
      fontFamily: fontFamilies.figtree.regular,
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'underline' as const,
    },
    hr: {
      backgroundColor: colors.outline,
      height: 1,
      marginVertical: Platform.OS === 'web' ? 16 : 12,
      marginHorizontal: 0,
      opacity: 0.3, // Subtle divider
    },
  }), [colors]);

  const insets = useSafeAreaInsets();

  // Calculate bottom padding: use safe area insets when keyboard is hidden
  // When keyboard is visible, add keyboard height to safe area
  const bottomPadding = Platform.OS === 'web' 
    ? 16 
    : (keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 0));

  const content = (
    <>
      {/* Header - includes safe area padding */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.outline,
            // Only add padding top on native for status bar
            paddingTop: Platform.OS !== 'web' ? Math.max(insets.top, 8) + 8 : 16,
          },
        ]}
      >
        {/* Mascot image - absolutely positioned, overlaps content */}
        <Image
          source={mascotImage}
          style={styles.headerMascotImage}
          resizeMode="cover"
        />

        {/* First row: Back button (143px) + Text + Favorite */}
        <View style={styles.headerRow}>
          {/* Back button container - 143px wide to reserve space for mascot */}
          <View style={styles.headerBackContainer}>
            <IconButton
              iconName="arrow-left"
              onPress={handleBack}
            />
          </View>

          {/* Mascot name and subtitle */}
          <View style={styles.headerTextContainer}>
            <Text
              style={[
                styles.headerMascotName,
                {
                  fontFamily: textStyles.cardTitle.fontFamily,
                  fontSize: 18,
                  letterSpacing: 0.36,
                  lineHeight: 23,
                  color: colors.text,
                },
              ]}
            >
              {mascot.name}
            </Text>
            <Text
              style={[
                styles.headerMascotSubtitle,
                {
                  fontFamily: fontFamilies.figtree.medium,
                  fontSize: 11,
                  letterSpacing: 0.5,
                  color: colors.textMuted,
                },
              ]}
            >
              {mascot.greeting.split('\n')[0].replace('Hi, there I am analyst bear. ', '').replace('Hey! I\'m Writer Fox, ', '').replace('Hello! I\'m UX Panda, ', '').replace('Hi there! I\'m Advice Zebra, ', '') || 'Your AI assistant'}
            </Text>
          </View>

          {/* Favorite button with like count */}
        <View style={styles.favoriteContainer}>
          <IconButton
            iconName="favourite"
            isSelected={isLiked}
            onPress={toggleLike}
            disabled={isToggling}
          />
          {likeCount > 0 && (
            <Text
              style={[
                styles.likeCount,
                {
                  fontFamily: fontFamilies.figtree.medium,
                  color: colors.textMuted,
                },
              ]}
            >
              {likeCount}
            </Text>
          )}
        </View>
        </View>

        {/* Tabs row - pl-150 to align with text above */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <ColoredTab
              key={tab.key}
              label={tab.label}
              isActive={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </View>
      </View>

      {activeTab === 'skills' ? (
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.skillsTabContent}
        >
          {skillsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : dbSkills.length === 0 ? (
            <Text
              style={[
                styles.sourcesMessage,
                {
                  fontFamily: textStyles.body.fontFamily,
                  color: colors.textMuted,
                },
              ]}
            >
              No skills configured for this mascot yet.
            </Text>
          ) : (
            dbSkills.map((skill) => (
              <Pressable
                key={skill.id}
                onPress={() => handleSkillPress(skill)}
                style={[
                  styles.skillPreviewCard,
                  activeSkillId === skill.id && { borderColor: mascot.color, borderWidth: 2 },
                ]}
              >
                <SkillPreview
                  skillLabel={skill.skill_label}
                  skillPromptPreview={skill.skill_prompt_preview}
                  isFullAccess={skill.is_full_access}
                  fullPrompt={skill.skill_prompt}
                  mascotColor={mascot.color}
                />
                {activeSkillId === skill.id && (
                  <View style={[styles.activeSkillBadge, { backgroundColor: mascot.color }]}>
                    <Text style={styles.activeSkillBadgeText}>Active</Text>
                  </View>
                )}
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : activeTab === 'sources' ? (
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.sourcesContent}
        >
          {webSearchError && (
            <Text
              style={[
                styles.sourcesMessage,
                {
                  fontFamily: textStyles.body.fontFamily,
                  color: colors.textMuted,
                },
              ]}
            >
              Web search unavailable: {webSearchError}
            </Text>
          )}
          {!webSearchError && webSources.length === 0 && (
            <Text
              style={[
                styles.sourcesMessage,
                {
                  fontFamily: textStyles.body.fontFamily,
                  color: colors.textMuted,
                },
              ]}
            >
              No sources yet. Enable web search and send a message.
            </Text>
          )}
          {webSources.map((source, index) => (
            <Pressable
              key={`${source.url}-${index}`}
              style={[
                styles.sourceCard,
                { backgroundColor: colors.background, borderColor: colors.outline },
              ]}
              onPress={() => Linking.openURL(source.url)}
            >
              <Text
                style={[
                  styles.sourceTitle,
                  {
                    fontFamily: textStyles.message.fontFamily,
                    color: colors.text,
                  },
                ]}
              >
                {index + 1}. {source.title}
              </Text>
              <Text
                style={[
                  styles.sourceUrl,
                  {
                    fontFamily: textStyles.caption.fontFamily,
                    color: colors.primary,
                  },
                ]}
              >
                {source.url}
              </Text>
              {!!source.snippet && (
                <Text
                  style={[
                    styles.sourceSnippet,
                    {
                      fontFamily: textStyles.body.fontFamily,
                      color: colors.textMuted,
                    },
                  ]}
                >
                  {source.snippet}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const paddingToBottom = 40;
            const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;
            setAutoScroll(isAtBottom);
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (autoScroll) {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          }}
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
                    selectable
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
                    <View style={[
                      styles.modelLabelContainer,
                      { borderTopColor: colors.outline + '40' }, // 40 = 25% opacity in hex
                    ]}>
                      <Text
                        style={[
                          styles.modelLabel,
                          {
                            fontFamily: fontFamilies.figtree.medium,
                            color: colors.textMuted,
                          },
                        ]}
                      >
                        {message.model}
                      </Text>
                    </View>
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
      )}

      {/* Skills suggestions - use DB skills if available, fallback to hardcoded */}
      {showSkills && (
        <View style={styles.skillsContainer}>
          {skillsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.skillsContent}
            >
              {dbSkills.length > 0
                ? dbSkills.map((skill) => (
                    <LinkPill
                      key={skill.id}
                      label={skill.skill_label}
                      onPress={() => handleSkillPress(skill)}
                    />
                  ))
                : mascot.skills.map((skill) => (
                    <LinkPill
                      key={skill}
                      label={skill}
                      onPress={() => handleSkillPress(skill)}
                    />
                  ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { 
        paddingBottom: bottomPadding,
        marginBottom: 0,
      }]}>
        <ChatInputBox
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          placeholder={t.chat.placeholder}
          disabled={isLoading}
          mascotColor={mascot.color}
          showLLMPicker={true}
          chatLLM={chatLLM}
          onLLMChange={setChatLLM}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={() => setWebSearchEnabled((prev) => !prev)}
          deepThinkingEnabled={deepThinkingEnabled}
          onDeepThinkingToggle={() => setDeepThinkingEnabled((prev) => !prev)}
          isRecording={isRecording}
          onVoicePress={SPEECH_RECOGNITION_AVAILABLE ? handleVoiceInput : undefined}
          maxWidth={CHAT_MAX_WIDTH}
        />
        </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS !== 'web' ? (
        <View style={{ flex: 1 }}>
          {content}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {content}
        </View>
      )}
    </View>
  );
}

const CHAT_MAX_WIDTH = 720;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 16,
    flexDirection: 'column',
    gap: 4,
    borderBottomWidth: 1,
    position: 'relative',
    overflow: 'visible',
  },
  headerMascotImage: {
    position: 'absolute',
    width: 100,
    height: 100,
    left: 53,
    bottom: 0, // Sit exactly on the bottom border
    zIndex: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    zIndex: 1,
  },
  headerBackContainer: {
    width: 143,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerMascotName: {
    textAlign: 'left',
  },
  headerMascotSubtitle: {
    textAlign: 'left',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingLeft: 158, // Align with text: 143px back container + 15px gap
    zIndex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Platform.OS === 'web' ? 24 : 16,
    gap: Platform.OS === 'web' ? 24 : 12, // Doubled spacing between messages
    alignItems: 'center',
  },
  sourcesContent: {
    padding: 16,
    gap: 12,
  },
  sourcesMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  sourceCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  sourceTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  sourceUrl: {
    fontSize: 12,
    lineHeight: 16,
  },
  sourceSnippet: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageDivider: {
    width: '100%',
    maxWidth: CHAT_MAX_WIDTH,
    height: 1,
    alignSelf: 'center',
    opacity: 0.2,
  },
  messageWrapper: {
    width: '100%',
    maxWidth: CHAT_MAX_WIDTH,
    alignSelf: 'center',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  userBubble: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    borderRadius: 18,
    maxWidth: '85%', // Allow some margin from edge, like Gemini
    alignSelf: 'flex-end',
    minWidth: 120, // Ensure minimum width for short messages
  },
  assistantMessage: {
    gap: Platform.OS === 'web' ? 6 : 5, // Tighter spacing on desktop
    maxWidth: '100%',
  },
  messageText: {
    fontSize: Platform.OS === 'web' ? 14 : 13, // Smaller on mobile
    lineHeight: Platform.OS === 'web' ? 20 : 18, // Tighter line height on mobile
    flexShrink: 1,
  },
  thinkingText: {
    fontSize: 14,
    lineHeight: 18,
  },
  modelLabelContainer: {
    marginTop: Platform.OS === 'web' ? 8 : 6,
    paddingTop: Platform.OS === 'web' ? 8 : 6,
    borderTopWidth: 1,
  },
  modelLabel: {
    fontSize: Platform.OS === 'web' ? 11 : 10,
    lineHeight: Platform.OS === 'web' ? 14 : 13,
    fontFamily: fontFamilies.figtree.medium,
  },
  skillsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  skillsContent: {
    gap: 8,
    width: '100%',
    maxWidth: CHAT_MAX_WIDTH,
  },
  skillsTabContent: {
    padding: 16,
    gap: 16,
  },
  skillPreviewCard: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  activeSkillBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeSkillBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0, // Will be set dynamically based on safe area
    alignItems: 'center',
    marginBottom: 0, // Ensure no extra margin
  },
  favoriteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    lineHeight: 16,
  },
});

