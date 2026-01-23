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
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';

// Speech recognition is only available on web - disabled on native to avoid errors
const SPEECH_RECOGNITION_AVAILABLE = Platform.OS === 'web';
import { useTheme, fontFamilies, textStyles, shadowToCSS, shadowToNative } from '@/design-system';
import { useI18n } from '@/i18n';
import { usePreferences, selectBestProvider, TaskCategory, LLMPreference } from '@/services/preferences';
import { supabase } from '@/services/supabase';
import { ChatHeader, LinkPill, ChatInputBox, SkillPreview, ChatHistory, Icon, BigPrimaryButton } from '@/components';
import type { ChatInputBoxRef } from '@/components/ui/ChatInputBox';
import { secureChatStream } from '@/services/ai/secure-chat';
import type { ChatMessage, AI_CONFIG, WebSource, SecureChatMessage } from '@/services/ai';
import { useMascotSkills, useMascotPersonality, MascotSkill, getCombinedPrompt, useIsAdmin, updatePersonality, resetPersonalityToDefault, MascotBasic } from '@/services/admin';
import { useMascotLike } from '@/services/mascot-likes';
import { createConversation, saveMessage, generateConversationTitle, useConversationMessages, deleteConversation, getConversation } from '@/services/chat-history';
import { useMascotAccess, incrementTrialUsage } from '@/services/mascot-access';

// Message types
type MessageRole = 'user' | 'assistant';

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  model?: string;
  provider?: 'openai' | 'gemini' | 'perplexity'; // Provider used for this message
  citations?: string[]; // Citation URLs from Perplexity
  isThinking?: boolean;
  attachment?: {
    uri: string;
    mimeType?: string;
    base64?: string;
  };
};

