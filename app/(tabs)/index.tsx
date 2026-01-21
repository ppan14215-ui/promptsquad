import { View, StyleSheet, Text, Pressable, Platform, Image, useWindowDimensions, Modal, ActivityIndicator, Keyboard, LayoutAnimation, KeyboardAvoidingView } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Icon, Skill, ChatInputBox, MascotDetails, LinkPill, HomeHeader, MascotCarousel } from '@/components';
import { useTheme, fontFamilies } from '@/design-system';
import { useAuth } from '@/services/auth';
import { useMascotSkills, MascotSkill, useIsAdmin, useMascots, MascotBasic } from '@/services/admin';
import { getMascotImageSource, getMascotGrayscaleImageSource } from '@/services/admin/mascot-images';
import { useUnlockedMascots } from '@/services/mascot-access';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Local mascot images
const mascotImages = {
  bear: require('../../assets/mascots/Bear.png'),
  fox: require('../../assets/mascots/fox.png'),
  panda: require('../../assets/mascots/panda.png'),
  zebra: require('../../assets/mascots/zebra.png'),
  owl: require('../../assets/mascots/owl.png'),
  turtle: require('../../assets/mascots/turtle.png'),
  badger: require('../../assets/mascots/badger.png'),
  mouse: require('../../assets/mascots/mouse.png'),
  pig: require('../../assets/mascots/pig.png'),
  cat: require('../../assets/mascots/cat.png'),
  camel: require('../../assets/mascots/camel.png'),
  frog: require('../../assets/mascots/frog.png'),
  giraffe: require('../../assets/mascots/giraffe.png'),
  lion: require('../../assets/mascots/lion.png'),
  seahorse: require('../../assets/mascots/searhorse.png'),
};

// Color type for all available mascot colors
type MascotColor = 'yellow' | 'red' | 'green' | 'pink' | 'purple' | 'darkPurple' | 'brown' | 'teal' | 'orange' | 'blue';

// Purchased mascots (user's owned mascots)
type OwnedMascot = {
  id: string;
  name: string;
  subtitle: string;
  image: any;
  color: MascotColor;
  questionPrompt: string;
  skills: Skill[];
  personality: string[];
  models: string[];
};

// Free tier mascots (first 4)
const FREE_MASCOTS: OwnedMascot[] = [
  {
    id: '1',
    name: 'Analyst Bear',
    subtitle: 'Great at research',
    image: mascotImages.bear,
    color: 'yellow',
    questionPrompt: 'What should we analyze?',
    personality: ['Analytical', 'Thorough', 'Patient'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '1-1', label: 'Stock analysis' },
      { id: '1-2', label: 'Competitive analysis' },
      { id: '1-3', label: 'Market analysis' },
    ],
  },
  {
    id: '2',
    name: 'Writer Fox',
    subtitle: 'Best at writing',
    image: mascotImages.fox,
    color: 'orange',
    questionPrompt: 'What should we write?',
    personality: ['Creative', 'Eloquent', 'Witty'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '2-1', label: 'Blog posts' },
      { id: '2-2', label: 'Email drafts' },
      { id: '2-3', label: 'Social media' },
    ],
  },
  {
    id: '3',
    name: 'UX Panda',
    subtitle: 'Principal UX skills',
    image: mascotImages.panda,
    color: 'green',
    questionPrompt: 'What can I help with?',
    personality: ['Empathetic', 'Detail-oriented', 'User-focused'],
    models: ['GPT-4o', 'Gemini Pro'],
    skills: [
      { id: '3-1', label: 'User research' },
      { id: '3-2', label: 'Wireframing' },
      { id: '3-3', label: 'Usability testing' },
    ],
  },
  {
    id: '4',
    name: 'Advice Zebra',
    subtitle: 'Here to support',
    image: mascotImages.zebra,
    color: 'pink',
    questionPrompt: 'How can I help you today?',
    personality: ['Supportive', 'Wise', 'Balanced'],
    models: ['Claude 3', 'Gemini Pro'],
    skills: [
      { id: '4-1', label: 'Life coaching' },
      { id: '4-2', label: 'Decision making' },
      { id: '4-3', label: 'Problem solving' },
    ],
  },
];

