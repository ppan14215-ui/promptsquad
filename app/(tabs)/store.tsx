import { View, StyleSheet, ScrollView, Text, Modal, Pressable, Platform, useWindowDimensions, TouchableWithoutFeedback } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MascotCard, TextButton, BigPrimaryButton, CreateCustomCard, MascotDetails, Skill } from '@/components';
import { useTheme, textStyles, fontFamilies } from '@/design-system';
import { useI18n } from '@/i18n';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsAdmin, useMascots, MascotBasic, useMascotSkills, MascotSkill } from '@/services/admin';
import { getMascotImageSource, getMascotGrayscaleImageSource } from '@/services/admin/mascot-images';
import { useSubscription } from '@/services/subscription';
import { useMascotLikeCounts } from '@/services/mascot-likes';
import { useUnlockedMascots } from '@/services/mascot-access';
import React from 'react';

const DESKTOP_BREAKPOINT = 768;
const CONTENT_MAX_WIDTH = 720;

// Local mascot images
const mascotImages = {
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

// Grayscale versions - add as you create them
const grayscaleImages: Partial<Record<keyof typeof mascotImages, any>> = {
  bear: require('../../assets/mascots/Bear-grayscale.png'),
  badger: require('../../assets/mascots/badger-grayscale.png'),
  camel: require('../../assets/mascots/camel-grayscale.png'),
  fox: require('../../assets/mascots/fox-grayscale.png'),
  frog: require('../../assets/mascots/frog-grayscale.png'),
  giraffe: require('../../assets/mascots/giraffe-grayscale.png'),
  lion: require('../../assets/mascots/lion-grayscale.png'),
  mouse: require('../../assets/mascots/mouse-grayscale.png'),
  owl: require('../../assets/mascots/owl-grayscale.png'),
  panda: require('../../assets/mascots/panda-grayscale.png'),
  pig: require('../../assets/mascots/pig-grayscale.png'),
  seahorse: require('../../assets/mascots/searhorse-grayscale.png'), // Note: filename is searhorse but key is seahorse
  turtle: require('../../assets/mascots/turtle-grayscale.png'),
  zebra: require('../../assets/mascots/zebra-grayscale.png'),
};

// Helper to get grayscale image if available
const getGrayscaleImage = (imageKey: keyof typeof mascotImages) => {
  return grayscaleImages[imageKey] || null;
};

// Color type for all available mascot colors
type MascotColor = 'yellow' | 'red' | 'green' | 'pink' | 'purple' | 'darkPurple' | 'brown' | 'teal' | 'orange' | 'blue';

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

// Mascot type with all details
type Mascot = {
  id: string;
  name: string;
  subtitle: string;
  image: any;
  grayscaleImage?: any; // Optional grayscale version
  color: MascotColor;
  isLocked?: boolean;
  isPro?: boolean; // True if mascot is exclusively for pro subscription
  isUnlocked?: boolean; // True if mascot is unlocked for the user
  isComingSoon?: boolean; // True if mascot is coming soon
  personality: string[];
  models: string[];
  skills: Skill[];
};

// 20 mascots: 4 free + 16 locked - distributed across all 10 colors
const SAMPLE_MASCOTS: Mascot[] = [
  // Free tier (4 mascots)
  {
    id: '1',
    name: 'Analyst Bear',
    subtitle: 'Great at research',
    image: mascotImages.bear,
    grayscaleImage: getGrayscaleImage('bear'), // Use grayscale version if available
    color: 'yellow',  // Keep original
    personality: ['Analytical', 'Thorough', 'Patient'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '1-1', label: 'Stock analysis' },
      { id: '1-2', label: 'Competitive analysis' },
      { id: '1-3', label: 'Market research' },
    ],
  },
  {
    id: '2',
    name: 'Writer Fox',
    subtitle: 'Best at writing',
    image: mascotImages.fox,
    color: 'orange',  // Changed: fox suits orange
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
    color: 'green',  // Keep original
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
    color: 'pink',  // Keep original
    personality: ['Supportive', 'Wise', 'Balanced'],
    models: ['Claude 3', 'Gemini Pro'],
    skills: [
      { id: '4-1', label: 'Life coaching' },
      { id: '4-2', label: 'Decision making' },
      { id: '4-3', label: 'Problem solving' },
    ],
  },

  // Locked tier (16 mascots) - using all 10 colors
  {
    id: '5',
    name: 'Teacher Owl',
    subtitle: 'Lets teach our kids',
    image: mascotImages.owl,
    grayscaleImage: getGrayscaleImage('owl'),
    color: 'purple',  // Changed: wise owl suits purple
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('turtle'),
    color: 'teal',  // Changed: turtle suits teal
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('badger'),
    color: 'brown',  // Changed: badger suits brown
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('mouse'),
    color: 'blue',  // Changed: quick mouse suits blue
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('pig'),
    color: 'pink',  // Changed: playful pig suits pink
    isLocked: true,
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
    color: 'darkPurple',  // Changed: code cat suits dark purple
    isLocked: true,
    personality: ['Logical', 'Precise', 'Patient'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '10-1', label: 'Code review' },
      { id: '10-2', label: 'Debugging' },
      { id: '10-3', label: 'Architecture' },
    ],
  },

  // Additional locked mascots (using new images)
  {
    id: '11',
    name: 'Strategy Camel',
    subtitle: 'Planning expert',
    image: mascotImages.camel,
    grayscaleImage: getGrayscaleImage('camel'),
    color: 'brown',  // Changed: desert camel suits brown
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('frog'),
    color: 'teal',  // Changed: frog suits teal
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('giraffe'),
    color: 'yellow',  // Giraffe with yellow spots
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('lion'),
    color: 'orange',  // Changed: lion suits orange
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('seahorse'),
    color: 'blue',  // Changed: seahorse suits blue
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('camel'),
    color: 'orange',  // Changed: endurance/project suits orange
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('frog'),
    color: 'green',  // Changed: research frog suits green
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('giraffe'),
    color: 'purple',  // Changed: agile suits purple
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('lion'),
    color: 'red',  // Changed: bold brand lion suits red
    isLocked: true,
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
    grayscaleImage: getGrayscaleImage('seahorse'),
    color: 'darkPurple',  // Changed: dev suits dark purple
    isLocked: true,
    personality: ['Technical', 'Problem-solver', 'Curious'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '20-1', label: 'Full-stack development' },
      { id: '20-2', label: 'API design' },
      { id: '20-3', label: 'Database optimization' },
    ],
  },
];