// Chat tabs
type ChatTab = 'chat' | 'sources' | 'skills' | 'personality' | 'history';

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
  subtitle?: string; // Optional subtitle override (defaults to parsing greeting if missing)
}> = {
  '1': {
    name: 'Analyst Bear',
    image: 'bear',
    color: '#EDB440',
    greeting: 'Hi, there I am analyst bear. I am great at all kinds of analysis.\nWhat can I help you with?',
    subtitle: 'I am great at all kinds of analysis.',
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
    subtitle: 'Your creative writing companion.',
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
    subtitle: 'Here to help with all things user experience.',
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
    subtitle: 'Ready to offer balanced perspectives.',
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
    subtitle: 'Here to help with learning.',
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
    subtitle: 'Your AI prompt engineering expert.',
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
    subtitle: 'Your analytics expert.',
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
    subtitle: 'Your fast problem solver.',
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
    subtitle: 'Your design thinking companion.',
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
    subtitle: 'Your programming wizard.',
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
    subtitle: 'Your planning expert.',
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
    subtitle: 'Your growth hacker.',
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
    subtitle: 'Your product management expert.',
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
    subtitle: 'Your customer success expert.',
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
    subtitle: 'Your career guidance expert.',
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
    subtitle: 'Your project management expert.',
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
    subtitle: 'Your market research expert.',
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
    subtitle: 'Your Scrum master.',
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
    subtitle: 'Your brand strategy expert.',
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
    subtitle: 'Your full-stack developer.',
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
  const {
    mascotId,
    initialMessage,
    // Support separate initial prompt
    questionPrompt,
    // Support deep thinking flag
    deepThinking: deepThinkingParam,
    // Support LLM preference
    llm: llmParam,
    // Support initial attachment
    initialAttachmentUri,
    initialAttachmentMime,
    initialAttachmentBase64,
    skillId, // ID of skill selected from home
    deepThinking, // 'true' or 'false' from home screen
    llm, // LLM preference from home screen
    conversationId: urlConversationId, // Existing conversation ID
  } = useLocalSearchParams<{
    mascotId: string;
    questionPrompt?: string;
    initialMessage?: string;
    skillId?: string; // ID of skill selected from home
    deepThinking?: string; // 'true' or 'false' from home screen
    llm?: LLMPreference; // LLM preference from home screen
    conversationId?: string; // Existing conversation ID
    initialAttachmentUri?: string;
    initialAttachmentMime?: string;
    initialAttachmentBase64?: string;
  }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const scrollViewRef = useRef<ScrollView>(null);
  const chatInputRef = useRef<ChatInputBoxRef>(null);

  const staticMascot = MASCOT_DATA[mascotId || '1'] || MASCOT_DATA['1'];
  const [dbMascot, setDbMascot] = useState<MascotBasic | null>(null);

  // Fetch real-time mascot details from DB
  useEffect(() => {
    async function fetchMascot() {
      if (!mascotId) return;
      const { data } = await supabase
        .from('mascots')
        .select('*')
        .eq('id', mascotId)
        .single();
      if (data) setDbMascot(data);
    }
    fetchMascot();
  }, [mascotId]);

  // Merge DB data with static data
  const mascot = useMemo(() => ({
    ...staticMascot,
    name: dbMascot?.name || staticMascot.name,
    subtitle: dbMascot?.subtitle || staticMascot.subtitle,
    greeting: dbMascot?.question_prompt || staticMascot.greeting,
  }), [staticMascot, dbMascot]);

  const mascotImage = mascotImages[mascot.image] || mascotImages.bear; // Fallback to bear if image not found
  const headerSubtitle = mascot.subtitle || 'Your AI assistant';
  const { preferredLLM } = usePreferences();

  // Check if user is admin
  const { isAdmin } = useIsAdmin();

  // Fetch skills and personality from database
  const { skills: dbSkills, isLoading: skillsLoading } = useMascotSkills(mascotId || '1');
  const { personality: dbPersonality, isLoading: personalityLoading, refetch: refetchPersonality } = useMascotPersonality(mascotId || '1');

  // Fetch like data for mascot
  const { isLiked, likeCount, toggleLike, isToggling } = useMascotLike(mascotId || '1');

  // Check mascot access (unlocked, trial, or locked)
  const { canUse, reason, trialCount, trialLimit, isLoading: isLoadingAccess, refresh: refreshAccess } = useMascotAccess(mascotId || null);
  const isTrial = reason === 'trial';
  const isTrialExhausted = reason === 'trial_exhausted';

  // Local state to track trial count (for immediate UI updates)
  const [localTrialCount, setLocalTrialCount] = React.useState(trialCount);

  // Update local trial count when hook updates
  React.useEffect(() => {
    setLocalTrialCount(trialCount);
  }, [trialCount]);

  // Active skill for enhanced prompting
  const [activeSkillId, setActiveSkillId] = useState<string | null>(skillId || null);
  const activeSkill = dbSkills.find((s) => s.id === activeSkillId);

  // Personality editing state
  const [isEditingPersonality, setIsEditingPersonality] = useState(false);
  const [editedPersonality, setEditedPersonality] = useState('');
  const [isSavingPersonality, setIsSavingPersonality] = useState(false);
  const [isResettingPersonality, setIsResettingPersonality] = useState(false);

  // Sync editedPersonality when dbPersonality changes (but not when editing)
  useEffect(() => {
    if (!isEditingPersonality && dbPersonality) {
      setEditedPersonality(dbPersonality.personality);
    }
  }, [dbPersonality, isEditingPersonality]);

  // Conversation management
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(urlConversationId || null);
  const [hasSavedFirstMessage, setHasSavedFirstMessage] = useState(false);
  const [hasIncrementedTrial, setHasIncrementedTrial] = useState(false);
  const [titleGenerationQueued, setTitleGenerationQueued] = useState(false);

  // Track if we've processed the initial message from home screen
  const hasProcessedInitialMessage = useRef(false);

  // Determine the initial assistant message
  const initialAssistantMessage = questionPrompt || mascot.greeting;

  // Load existing conversation messages if conversationId is provided
  const { messages: dbMessages, isLoading: isLoadingMessages } = useConversationMessages(currentConversationId);

  // Initialize hasIncrementedTrial from database flag
  useEffect(() => {
    async function initTrialStatus() {
      if (currentConversationId) {
        // Reset to false while we check the new conversation
        setHasIncrementedTrial(false);
        const conv = await getConversation(currentConversationId);
        // ONLY trust the database flag. If the DB hasn't counted it yet, 
        // we want the next message (>=3) to trigger the increment.
        if (conv?.is_trial_counted) {
          setHasIncrementedTrial(true);
        }
      } else {
        setHasIncrementedTrial(false);
      }
    }
    initTrialStatus();
  }, [currentConversationId]);

  // Keep isTrial in ref for cleanup closure
  const isTrialRef = useRef(isTrial);
  useEffect(() => {
    isTrialRef.current = isTrial;
  }, [isTrial]);

  // Load existing messages when conversation is loaded
  useEffect(() => {
    if (currentConversationId && dbMessages.length > 0) {
      // Convert database messages to Message format
      const loadedMessages: Message[] = dbMessages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          id: m.id,
          role: m.role as MessageRole,
          content: m.content,
          model: m.model || undefined,
        }));

      // Always replace messages when conversation is loaded (even if messages exist)
      // This ensures clicking a conversation from history shows the full conversation
      if (loadedMessages.length > 0) {
        setMessages(loadedMessages);
        setHasSavedFirstMessage(true); // Mark as saved since we loaded existing messages
        setTitleGenerationQueued(true); // Don't regenerate title for existing conversations
      } else {
        // If conversation exists but has no messages, start fresh
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: initialAssistantMessage,
          },
        ]);
      }
    } else if (urlConversationId && !currentConversationId) {
      // If URL has conversationId but we haven't loaded it yet, set it
      setCurrentConversationId(urlConversationId);
    } else if (!currentConversationId && !urlConversationId && messages.length <= 1) {
      // No conversation - start with initial message (only if we don't have messages yet)
      // This prevents overwriting messages when switching tabs
      const hasOnlyInitialMessage = messages.length === 1 && messages[0]?.role === 'assistant' && messages[0]?.id === '1';
      if (hasOnlyInitialMessage) {
        // Already has initial message, don't overwrite
      } else if (messages.length === 0) {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: initialAssistantMessage,
          },
        ]);
      }
    }
  }, [currentConversationId, dbMessages, urlConversationId, initialAssistantMessage]);

  const [activeTab, setActiveTab] = useState<ChatTab>('chat');

  // Auto-focus input when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      // Focus input when switching to chat tab
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  }, [activeTab]);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: initialAssistantMessage,
    },
  ]);

  // Keep messages in ref for use in unmount cleanup
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Cleanup trial conversations with < 3 user messages when leaving
  useEffect(() => {
    return () => {
      // Use messages ref to get correct messages even in unmount
      const currentMessages = messagesRef.current;
      const userMessageCount = currentMessages.filter(m => m.role === 'user').length;

      if (isTrialRef.current && currentConversationId && userMessageCount < 3) {
        console.log('[Chat] Trial conversation with only', userMessageCount, 'user messages. Deleting conversation:', currentConversationId);
        // We use the background delete to avoid blocking unmount
        deleteConversation(currentConversationId).catch((err: any) => {
          console.warn('[Chat] Failed to delete short trial conversation:', err);
        });
      }
    };
  }, [currentConversationId]);

  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [chatLLM, setChatLLM] = useState<LLMPreference>(llm || 'auto');
  const [showLLMPicker, setShowLLMPicker] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showWebSearchTooltip, setShowWebSearchTooltip] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(deepThinking === 'true');
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
  // When a skill is clicked, messageContent will be the skill LABEL
  // User sees the skill label, but LLM receives the full skill prompt
  const sendMessage = useCallback(async (
    messageContent: string,
    isSkillLabel: boolean = false,
    attachment?: { uri: string; base64?: string; mimeType?: string }
  ) => {
    if ((!messageContent.trim() && !attachment) || isLoading) return;

    // Check if this is the first user message BEFORE adding it to state
    // This determines if it's a new conversation for trial purposes
    const hasUserMessages = messages.some(m => m.role === 'user');
    const isFirstUserMessage = !hasUserMessages;

    // If this is a skill label, we need to send the full skill prompt to LLM
    // but display the label to the user
    let actualMessageContentForLLM = messageContent.trim();

    if (isSkillLabel && activeSkill?.skill_prompt) {
      // This is a skill click - send full prompt to LLM
      actualMessageContentForLLM = activeSkill.skill_prompt;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent.trim(), // User always sees the label or their message
      attachment,
    };

    const assistantMessageId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setAutoScroll(true);
    setInputText('');
    setIsLoading(true);
    setStreamingContent('');

    // Focus input immediately after clearing (user can start typing right away)
    // Use requestAnimationFrame for web to ensure DOM is ready
    if (Platform.OS === 'web') {
      requestAnimationFrame(() => {
        setTimeout(() => {
          chatInputRef.current?.focus();
        }, 50);
      });
    } else {
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }

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

      // Check if messageContent is the skill prompt (when clicking a skill)
      const isSkillPrompt = activeSkill?.skill_prompt &&
        messageContent.trim() === activeSkill.skill_prompt.trim();

      // Build chat history for AI
      // CRITICAL: If this is a skill prompt, send the FULL prompt to LLM, not the label
      const actualMessageContentForLLM = isSkillPrompt
        ? messageContent.trim() // Send full skill prompt
        : messageContent.trim(); // Regular message

      const currentMessages = [...messages];

      // Get the mascot's system prompt (personality)
      // IMPORTANT: When a skill is active, add it to the system prompt so the LLM continues following it
      // The skill prompt is also sent as the user message for the first interaction
      const mascotData = MASCOT_DATA[mascotId || '1'];
      let systemPrompt = mascotData?.systemPrompt || 'You are a helpful AI assistant.';

      // Add database personality if available
      if (dbPersonality) {
        systemPrompt = `${systemPrompt}\n\n---\n\n${dbPersonality.personality}`;
      }

      // Add active skill prompt to system prompt so it continues to be followed
      // This ensures step-by-step prompts work correctly throughout the conversation
      if (activeSkill?.skill_prompt) {
        systemPrompt = `${systemPrompt}\n\n---\n\nCRITICAL: Follow these skill-specific instructions throughout this entire conversation:\n\n${activeSkill.skill_prompt}\n\nThese instructions define how you should behave and what questions you should ask. Continue following them for all subsequent messages, maintaining the step-by-step process they specify.`;
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
        { role: 'user', content: actualMessageContentForLLM }, // Send full skill prompt to LLM
      ];

      let fullContent = '';

      // Convert chat messages to secure chat format (no system messages)
      const secureMessages: SecureChatMessage[] = chatHistory
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Helper function to detect if query needs real-time/current information
      const needsRealTimeData = (query: string): boolean => {
        const lowerQuery = query.toLowerCase();
        const realTimeKeywords = [
          'now', 'today', 'current', 'latest', 'recent', 'this week', 'this month',
          'weather', 'news', 'happening', 'right now', 'currently', 'at the moment',
          'what happened', 'what\'s going on', 'update', 'breaking', 'live'
        ];
        return realTimeKeywords.some(keyword => lowerQuery.includes(keyword));
      };

      // Convert chatLLM to provider override ('openai' | 'gemini' | 'perplexity' | undefined for auto)
      // If 'auto', intelligently choose based on query content and mascot task category
      let providerOverride: 'openai' | 'gemini' | 'perplexity' | undefined;

      if (chatLLM === 'auto') {
        // Check if query needs real-time data
        // Use the current user input, not the last message in the array
        if (needsRealTimeData(actualMessageContentForLLM)) {
          providerOverride = 'perplexity'; // Use web-grounded for current info
          console.log('[Chat] Auto mode detected real-time query, using Perplexity');
        } else {
          // Use task-based selection (OpenAI vs Gemini)
          providerOverride = undefined; // Let Edge Function decide based on taskCategory
        }
      } else if (chatLLM === 'openai' || chatLLM === 'gemini' || chatLLM === 'perplexity') {
        providerOverride = chatLLM; // Manual selection
      } else {
        providerOverride = undefined; // Fallback to auto
      }

      // Log which provider we're using
      console.log('[Chat] Sending message with provider override:', providerOverride || 'auto (system chooses)');
      console.log('[Chat] Current chatLLM setting:', chatLLM);

      // Create or use existing conversation
      // isFirstUserMessage was already checked at the start of the function
      let conversationId = currentConversationId;
      let isNewConversation = false;
      if (!conversationId) {
        try {
          console.log('[Chat] Creating new conversation for mascot:', mascotId || '1');
          const newConversation = await createConversation(mascotId || '1');
          conversationId = newConversation.id;
          console.log('[Chat] New conversation created:', conversationId);
          setCurrentConversationId(conversationId);
          isNewConversation = true;
        } catch (error) {
          console.error('[Chat] Error creating conversation:', error);
          // Continue without conversationId - messages won't be saved but chat will work
        }
      } else {
        console.log('[Chat] Using existing conversation:', conversationId);
      }

      // count user messages to see if we should increment trial usage
      const userMessageCount = [
        ...messages.filter(m => m.role === 'user'),
        { role: 'user', content: messageContent }
      ].length;

      console.log('[Chat] User message count:', userMessageCount);

      // Increment trial usage if this conversation reaches 3 user messages
      // and we haven't incremented it for this conversation yet
      if (isTrial && mascotId && conversationId && userMessageCount >= 3 && !hasIncrementedTrial) {
        try {
          console.log('[Chat] 3rd+ user message reached - incrementing trial usage for mascot:', mascotId);
          const { error: trialError, usage } = await incrementTrialUsage(mascotId, conversationId);
          if (trialError) {
            console.error('[Chat] Error incrementing trial usage:', trialError);
          } else {
            console.log('[Chat] Trial usage incremented successfully:', usage);
            setHasIncrementedTrial(true);
            // Update local trial count immediately for UI feedback
            if (usage) {
              setLocalTrialCount(usage.conversationCount);
              await refreshAccess();
            }
          }
        } catch (error) {
          console.error('[Chat] Error incrementing trial usage:', error);
        }
      }

      // Save user message to database
      if (conversationId) {
        try {
          console.log('[Chat] Saving user message to conversation:', conversationId);
          const savedMessage = await saveMessage(conversationId, 'user', actualMessageContentForLLM);
          console.log('[Chat] User message saved successfully:', savedMessage.id);
          setHasSavedFirstMessage(true);
        } catch (error) {
          console.error('[Chat] Error saving user message:', error);
          // Don't block the chat flow if saving fails, but log it
        }
      } else {
        console.warn('[Chat] No conversationId available to save user message');
      }

      // Perplexity requires strict alternation between user and assistant messages
      // Filter to ensure no consecutive messages with the same role
      let messagesToSend = secureMessages;
      if (providerOverride === 'perplexity') {
        const alternatingMessages: SecureChatMessage[] = [];

        // 1. Remove leading assistant messages (Perplexity must start with User)
        // Perplexity cannot handle [system, assistant, user...]
        let startIndex = 0;
        while (startIndex < secureMessages.length && secureMessages[startIndex].role === 'assistant') {
          startIndex++;
        }

        const validMessages = secureMessages.slice(startIndex);

        // 2. Ensure alternation
        let lastRole: 'user' | 'assistant' | null = null;

        for (const msg of validMessages) {
          // Only add message if it's different from the last role
          if (msg.role !== lastRole) {
            alternatingMessages.push(msg);
            lastRole = msg.role;
          }
        }

        messagesToSend = alternatingMessages;
        console.log('[Chat] Filtered for Perplexity alternation:', secureMessages.length, '→', messagesToSend.length, 'messages');
      }

      // Use secure chat stream through Supabase Edge Function (avoids CORS)
      const response = await secureChatStream(
        mascotId || '1',
        messagesToSend,
        (chunk) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
          // Auto-scroll while streaming
          scrollViewRef.current?.scrollToEnd({ animated: false });
        },
        conversationId || undefined, // Pass conversationId to Edge Function
        activeSkillId || undefined, // skillId
        providerOverride, // provider override (undefined = system chooses)
        deepThinkingEnabled, // Deep Thinking mode (uses pro models)
        attachment && attachment.base64 ? { mimeType: attachment.mimeType || 'image/jpeg', base64: attachment.base64 } : undefined,
        mascot.taskCategory // Pass task category for auto provider selection
      );

      const assistantContent = response.content;

      // Use the provider from the response (Edge Function tells us what was actually used)
      const actualProvider: 'openai' | 'gemini' | 'perplexity' | undefined = response.provider ||
        (providerOverride || // Fallback to user override if response doesn't include provider
          (response.model?.toLowerCase().includes('gpt') ? 'openai' :
            response.model?.toLowerCase().includes('gemini') ? 'gemini' :
              response.model?.toLowerCase().includes('sonar') ? 'perplexity' :
                undefined));

      console.log('[Chat] Response received - Model:', response.model, 'Provider:', actualProvider, '(requested:', providerOverride || 'auto', ')');

      // Save assistant message to database
      if (conversationId) {
        try {
          console.log('[Chat] Saving assistant message to conversation:', conversationId);
          const savedMessage = await saveMessage(conversationId, 'assistant', assistantContent, response.model);
          console.log('[Chat] Assistant message saved successfully:', savedMessage.id);
        } catch (error) {
          console.error('[Chat] Error saving assistant message:', error);
          // Don't block the chat flow if saving fails, but log it
        }
      } else {
        console.warn('[Chat] No conversationId available to save assistant message');
      }

      // Generate title after assistant response (need at least user + assistant message)
      // Only generate once per conversation
      if (!titleGenerationQueued && conversationId && assistantContent) {
        // Count total messages including the ones we just added
        const totalMessages = messages.filter(m => !m.isThinking && (m.role === 'user' || m.role === 'assistant')).length + 2; // +2 for user and assistant we just added

        if (totalMessages >= 2) { // At least one exchange (user + assistant)
          setTitleGenerationQueued(true);
          // Generate title asynchronously (don't block UI)
          setTimeout(async () => {
            try {
              const conversationMessages = [
                ...messages
                  .filter(m => !m.isThinking && (m.role === 'user' || m.role === 'assistant'))
                  .slice(-2) // Previous messages
                  .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                { role: 'user' as const, content: actualMessageContentForLLM },
                { role: 'assistant' as const, content: assistantContent },
              ];
              console.log('[Chat] Generating conversation title for:', conversationId);
              await generateConversationTitle(conversationId, conversationMessages, mascotId || '1');
              console.log('[Chat] Conversation title generated successfully');
            } catch (error) {
              console.error('[Chat] Error generating conversation title:', error);
              // Reset flag on error so we can try again
              setTitleGenerationQueued(false);
            }
          }, 2000); // Wait 2 seconds to ensure messages are saved
        }
      }

      // Add the complete message with provider info
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent,
          model: response.model,
          provider: actualProvider, // Store which provider was used
          citations: response.citations, // Store Perplexity citations
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
      // Focus input after response completes so user can continue typing
      // Use longer delay to ensure response rendering is complete
      if (Platform.OS === 'web') {
        requestAnimationFrame(() => {
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 150);
        });
      } else {
        setTimeout(() => {
          chatInputRef.current?.focus();
        }, 200);
      }
    }
  }, [isLoading, messages, mascotId, formatSourcesForMessage, chatLLM, activeSkill, dbPersonality, activeSkillId]);

  // Auto-send initial message from home screen
  // IMPORTANT: If skillId is provided, send the skill label
  // User sees the skill label, but LLM receives the full skill prompt (handled in sendMessage)
  useEffect(() => {
    if ((initialMessage || (initialAttachmentUri && initialAttachmentBase64)) && !hasProcessedInitialMessage.current) {
      hasProcessedInitialMessage.current = true;

      // If we have an initial message, send it automatically
      // But verify we haven't already saved it (in case of remounts)
      // Check if messages array contains only the initial assistant message (length 1)
      // or is completely empty (length 0)
      const hasOnlyInitialAssistantMessage = messages.length === 1 && messages[0]?.id === '1' && messages[0]?.role === 'assistant';
      const isMessagesEmpty = messages.length === 0;

      if (hasOnlyInitialAssistantMessage || isMessagesEmpty) {
        console.log('Auto-sending initial message:', initialMessage || 'Image only');

        let attachment = undefined;
        if (initialAttachmentUri && initialAttachmentBase64) {
          attachment = {
            uri: initialAttachmentUri,
            base64: initialAttachmentBase64,
            mimeType: initialAttachmentMime || 'image/jpeg'
          };
        }

        // Use a small timeout to ensure the UI is ready
        setTimeout(() => {
          // If we have a skillId, send the skill label
          // sendMessage will detect it's a skill and send the full prompt to LLM
          if (skillId && activeSkillId && activeSkill) {
            // Send the skill label (user sees this), but LLM gets full prompt
            sendMessage(activeSkill.skill_label, true, attachment); // true = this is a skill label
          } else {
            // No skill selected, send the initial message as-is
            sendMessage(initialMessage || '', false, attachment);
          }
        }, 500);
      }
    }
  }, [initialMessage, sendMessage, skillId, activeSkillId, activeSkill, initialAttachmentUri, initialAttachmentBase64, initialAttachmentMime, messages]);

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
  const handleVoiceInput = useCallback(() => {
    if (!SPEECH_RECOGNITION_AVAILABLE) {
      console.warn('Speech recognition is only available on web');
      return;
    }

    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Can be made configurable based on user language preference

    recognition.onstart = () => {
      setIsRecording(true);
      console.log('Voice recognition started...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      console.log('Voice input:', transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow microphone access to use voice input.');
      } else if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      console.log('Voice recognition ended.');
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsRecording(false);
    }
  }, []);

  const handleSend = async (text?: string, attachment?: { uri: string; base64?: string; mimeType?: string }) => {
    const textToSend = typeof text === 'string' ? text : inputText;
    if ((!textToSend.trim() && !attachment) || isLoading) return;

    // Don't dismiss keyboard on web - we want to keep focus
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    await sendMessage(textToSend, false, attachment);
    // Focus input after sending (with a small delay to ensure it works)
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 200);
  };

  const handleSkillPress = async (skill: MascotSkill | string) => {
    // When a skill is clicked, send the FULL skill prompt as the user message
    // User sees the skill label, but LLM receives the complete skill instructions
    if (isLoading) return;
    // Dismiss keyboard if visible
    Keyboard.dismiss();

    // Handle both database skill objects and legacy string skills
    const skillLabel = typeof skill === 'string' ? skill : skill.skill_label;
    const skillIdToActivate = typeof skill === 'string' ? null : skill.id;

    // CRITICAL: Get the FULL skill prompt from the skill object or from dbSkills
    // For non-admin users, skill_prompt will be null - DO NOT use skill_prompt_preview
    // The Edge Function will fetch the full prompt from the database using skillId
    // We only use skill_prompt (full prompt), never skill_prompt_preview (partial preview)
    let skillPrompt = typeof skill === 'string' ? null : skill.skill_prompt;

    // If we don't have the prompt from the skill object, try to get it from dbSkills
    if (!skillPrompt && skillIdToActivate) {
      const fullSkill = dbSkills.find((s) => s.id === skillIdToActivate);
      // Only use full prompt (admin only), never preview
      skillPrompt = fullSkill?.skill_prompt || null;
    }

    // If we don't have the full prompt, that's OK - Edge Function will fetch it using skillId
    // We should NOT send the preview or label to the LLM - let Edge Function handle it
    if (!skillPrompt && skillIdToActivate) {
      console.log('[Chat] Full skill prompt not available in client. Edge Function will fetch it using skillId:', skillIdToActivate);
    }

    // Set active skill for future messages
    if (skillIdToActivate) {
      setActiveSkillId(skillIdToActivate);
    }

    // Check if this is the first user message BEFORE adding it to state
    // This determines if it's a new conversation for trial purposes
    const hasUserMessages = messages.some(m => m.role === 'user');
    const isFirstUserMessage = !hasUserMessages;

    // CRITICAL: User sees the skill label, but LLM receives the FULL skill prompt
    // Send the skill label as the message (user will see it)
    // But when sending to LLM, we'll replace it with the full skill prompt
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: skillLabel, // User sees the skill label
    };

    const assistantMessageId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');
    setShowSkills(false);

    // Switch to chat tab to show the message
    setActiveTab('chat');

    // Scroll to bottom (only if ScrollView is mounted and we're on chat tab)
    setTimeout(() => {
      if (scrollViewRef.current) {
        try {
          scrollViewRef.current.scrollToEnd({ animated: true });
        } catch (error) {
          // ScrollView might not be ready yet, ignore error
          console.log('[Chat] ScrollView not ready for scrolling:', error);
        }
      }
    }, 200);

    try {
      // Clear web sources if web search is disabled
      if (!webSearchEnabled) {
        setWebSources([]);
        setWebSearchError(null);
      }

      // Get the mascot's system prompt (instructions only)
      // IMPORTANT: The skill prompt is sent as the FIRST user message
      // But we should also add it to the system prompt so the LLM continues following it
      // throughout the conversation
      const mascotData = MASCOT_DATA[mascotId || '1'];
      let systemPrompt = mascotData?.systemPrompt || 'You are a helpful AI assistant.';

      // Add database personality if available
      if (dbPersonality) {
        systemPrompt = `${systemPrompt}\n\n---\n\n${dbPersonality.personality}`;
      }

      // Add skill prompt to system prompt ONLY if we have the full prompt (admin users)
      // For non-admin users, the Edge Function will add it to the system prompt
      if (skillPrompt) {
        systemPrompt = `${systemPrompt}\n\n---\n\nCRITICAL: Follow these skill-specific instructions throughout this entire conversation:\n\n${skillPrompt}\n\nThese instructions define how you should behave and what questions you should ask. Continue following them for all subsequent messages.`;
      }

      // CRITICAL: For skill clicks, we have two scenarios:
      // 1. Admin users: We have skillPrompt (full prompt) - send it to LLM
      // 2. Non-admin users: We don't have skillPrompt - send skillLabel, Edge Function will fetch full prompt
      // NEVER send skill_prompt_preview - it's incomplete and shouldn't be shown to LLM
      const actualMessageContentForLLM = skillPrompt || skillLabel;

      console.log('[Chat] Skill clicked - Label:', skillLabel);
      console.log('[Chat] Skill clicked - Full prompt available:', !!skillPrompt);
      if (skillPrompt) {
        console.log('[Chat] Skill clicked - Sending full prompt to LLM (length:', skillPrompt.length, ')');
      } else {
        console.log('[Chat] Skill clicked - Sending skill label. Edge Function will fetch full prompt using skillId:', skillIdToActivate);
      }

      const chatHistory: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
          .filter((m) => !m.isThinking && (m.role === 'user' || m.role === 'assistant'))
          .map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
        { role: 'user', content: actualMessageContentForLLM }, // Send FULL skill prompt to LLM (user sees label)
      ];

      let fullContent = '';

      // Convert chatLLM to provider override ('openai' | 'gemini' | undefined for auto)
      // If 'auto', don't pass provider (let system choose based on mascot config or default)
      // If 'perplexity', treat as 'auto' for now (not supported in Edge Function yet)
      const providerOverride: 'openai' | 'gemini' | undefined =
        chatLLM === 'openai' || chatLLM === 'gemini' ? chatLLM : undefined;

      console.log('[Chat] Skill press - Provider override:', providerOverride || 'auto (system chooses)');

      // Convert chat messages to secure chat format (no system messages)
      const secureMessages: SecureChatMessage[] = chatHistory
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Create or use existing conversation
      // isFirstUserMessage was already checked at the start of handleSkillPress
      let conversationId = currentConversationId;
      let isNewConversation = false;
      if (!conversationId) {
        try {
          console.log('[Chat] Creating new conversation for mascot:', mascotId || '1');
          const newConversation = await createConversation(mascotId || '1');
          conversationId = newConversation.id;
          console.log('[Chat] New conversation created:', conversationId);
          setCurrentConversationId(conversationId);
          isNewConversation = true;
        } catch (error) {
          console.error('[Chat] Error creating conversation:', error);
          // Continue without conversationId - messages won't be saved but chat will work
        }
      } else {
        console.log('[Chat] Using existing conversation:', conversationId);
      }

      // Increment trial usage if this is the FIRST user message in the conversation
      // This counts as one trial - clicking a skill or sending first message starts a conversation
      console.log('[Chat] handleSkillPress - Trial check:', {
        isFirstUserMessage,
        isTrial,
        mascotId,
        conversationId,
        reason,
        currentTrialCount: localTrialCount,
      });

      // count user messages to see if we should increment trial usage
      const userMessageCount = [
        ...messages.filter(m => m.role === 'user'),
        { role: 'user', content: skillLabel }
      ].length;

      console.log('[Chat] handleSkillPress - User message count:', userMessageCount);

      // Increment trial usage if this conversation reaches 3 user messages
      // and we haven't incremented it for this conversation yet
      if (isTrial && mascotId && conversationId && userMessageCount >= 3 && !hasIncrementedTrial) {
        try {
          console.log('[Chat] handleSkillPress - 3rd+ user message reached - incrementing trial usage for mascot:', mascotId);
          const { error: trialError, usage } = await incrementTrialUsage(mascotId, conversationId);
          if (trialError) {
            console.error('[Chat] Error incrementing trial usage:', trialError);
          } else {
            console.log('[Chat] handleSkillPress - Trial usage incremented successfully:', usage);
            setHasIncrementedTrial(true);
            // Update local trial count immediately for UI feedback
            if (usage) {
              setLocalTrialCount(usage.conversationCount);
              await refreshAccess();
            }
          }
        } catch (error) {
          console.error('[Chat] Error incrementing trial usage:', error);
        }
      }

      // Save user message to database
      // IMPORTANT: Save the skill label (what user sees), not the prompt
      // The prompt is sent to LLM but shouldn't be stored/displayed in chat history
      if (conversationId) {
        try {
          console.log('[Chat] Saving user message to conversation:', conversationId);
          // Save skillLabel (what user sees), not the prompt
          const savedMessage = await saveMessage(conversationId, 'user', skillLabel);
          console.log('[Chat] User message saved successfully:', savedMessage.id);
          setHasSavedFirstMessage(true);
        } catch (error) {
          console.error('[Chat] Error saving user message:', error);
          // Don't block the chat flow if saving fails, but log it
        }
      } else {
        console.warn('[Chat] No conversationId available to save user message');
      }

      // Use secure chat stream through Supabase Edge Function (avoids CORS)
      // CRITICAL: Even though skill prompt is in the user message, we still pass skillId
      // as a fallback in case the prompt wasn't properly extracted above
      // The Edge Function can use this to fetch the prompt if needed
      const response = await secureChatStream(
        mascotId || '1',
        secureMessages,
        (chunk: string) => {
          fullContent += chunk;
          setStreamingContent(fullContent);
          scrollViewRef.current?.scrollToEnd({ animated: false });
        },
        conversationId || undefined, // Pass conversationId to Edge Function
        skillIdToActivate || undefined, // skillId - pass it as backup (though prompt is in user message)
        providerOverride, // provider override (undefined = system chooses)
        deepThinkingEnabled // Deep Thinking mode (uses pro models)
      );

      const assistantContent = response.content;

      // Use the provider from the response (Edge Function tells us what was actually used)
      const actualProvider: 'openai' | 'gemini' | 'perplexity' | undefined = response.provider ||
        (providerOverride || // Fallback to user override if response doesn't include provider
          (response.model?.toLowerCase().includes('gpt') ? 'openai' :
            response.model?.toLowerCase().includes('gemini') ? 'gemini' :
              response.model?.toLowerCase().includes('sonar') ? 'perplexity' :
                undefined));

      console.log('[Chat] Skill response - Model:', response.model, 'Provider:', actualProvider, '(requested:', providerOverride || 'auto', ')');

      // Save assistant message to database
      if (conversationId) {
        try {
          console.log('[Chat] Saving assistant message to conversation:', conversationId);
          const savedMessage = await saveMessage(conversationId, 'assistant', assistantContent, response.model);
          console.log('[Chat] Assistant message saved successfully:', savedMessage.id);
        } catch (error) {
          console.error('[Chat] Error saving assistant message:', error);
          // Don't block the chat flow if saving fails, but log it
        }
      } else {
        console.warn('[Chat] No conversationId available to save assistant message');
      }

      // Add the complete message with provider info
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent,
          model: response.model,
          provider: actualProvider, // Store which provider was used
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

  // Tab labels: Chat, Skills, Personality, History (sources hidden)
  const tabs: { key: ChatTab; label: string }[] = [
    { key: 'chat', label: t.chat.tabs.chat },
    { key: 'skills', label: 'Skills' },
    { key: 'personality', label: t.chat.tabs.personality },
    { key: 'history', label: 'History' },
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
      <ChatHeader
        mascotName={mascot.name}
        mascotSubtitle={headerSubtitle}
        mascotImage={mascotImage}
        isLiked={isLiked}
        likeCount={likeCount}
        onBack={handleBack}
        onToggleLike={toggleLike}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as ChatTab)}
        isToggling={isToggling}
        insets={insets}
        isTrial={isTrial}
        trialCount={localTrialCount}
        trialLimit={trialLimit}
      />

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
            dbSkills.map((skill) => {
              // Check if skill is locked (user doesn't have full access)
              const isSkillLocked = !skill.is_full_access;

              return (
                <Pressable
                  key={skill.id}
                  onPress={() => {
                    // Only allow clicking if skill is not locked or user has access
                    if (!isSkillLocked || skill.is_full_access) {
                      handleSkillPress(skill);
                    }
                  }}
                  disabled={isSkillLocked && !skill.is_full_access}
                  style={[
                    styles.skillPreviewCard,
                    activeSkillId === skill.id && { borderColor: mascot.color, borderWidth: 2 },
                    isSkillLocked && !skill.is_full_access && { opacity: 0.6 },
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
              );
            })
          )}
        </ScrollView>
      ) : activeTab === 'personality' ? (
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.personalityContent}
        >
          {personalityLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : !dbPersonality ? (
            <Text
              style={[
                styles.sourcesMessage,
                {
                  fontFamily: textStyles.body.fontFamily,
                  color: colors.textMuted,
                },
              ]}
            >
              No personality configured for this mascot yet.
            </Text>
          ) : (
            <View
              style={[
                styles.personalityCard,
                { backgroundColor: colors.surface, borderColor: colors.outline },
              ]}
            >
              {/* Header with Edit button */}
              <View style={styles.personalityHeader}>
                <Text
                  style={[
                    styles.personalityTitle,
                    {
                      fontFamily: fontFamilies.figtree.semiBold,
                      color: colors.text,
                    },
                  ]}
                >
                  Personality
                </Text>
                {!isEditingPersonality ? (
                  <Pressable
                    onPress={() => {
                      setEditedPersonality(dbPersonality.personality);
                      setIsEditingPersonality(true);
                    }}
                    style={styles.editButton}
                  >
                    <Icon name="edit" size={18} color={colors.primary} />
                    <Text
                      style={[
                        styles.editButtonText,
                        {
                          fontFamily: fontFamilies.figtree.medium,
                          color: colors.primary,
                        },
                      ]}
                    >
                      Edit
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Content: Edit mode or View mode */}
              {isEditingPersonality ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={[
                      styles.personalityTextInput,
                      {
                        fontFamily: fontFamilies.figtree.regular,
                        color: colors.text,
                        borderColor: colors.outline,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={editedPersonality}
                    onChangeText={setEditedPersonality}
                    placeholder="Enter personality..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    textAlignVertical="top"
                  />
                  <View style={styles.personalityActions}>
                    {dbPersonality?.default_personality ? (
                      <Pressable
                        onPress={async () => {
                          setIsResettingPersonality(true);
                          try {
                            await resetPersonalityToDefault(mascotId || '1');
                            await refetchPersonality();
                            // editedPersonality will be synced via useEffect when dbPersonality updates
                          } catch (error) {
                            console.error('Error resetting personality:', error);
                          } finally {
                            setIsResettingPersonality(false);
                          }
                        }}
                        disabled={isSavingPersonality || isResettingPersonality}
                        style={[
                          styles.resetButton,
                          {
                            borderColor: colors.outline,
                            opacity: (isSavingPersonality || isResettingPersonality) ? 0.6 : 1,
                          },
                        ]}
                      >
                        {isResettingPersonality ? (
                          <ActivityIndicator size="small" color={colors.textMuted} />
                        ) : (
                          <>
                            <Icon name="settings" size={16} color={colors.textMuted} />
                            <Text
                              style={[
                                styles.resetButtonText,
                                {
                                  fontFamily: fontFamilies.figtree.medium,
                                  color: colors.textMuted,
                                },
                              ]}
                            >
                              Reset to Default
                            </Text>
                          </>
                        )}
                      </Pressable>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    <View style={styles.saveCancelButtons}>
                      <Pressable
                        onPress={() => {
                          setIsEditingPersonality(false);
                          setEditedPersonality(dbPersonality.personality);
                        }}
                        disabled={isSavingPersonality || isResettingPersonality}
                        style={[
                          styles.cancelButton,
                          {
                            borderColor: colors.outline,
                            opacity: (isSavingPersonality || isResettingPersonality) ? 0.6 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cancelButtonText,
                            {
                              fontFamily: fontFamilies.figtree.medium,
                              color: colors.text,
                            },
                          ]}
                        >
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          setIsSavingPersonality(true);
                          try {
                            await updatePersonality(mascotId || '1', editedPersonality);
                            await refetchPersonality();
                            setIsEditingPersonality(false);
                          } catch (error) {
                            console.error('Error saving personality:', error);
                          } finally {
                            setIsSavingPersonality(false);
                          }
                        }}
                        disabled={isSavingPersonality || isResettingPersonality || !editedPersonality.trim()}
                        style={[
                          styles.saveButton,
                          {
                            backgroundColor: colors.primary,
                            opacity: (isSavingPersonality || isResettingPersonality || !editedPersonality.trim()) ? 0.6 : 1,
                          },
                        ]}
                      >
                        {isSavingPersonality ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text
                            style={[
                              styles.saveButtonText,
                              {
                                fontFamily: fontFamilies.figtree.medium,
                                color: '#FFFFFF',
                              },
                            ]}
                          >
                            Save
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                dbPersonality.personality && typeof dbPersonality.personality === 'string' && dbPersonality.personality.trim() ? (
                  <Markdown style={markdownStyles}>
                    {dbPersonality.personality}
                  </Markdown>
                ) : (
                  <Text style={[styles.messageText, { color: colors.textMuted }]}>
                    No personality available
                  </Text>
                )
              )}
            </View>
          )}
        </ScrollView>
      ) : activeTab === 'history' ? (
        <ChatHistory
          mascotId={mascotId}
          onConversationPress={(conversationId) => {
            // Switch to the selected conversation
            // This will trigger the useEffect to load messages
            setCurrentConversationId(conversationId);
            // Clear current messages so they get replaced when loaded
            setMessages([]);
            // Switch to chat tab to view the conversation
            setActiveTab('chat');
            // Update URL params for deep linking
            router.setParams({ conversationId });
          }}
          onNewChat={() => {
            // Start a new conversation
            setCurrentConversationId(null);
            setTitleGenerationQueued(false);
            setMessages([
              {
                id: '1',
                role: 'assistant',
                content: initialAssistantMessage,
              },
            ]);
            setActiveTab('chat');
            // Clear URL params
            router.setParams({ conversationId: undefined });
          }}
          onSkillPress={handleSkillPress}
        />
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
                    { backgroundColor: colors.chatBubble }, // Reverted to default grey
                  ]}
                >
                  {message.attachment && (
                    <Image
                      source={{ uri: message.attachment.uri }}
                      style={{
                        width: 200,
                        height: 200,
                        borderRadius: 12,
                        marginBottom: 8,
                      }}
                      resizeMode="cover"
                    />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      {
                        fontFamily: fontFamilies.figtree.medium,
                        color: colors.text, // Reverted to default text color
                      },
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              ) : (
                <View style={styles.assistantMessage}>
                  {message.content && typeof message.content === 'string' && message.content.trim() ? (
                    <>
                      <Markdown
                        style={markdownStyles}
                      >
                        {message.content}
                      </Markdown>
                      {/* Render citations if available (Perplexity) */}
                      {message.citations && message.citations.length > 0 && (
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.outline + '40' }}>
                          <Text style={{ fontFamily: fontFamilies.figtree.semiBold, fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                            Sources:
                          </Text>
                          {message.citations.map((url, index) => (
                            <Pressable
                              key={index}
                              onPress={() => Linking.openURL(url)}
                              style={{ marginBottom: 4 }}
                            >
                              <Text style={{ fontFamily: fontFamilies.figtree.regular, fontSize: 12, color: colors.primary }}>
                                [{index + 1}] {url.length > 60 ? url.substring(0, 60) + '...' : url}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={[styles.messageText, { color: colors.textMuted }]}>
                      (Empty message)
                    </Text>
                  )}
                  {(message.model || message.provider) && (
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
                        {message.provider ?
                          `${message.provider === 'openai' ? 'OpenAI' : message.provider === 'perplexity' ? 'Perplexity' : 'Gemini'} ${message.model ? `(${message.model})` : ''}`.trim() :
                          message.model || 'Unknown'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Streaming response */}
          {isLoading && streamingContent && typeof streamingContent === 'string' && streamingContent.trim() && (
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
      {/* Only show skills at bottom when NOT on history tab (skills are in history tab) */}
      {showSkills && activeTab !== 'history' && (
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
        {activeTab === 'chat' && (
          <>
            {isTrialExhausted ? (
              <View style={styles.purchaseContainer}>
                <Text
                  style={[
                    styles.purchaseText,
                    {
                      fontFamily: fontFamilies.figtree.medium,
                      fontSize: 14,
                      color: colors.textMuted,
                      marginBottom: 12,
                      textAlign: 'center',
                    },
                  ]}
                >
                  You've used all {trialLimit} trial conversations. Purchase to continue chatting.
                </Text>
                <BigPrimaryButton
                  label="Purchase"
                  onPress={() => {
                    // TODO: Navigate to purchase screen or trigger purchase flow
                    console.log('Purchase pressed for mascot:', mascotId);
                    router.push(`/(tabs)/store`);
                  }}
                />
              </View>
            ) : (
              <ChatInputBox
                ref={chatInputRef}
                value={inputText}
                onChangeText={setInputText}
                onSend={handleSend}
                placeholder={t.chat.placeholder}
                disabled={isLoading || !canUse}
                mascotColor={mascot.color}
                showLLMPicker={true}
                chatLLM={chatLLM}
                onLLMChange={setChatLLM}
                deepThinkingEnabled={deepThinkingEnabled}
                onDeepThinkingToggle={() => setDeepThinkingEnabled((prev) => !prev)}
                isAdmin={isAdmin}
                isRecording={isRecording}
                onVoicePress={SPEECH_RECOGNITION_AVAILABLE ? handleVoiceInput : undefined}
                maxWidth={CHAT_MAX_WIDTH}
              />
            )}
          </>
        )}
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
  personalityContent: {
    padding: 16,
  },
  personalityCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  personalityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personalityTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 14,
    lineHeight: 18,
  },
  editContainer: {
    gap: 12,
  },
  personalityTextInput: {
    minHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  personalityActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 14,
    lineHeight: 18,
  },
  saveCancelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    lineHeight: 18,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    lineHeight: 18,
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
  purchaseContainer: {
    width: '100%',
    maxWidth: CHAT_MAX_WIDTH,
    padding: 16,
    alignItems: 'center',
  },
  purchaseText: {
    textAlign: 'center',
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