// Premium mascots (locked for normal users, available for admins)
const PREMIUM_MASCOTS: OwnedMascot[] = [
  {
    id: '5',
    name: 'Teacher Owl',
    subtitle: 'Lets teach our kids',
    image: mascotImages.owl,
    color: 'purple',
    questionPrompt: 'What shall we learn today?',
    personality: ['Patient', 'Knowledgeable', 'Encouraging'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '5-1', label: 'Lesson planning' },
      { id: '5-2', label: 'Homework help' },
      { id: '5-3', label: 'Concept explanation' },
    ],
  },
  {
    id: '6',
    name: 'Prompt Turtle',
    subtitle: 'Get the most out of AI',
    image: mascotImages.turtle,
    color: 'teal',
    questionPrompt: 'What prompt can I help craft?',
    personality: ['Methodical', 'Precise', 'Helpful'],
    models: ['GPT-4o', 'Claude 3', 'Gemini Pro'],
    skills: [
      { id: '6-1', label: 'Prompt engineering' },
      { id: '6-2', label: 'AI optimization' },
      { id: '6-3', label: 'Workflow automation' },
    ],
  },
  {
    id: '7',
    name: 'Data Badger',
    subtitle: 'Analytics expert',
    image: mascotImages.badger,
    color: 'brown',
    questionPrompt: 'What data shall we explore?',
    personality: ['Analytical', 'Persistent', 'Detail-oriented'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '7-1', label: 'Data visualization' },
      { id: '7-2', label: 'Statistical analysis' },
      { id: '7-3', label: 'Report generation' },
    ],
  },
  {
    id: '8',
    name: 'Quick Mouse',
    subtitle: 'Fast problem solver',
    image: mascotImages.mouse,
    color: 'blue',
    questionPrompt: 'What needs a quick fix?',
    personality: ['Quick', 'Resourceful', 'Efficient'],
    models: ['GPT-4o'],
    skills: [
      { id: '8-1', label: 'Quick fixes' },
      { id: '8-2', label: 'Troubleshooting' },
      { id: '8-3', label: 'Time management' },
    ],
  },
  {
    id: '9',
    name: 'Creative Pig',
    subtitle: 'Design thinking',
    image: mascotImages.pig,
    color: 'pink',
    questionPrompt: 'What shall we create?',
    personality: ['Creative', 'Playful', 'Innovative'],
    models: ['Claude 3', 'Gemini Pro'],
    skills: [
      { id: '9-1', label: 'Brainstorming' },
      { id: '9-2', label: 'Ideation' },
      { id: '9-3', label: 'Creative writing' },
    ],
  },
  {
    id: '10',
    name: 'Code Cat',
    subtitle: 'Programming wizard',
    image: mascotImages.cat,
    color: 'darkPurple',
    questionPrompt: 'What code shall we write?',
    personality: ['Logical', 'Precise', 'Patient'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '10-1', label: 'Code review' },
      { id: '10-2', label: 'Debugging' },
      { id: '10-3', label: 'Architecture' },
    ],
  },
  {
    id: '11',
    name: 'Strategy Camel',
    subtitle: 'Planning expert',
    image: mascotImages.camel,
    color: 'brown',
    questionPrompt: 'What strategy shall we plan?',
    personality: ['Strategic', 'Visionary', 'Organized'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '11-1', label: 'Business strategy' },
      { id: '11-2', label: 'Goal setting' },
      { id: '11-3', label: 'Roadmap planning' },
    ],
  },
  {
    id: '12',
    name: 'Marketing Frog',
    subtitle: 'Growth hacker',
    image: mascotImages.frog,
    color: 'teal',
    questionPrompt: 'What marketing challenge can I help with?',
    personality: ['Persuasive', 'Creative', 'Data-driven'],
    models: ['GPT-4o', 'Grok'],
    skills: [
      { id: '12-1', label: 'Campaign planning' },
      { id: '12-2', label: 'Copywriting' },
      { id: '12-3', label: 'Social strategy' },
    ],
  },
  {
    id: '13',
    name: 'Product Giraffe',
    subtitle: 'Product management',
    image: mascotImages.giraffe,
    color: 'yellow',
    questionPrompt: 'What product question can I help with?',
    personality: ['User-focused', 'Organized', 'Collaborative'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '13-1', label: 'PRD writing' },
      { id: '13-2', label: 'Feature prioritization' },
      { id: '13-3', label: 'Stakeholder management' },
    ],
  },
  {
    id: '14',
    name: 'Support Lion',
    subtitle: 'Customer success',
    image: mascotImages.lion,
    color: 'orange',
    questionPrompt: 'How can I help your customers?',
    personality: ['Empathetic', 'Patient', 'Solution-oriented'],
    models: ['Claude 3', 'GPT-4o'],
    skills: [
      { id: '14-1', label: 'Customer support' },
      { id: '14-2', label: 'FAQ creation' },
      { id: '14-3', label: 'Escalation handling' },
    ],
  },
  {
    id: '15',
    name: 'Mentor Seahorse',
    subtitle: 'Career guidance',
    image: mascotImages.seahorse,
    color: 'blue',
    questionPrompt: 'What career question can I help with?',
    personality: ['Wise', 'Encouraging', 'Experienced'],
    models: ['Claude 3', 'GPT-4o'],
    skills: [
      { id: '15-1', label: 'Career coaching' },
      { id: '15-2', label: 'Resume review' },
      { id: '15-3', label: 'Interview prep' },
    ],
  },
  {
    id: '16',
    name: 'Project Camel',
    subtitle: 'Project management',
    image: mascotImages.camel,
    color: 'orange',
    questionPrompt: 'What project can I help manage?',
    personality: ['Methodical', 'Reliable', 'Organized'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '16-1', label: 'Project planning' },
      { id: '16-2', label: 'Risk management' },
      { id: '16-3', label: 'Status reporting' },
    ],
  },
  {
    id: '17',
    name: 'Research Frog',
    subtitle: 'Market research',
    image: mascotImages.frog,
    color: 'green',
    questionPrompt: 'What research can I help with?',
    personality: ['Curious', 'Thorough', 'Analytical'],
    models: ['GPT-4o', 'Grok'],
    skills: [
      { id: '17-1', label: 'Market analysis' },
      { id: '17-2', label: 'Trend research' },
      { id: '17-3', label: 'Competitor analysis' },
    ],
  },
  {
    id: '18',
    name: 'Agile Giraffe',
    subtitle: 'Scrum master',
    image: mascotImages.giraffe,
    color: 'purple',
    questionPrompt: 'What agile question can I help with?',
    personality: ['Agile', 'Collaborative', 'Adaptive'],
    models: ['GPT-4o'],
    skills: [
      { id: '18-1', label: 'Sprint planning' },
      { id: '18-2', label: 'Retrospectives' },
      { id: '18-3', label: 'Team facilitation' },
    ],
  },
  {
    id: '19',
    name: 'Brand Lion',
    subtitle: 'Brand strategy',
    image: mascotImages.lion,
    color: 'red',
    questionPrompt: 'What brand question can I help with?',
    personality: ['Creative', 'Strategic', 'Visionary'],
    models: ['Claude 3', 'GPT-4o'],
    skills: [
      { id: '19-1', label: 'Brand positioning' },
      { id: '19-2', label: 'Voice & tone' },
      { id: '19-3', label: 'Visual identity' },
    ],
  },
  {
    id: '20',
    name: 'Dev Seahorse',
    subtitle: 'Full-stack developer',
    image: mascotImages.seahorse,
    color: 'darkPurple',
    questionPrompt: 'What development question can I help with?',
    personality: ['Technical', 'Problem-solver', 'Curious'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '20-1', label: 'Full-stack development' },
      { id: '20-2', label: 'API design' },
      { id: '20-3', label: 'Code architecture' },
    ],
  },
];