export default function StoreScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { openMascotId } = useLocalSearchParams<{ openMascotId?: string }>();
  const { isAdmin } = useIsAdmin();
  const { isSubscribed } = useSubscription();
  const { unlockedMascotIds } = useUnlockedMascots();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedMascotId, setSelectedMascotId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'most-liked'>('default');

  // Fetch mascots from database with fallback to hardcoded
  const { mascots: dbMascots, isLoading: isLoadingMascots, error: mascotsError } = useMascots();

  // Convert database mascots to Mascot type with fallback to hardcoded
  const allMascots: Mascot[] = useMemo(() => {
    if (dbMascots.length > 0) {
      // Convert database mascots to Mascot type
      return dbMascots.map((m: MascotBasic) => {
        const imageSource = getMascotImageSource(m.image_url || null) || mascotImages.bear;
        const grayscaleSource = getMascotGrayscaleImageSource(m.image_url || null);
        // Find matching hardcoded mascot for fallback data
        const hardcodedMascot = SAMPLE_MASCOTS.find((hm) => hm.id === m.id);
        const mascotId = parseInt(m.id);
        // Use DB flags if available, fallback to ID logic, handle nulls
        const isFree = (m.is_free != null) ? m.is_free : (mascotId >= 1 && mascotId <= 10);
        const isPro = (m.is_pro != null) ? m.is_pro : (mascotId >= 11 && mascotId <= 20);
        const isComingSoon = m.is_active === false;

        // Determine unlock status:
        // - For free mascots: unlocked only if in unlockedMascotIds
        // - For pro mascots: unlocked if subscribed or admin
        const isUnlocked = isFree
          ? unlockedMascotIds.includes(m.id)
          : (isSubscribed || isAdmin);

        return {
          id: m.id,
          name: m.name,
          subtitle: m.subtitle || '',
          image: imageSource,
          grayscaleImage: grayscaleSource || undefined,
          color: (m.color || 'yellow') as MascotColor,
          personality: hardcodedMascot?.personality || [],
          models: hardcodedMascot?.models || [],
          skills: hardcodedMascot?.skills || [],
          isLocked: !isUnlocked, // Locked if not unlocked
          isPro: isPro,
          isUnlocked: isUnlocked,
          isComingSoon: isComingSoon,
        };
      });
    }
    // Fallback to hardcoded data
    return SAMPLE_MASCOTS.map((m) => {
      const mascotId = parseInt(m.id);
      const isPro = mascotId >= 11 && mascotId <= 20;
      const isFree = mascotId >= 1 && mascotId <= 10;

      // Determine unlock status:
      // - For free mascots (1-10): unlocked only if in unlockedMascotIds
      // - For pro mascots (11-20): unlocked if subscribed or admin
      const isUnlocked = isFree
        ? unlockedMascotIds.includes(m.id)
        : (isSubscribed || isAdmin);

      return {
        ...m,
        isLocked: !isUnlocked,
        isPro: isPro,
        isUnlocked: isUnlocked,
      };
    });
  }, [dbMascots, isAdmin, isSubscribed, unlockedMascotIds]);

  // Fetch like counts for all mascots using their IDs
  const mascotIds = allMascots.map(m => m.id);
  const { likeCounts } = useMascotLikeCounts(mascotIds);

  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // Get selected mascot from list
  const selectedMascot = selectedMascotId ? allMascots.find(m => m.id === selectedMascotId) : null;

  // For admin, all mascots are unlocked (purchased state)
  // For regular users, check isLocked property (already set in allMascots)
  const getMascotLockStatus = (mascot: Mascot | MascotBasic) => {
    if (isAdmin) return false; // Never locked for admin
    if (isSubscribed) return false; // Never locked for subscribers
    if ('isLocked' in mascot) {
      return mascot.isLocked || false;
    }
    // For MascotBasic, check if it's free
    return !('is_free' in mascot && mascot.is_free);
  };

  // Open mascot details if navigated from home with openMascotId
  useEffect(() => {
    if (openMascotId && allMascots.length > 0) {
      // Try to find by UUID first (database), then by simple ID (fallback)
      const mascot = allMascots.find(m => m.id === openMascotId);
      if (mascot) {
        setSelectedMascotId(mascot.id);
      }
    }
  }, [openMascotId, allMascots]);

  // Sort mascots based on selected sort option
  const displayedMascots = [...allMascots].sort((a, b) => {
    if (sortBy === 'most-liked') {
      const likesA = likeCounts[a.id] || 0;
      const likesB = likeCounts[b.id] || 0;
      return likesB - likesA; // Descending order (most liked first)
    }
    // Default: maintain sort_order from database if available
    if (dbMascots.length > 0) {
      const aDb = dbMascots.find(m => m.id === a.id);
      const bDb = dbMascots.find(m => m.id === b.id);
      const aOrder = (aDb as any)?.sort_order ?? 999;
      const bOrder = (bDb as any)?.sort_order ?? 999;
      return aOrder - bOrder;
    }
    // Fallback: maintain original order (by id)
    return parseInt(a.id) - parseInt(b.id);
  });

  const handleMascotPress = (mascotId: string) => {
    setSelectedMascotId(mascotId);
  };

  const handleCloseModal = () => {
    setSelectedMascotId(null);
  };


  const handleStartChat = () => {
    if (!selectedMascot) return;
    handleCloseModal();
    router.push(`/chat/${selectedMascot.id}`);
  };

  const handleTryOut = () => {
    if (!selectedMascot) return;
    handleCloseModal();
    // Navigate to trial chat (same screen, but could be limited)
    router.push(`/chat/${selectedMascot.id}`);
  };

  const handleUnlock = () => {
    console.log(`Unlock ${selectedMascot?.name} for €1.99`);
    // TODO: Trigger in-app purchase
  };

  const handleSkillPress = (skill: Skill) => {
    console.log(`Skill pressed: ${skill.label}`);
    if (!selectedMascotId) return;
    handleCloseModal();
    router.push(`/chat/${selectedMascotId}?skillId=${skill.id}`);
  };

  // Component to fetch and display mascot details with all data
  const MascotDetailsWithData = React.memo(function MascotDetailsWithData({
    mascot,
    onClose,
    onStartChat,
    onTryOut,
    onUnlock,
    onSkillPress,
    getMascotLockStatus
  }: {
    mascot: Mascot;
    onClose: () => void;
    onStartChat: () => void;
    onTryOut: () => void;
    onUnlock: () => void;
    onSkillPress: (skill: Skill) => void;
    getMascotLockStatus: (mascot: Mascot | MascotBasic) => boolean;
  }) {
    // Try to fetch from database if using database mascots
    const dbMascot = dbMascots.find(m => m.id === mascot.id);
    const { skills: dbSkills } = useMascotSkills(mascot.id);

    // Use database skills if available, otherwise use hardcoded
    const displaySkills: Skill[] = React.useMemo(() => {
      if (dbSkills && dbSkills.length > 0) {
        return dbSkills.map((skill: MascotSkill) => ({
          id: skill.id,
          label: skill.skill_label,
        }));
      }
      // Fallback to hardcoded skills
      return mascot.skills || [];
    }, [dbSkills, mascot.skills]);

    // Use database personality/models if available, otherwise use hardcoded
    const personality = mascot.personality && mascot.personality.length > 0
      ? mascot.personality
      : ['Helpful', 'Friendly', 'Knowledgeable'];
    const models = mascot.models && mascot.models.length > 0
      ? mascot.models
      : ['Gemini', 'GPT-4o'];

    return (
      <MascotDetails
        name={mascot.name}
        subtitle={mascot.subtitle}
        imageSource={mascot.image}
        personality={personality}
        models={models}
        skills={displaySkills}
        variant={getMascotLockStatus(mascot) ? 'locked' : 'available'}
        mascotId={mascot.id}
        isPro={mascot.isPro || false}
        onClose={onClose}
        onStartChat={onStartChat}
        onTryOut={onTryOut}
        onUnlock={onUnlock}
        onSkillPress={onSkillPress}
      />
    );
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.contentDesktop,
          // Add extra bottom padding for floating button on all platforms
          { paddingBottom: 100 + insets.bottom },
        ]}
      >
        {/* Content wrapper with max-width for desktop */}
        <View style={[styles.contentWrapper, isDesktop && { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
          {/* Header */}
          <View style={[styles.header, !isDesktop && styles.headerMobile]}>
            <Text
              style={[
                styles.title,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.text,
                },
              ]}
            >
              All available mascots
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  fontFamily: fontFamilies.figtree.regular,
                  color: colors.textMuted,
                },
              ]}
            >
              Unlock new skills and capabilities
            </Text>

            {/* Sort Options */}
            <View style={styles.sortContainer}>
              <Pressable
                onPress={() => setSortBy('default')}
                style={[
                  styles.sortButton,
                  sortBy === 'default' && { backgroundColor: colors.primary },
                  { borderColor: colors.outline },
                ]}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    {
                      fontFamily: fontFamilies.figtree.medium,
                      color: sortBy === 'default' ? colors.buttonText : colors.text,
                    },
                  ]}
                >
                  Default
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSortBy('most-liked')}
                style={[
                  styles.sortButton,
                  sortBy === 'most-liked' && { backgroundColor: colors.primary },
                  { borderColor: colors.outline },
                ]}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    {
                      fontFamily: fontFamilies.figtree.medium,
                      color: sortBy === 'most-liked' ? colors.buttonText : colors.text,
                    },
                  ]}
                >
                  Most Liked
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Mascot Grid - show all mascots from database or fallback */}
          {isLoadingMascots && dbMascots.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading mascots...</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {displayedMascots.map((mascot) => {
                return (
                  <MascotCard
                    key={mascot.id}
                    id={mascot.id}
                    name={mascot.name}
                    subtitle={mascot.subtitle}
                    imageSource={mascot.image}
                    grayscaleImageSource={mascot.grayscaleImage || undefined}
                    colorVariant={mascot.color}
                    isLocked={getMascotLockStatus(mascot)}
                    isPro={mascot.isPro || false}
                    isUnlocked={mascot.isUnlocked || false}
                    isComingSoon={mascot.isComingSoon}
                    onPress={() => handleMascotPress(mascot.id)}
                  />
                );
              })}
              {/* Create Custom Card at the end - only for pro users */}
              {(isSubscribed || isAdmin) && (
                <CreateCustomCard
                  onPress={() => console.log('Create custom pressed')}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating CTA - floats above content on all platforms */}
      <View style={[styles.floatingCta, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <View style={styles.floatingCtaInner}>
          <BigPrimaryButton
            label={t.home.subscribeCta}
            onPress={() => console.log('Subscribe pressed')}
          />
        </View>
      </View>

      {/* Mascot Details Modal */}
      <Modal
        visible={selectedMascotId !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCloseModal}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            {selectedMascot && (
              <MascotDetailsWithData
                mascot={selectedMascot}
                onClose={handleCloseModal}
                onStartChat={handleStartChat}
                onTryOut={handleTryOut}
                onUnlock={handleUnlock}
                onSkillPress={handleSkillPress}
                getMascotLockStatus={getMascotLockStatus}
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
  content: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  contentDesktop: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  headerMobile: {
    // Centered text on mobile
    alignItems: 'center',
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontSize: 26,
    lineHeight: 26 * 1.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 16,
  },
  grid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24,
    justifyContent: 'center',
  },
  showAllContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ctaContainer: {
    paddingHorizontal: 16,
  },
  floatingCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  floatingCtaInner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    // Prevents clicks from propagating to overlay
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
});