// All mascots combined (20 total: 4 free + 16 premium)
const ALL_MASCOTS: OwnedMascot[] = [...FREE_MASCOTS, ...PREMIUM_MASCOTS];

// Full color palette with primary and light variants
const COLOR_MAP: Record<MascotColor, string> = {
  yellow: '#EDB440',
  red: '#E64140',
  green: '#74AE58',
  pink: '#EB3F71',
  purple: '#5E24CB',
  darkPurple: '#2D2E66',
  brown: '#826F57',
  teal: '#59C19D',
  orange: '#ED7437',
  blue: '#2D6CF5',
};

// Light variants for backgrounds/accents
const COLOR_LIGHT_MAP: Record<MascotColor, string> = {
  yellow: '#F1E4A0',
  red: '#F3ACAF',
  green: '#CCDFC6',
  pink: '#EBC7D6',
  purple: '#9AAAEE',
  darkPurple: '#B5B2CD',
  brown: '#C0B6A0',
  teal: '#B7E0D6',
  orange: '#EBBF9C',
  blue: '#A6C5FA',
};

// Responsive breakpoint
const DESKTOP_BREAKPOINT = 768;

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedIndex, setSelectedIndex] = useState(2); // Start with Panda selected (index 2)
  const [message, setMessage] = useState('');
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [chatLLM, setChatLLM] = useState<'auto' | 'openai' | 'gemini' | 'perplexity'>('auto');
  const [selectedMascotDetails, setSelectedMascotDetails] = useState<OwnedMascot | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // Fetch mascots from database
  const { mascots: dbMascots, isLoading: isLoadingMascots, error: mascotsError } = useMascots();
  const { unlockedMascotIds, isLoading: isLoadingUnlocked } = useUnlockedMascots();

  // Convert database mascots to OwnedMascot type with fallback to hardcoded
  // Filter to only show unlocked mascots (or all for admin)
  const availableMascots = useMemo(() => {
    let convertedMascots: OwnedMascot[] = [];

    if (dbMascots.length > 0) {
      // Convert database mascots to OwnedMascot type
      convertedMascots = dbMascots
        .map((m: MascotBasic) => {
          const imageSource = getMascotImageSource(m.image_url || null) || mascotImages.bear;
          // Find matching hardcoded mascot for fallback questionPrompt
          const hardcodedMascot = ALL_MASCOTS.find((hm) => hm.id === m.id);
          return {
            id: m.id,
            name: m.name,
            subtitle: m.subtitle || '',
            image: imageSource,
            color: (m.color || 'yellow') as MascotColor,
            questionPrompt: m.question_prompt || hardcodedMascot?.questionPrompt || 'How can I help you?',
            personality: hardcodedMascot?.personality || [],
            models: hardcodedMascot?.models || [],
            skills: hardcodedMascot?.skills || [], // Include hardcoded skills as fallback
          } as OwnedMascot;
        });
    } else {
      // Fallback to hardcoded data
      convertedMascots = isAdmin ? ALL_MASCOTS : FREE_MASCOTS;
    }

    // For admin, show all mascots
    if (isAdmin) {
      return convertedMascots;
    }

    // For regular users, only show unlocked mascots
    if (isLoadingUnlocked) {
      return [];
    }

    return convertedMascots.filter(m => unlockedMascotIds.includes(m.id));
  }, [dbMascots, isAdmin, unlockedMascotIds, isLoadingUnlocked]);

  // Storage key for last selected mascot
  const LAST_MASCOT_KEY = 'lastSelectedMascotId';

  // Load last selected mascot on mount
  useEffect(() => {
    const loadLastMascot = async () => {
      try {
        const lastMascotId = await AsyncStorage.getItem(LAST_MASCOT_KEY);
        if (lastMascotId && availableMascots.length > 0) {
          const index = availableMascots.findIndex(m => m.id === lastMascotId);
          if (index !== -1) {
            setSelectedIndex(index);
          }
        }
      } catch (error) {
        // Handle error silently
      }
    };
    loadLastMascot();
  }, [isAdmin, availableMascots.length]); // Re-run when admin status or available mascots change

  // Listen for keyboard events on mobile
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardVisible(true);
      }
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardVisible(false);
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const selectedMascot = availableMascots[selectedIndex] || availableMascots[0];

  // Fetch skills from database for the selected mascot (only if mascot exists)
  const { skills: dbSkills, isLoading: skillsLoading } = useMascotSkills(selectedMascot?.id || '');

  // Use DB skills if available, otherwise fall back to hardcoded
  const displaySkills = useMemo(() => {
    if (!selectedMascot) return [];

    if (dbSkills.length > 0) {
      return dbSkills.map((s) => ({ id: s.id, label: s.skill_label }));
    }
    // Fallback to hardcoded skills if available
    if (selectedMascot.skills && selectedMascot.skills.length > 0) {
      return selectedMascot.skills;
    }
    // Final fallback: find from ALL_MASCOTS
    const hardcodedMascot = ALL_MASCOTS.find((m) => m.id === selectedMascot.id);
    return hardcodedMascot?.skills || [];
  }, [dbSkills, selectedMascot?.id, selectedMascot?.skills]);

  const userName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Julian';

  const handlePrevMascot = async () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : availableMascots.length - 1;
    setSelectedIndex(newIndex);
    // Save to storage
    try {
      await AsyncStorage.setItem(LAST_MASCOT_KEY, availableMascots[newIndex].id);
    } catch (error) {
      console.error('Error saving last mascot:', error);
    }
  };

  const handleNextMascot = async () => {
    const newIndex = selectedIndex < availableMascots.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    // Save to storage
    try {
      await AsyncStorage.setItem(LAST_MASCOT_KEY, availableMascots[newIndex].id);
    } catch (error) {
      console.error('Error saving last mascot:', error);
    }
  };

  const handleSkillPress = (skill: Skill) => {
    // Check if this is a database skill (has UUID-like ID)
    const isDbSkill = skill.id && skill.id.includes('-') && skill.id.length > 10;

    // Navigate to chat with:
    // - questionPrompt: mascot's question (shown as first assistant message)
    // - initialMessage: the skill label (auto-sent as user's first message)
    // - skillId: if from database, pass the skill ID for combined prompting
    router.push({
      pathname: `/chat/${selectedMascot.id}`,
      params: {
        questionPrompt: selectedMascot.questionPrompt,
        initialMessage: skill.label,
        ...(isDbSkill && { skillId: skill.id }),
      },
    });
  };

  const handleSendMessage = (text?: string, attachment?: { uri: string; base64?: string; mimeType?: string }) => {
    const textToSend = typeof text === 'string' ? text : message;
    if (!textToSend.trim() && !attachment) return;

    // Navigate to chat with:
    // - questionPrompt: mascot's question (shown as first assistant message)
    // - initialMessage: user's typed message (auto-sent)
    // - initialAttachment: user's attachment (auto-sent)
    // - webSearch, deepThinking, chatLLM: carry over settings
    router.push({
      pathname: `/chat/${selectedMascot.id}`,
      params: {
        questionPrompt: selectedMascot.questionPrompt,
        initialMessage: textToSend,
        ...(attachment && {
          initialAttachmentUri: attachment.uri,
          initialAttachmentMime: attachment.mimeType,
          initialAttachmentBase64: attachment.base64
        }),
        deepThinking: deepThinkingEnabled ? 'true' : 'false',
        llm: chatLLM,
      },
    });
    setMessage('');
  };

  const handleMascotCardPress = async (mascot: any, actualIndex: number, isSelected: boolean) => {
    // Find the full OwnedMascot from availableMascots
    const fullMascot = availableMascots.find(m => m.id === mascot.id);
    if (!fullMascot) return;
    if (isSelected) {
      // If already selected, open details modal
      setSelectedMascotDetails(fullMascot);
    } else {
      // If not selected, select this mascot
      setSelectedIndex(actualIndex);
      // Save to storage
      try {
        await AsyncStorage.setItem(LAST_MASCOT_KEY, fullMascot.id);
      } catch (error) {
        console.error('Error saving last mascot:', error);
      }
    }
  };

  // Wrapper component - use KeyboardAvoidingView on both platforms
  // iOS: 'padding' behavior works best
  // Android: 'height' behavior works with adjustResize manifest setting
  const wrapperBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  // Show loading or empty state if no mascots available
  if (isLoadingMascots || isLoadingUnlocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedMascot || availableMascots.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No mascots available. Please complete onboarding.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={wrapperBehavior}
        keyboardVerticalOffset={0}
      >
        {/* Top Section: Header + Skills (Pinned to Top) */}
        <HomeHeader
          userName={userName}
          questionPrompt={selectedMascot.questionPrompt}
          skills={displaySkills}
          onSkillPress={handleSkillPress}
          keyboardVisible={keyboardVisible}
          skillsLoading={skillsLoading}
          isDesktop={isDesktop}
        />

        {/* Spacer to push carousel and input to bottom */}
        <View style={styles.spacer} />

        {/* Bottom Section: Carousel + Input (Pinned to Bottom) */}
        <View style={styles.bottomSection}>
          <MascotCarousel
            mascots={availableMascots.map(m => ({
              id: m.id,
              name: m.name,
              subtitle: m.subtitle,
              image: m.image,
              color: m.color as any,
            }))}
            selectedIndex={selectedIndex}
            onMascotPress={handleMascotCardPress}
            onPrev={handlePrevMascot}
            onNext={handleNextMascot}
            isDesktop={isDesktop}
            scale={0.75}
          />

          {/* Chat Input - sits right below carousel */}
          <View style={[
            styles.inputSection,
            isDesktop && styles.inputSectionDesktop,
            { paddingBottom: Platform.OS !== 'web' ? Math.max(16, insets.bottom) : 24 },
          ]}>
            <ChatInputBox
              value={message}
              onChangeText={setMessage}
              onSend={(text, attachment) => handleSendMessage(text, attachment)}
              placeholder="Ask anything..."
              mascotColor={COLOR_MAP[selectedMascot.color]}
              showLLMPicker={true}
              chatLLM={chatLLM}
              onLLMChange={setChatLLM}
              deepThinkingEnabled={deepThinkingEnabled}
              onDeepThinkingToggle={() => setDeepThinkingEnabled(!deepThinkingEnabled)}
              isAdmin={isAdmin}
              onVoicePress={() => console.log('Voice input not implemented on home screen')}
              maxWidth={800} // Slightly wider on home screen
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Mascot Details Modal */}
      <Modal
        visible={selectedMascotDetails !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMascotDetails(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedMascotDetails(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            {selectedMascotDetails && (
              <MascotDetails
                name={selectedMascotDetails.name}
                subtitle={selectedMascotDetails.subtitle}
                imageSource={selectedMascotDetails.image}
                personality={selectedMascotDetails.personality}
                models={selectedMascotDetails.models}
                // Use displaySkills if this is the currently selected mascot (which has dynamic skills loaded)
                // Otherwise use the mascot's own skills (fallback/static)
                skills={selectedMascotDetails.id === selectedMascot?.id ? displaySkills : selectedMascotDetails.skills}
                variant="available"
                mascotId={selectedMascotDetails.id}
                onClose={() => setSelectedMascotDetails(null)}
                onStartChat={() => {
                  setSelectedMascotDetails(null);
                  router.push({
                    pathname: `/chat/${selectedMascotDetails.id}`,
                    params: {
                      questionPrompt: selectedMascotDetails.questionPrompt,
                    },
                  });
                }}
                onTryOut={() => {
                  setSelectedMascotDetails(null);
                  router.push({
                    pathname: `/chat/${selectedMascotDetails.id}`,
                    params: {
                      questionPrompt: selectedMascotDetails.questionPrompt,
                    },
                  });
                }}
                onUnlock={() => console.log('Unlock pressed')}
                onSkillPress={(skill) => {
                  setSelectedMascotDetails(null);
                  router.push({
                    pathname: `/chat/${selectedMascotDetails.id}`,
                    params: {
                      questionPrompt: selectedMascotDetails.questionPrompt,
                      initialMessage: skill.label,
                    },
                  });
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  headerSection: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
    justifyContent: 'flex-start',
  },
  headerSectionDesktop: {
    alignItems: 'center',
  },
  headerSectionMobile: {
    // Reduce top padding on mobile
    paddingTop: 16,
  },
  headerSectionKeyboard: {
    // When keyboard is visible, minimize the header space
    // but keep flex: 1 so it doesn't collapse to 0
    paddingTop: 0,
    paddingBottom: 0,
  },
  headerContent: {
    width: '100%',
  },
  headerContentDesktop: {
    maxWidth: 678,
  },
  header: {
    gap: 4,
  },
  greeting: {
    fontSize: 18,
    lineHeight: 18 * 1.3,
  },
  questionPrompt: {
    fontSize: 28,
    lineHeight: 36,
  },
  skillPills: {
    marginTop: 16,
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 16,
  },
  bottomSectionDesktop: {
    alignItems: 'center',
  },
  carouselSection: {
    alignItems: 'center',
  },
  carousel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mascotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mascotCard: {
    overflow: 'hidden',
    alignItems: 'center',
  },
  mascotTextContainer: {
    alignItems: 'center',
    gap: 2,
  },
  mascotName: {
    textAlign: 'center',
  },
  mascotSubtitle: {
    textAlign: 'center',
  },
  mascotImage: {
    position: 'absolute',
    bottom: 0,
  },
  arrowButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  inputSectionDesktop: {
    // Container handles max width via ChatInputBox prop
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    // Prevents clicks from propagating to overlay
  },
});
