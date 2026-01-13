import { View, StyleSheet, ScrollView, Text, Modal, Pressable, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { MascotCard, TextButton, BigPrimaryButton, CreateCustomCard, MascotDetails, Skill } from '@/components';
import { useTheme, textStyles, fontFamilies } from '@/design-system';
import { useI18n } from '@/i18n';

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
};

// Mascot type with all details
type Mascot = {
  id: string;
  name: string;
  subtitle: string;
  image: any;
  color: 'yellow' | 'red' | 'green' | 'pink';
  isLocked?: boolean;
  personality: string[];
  models: string[];
  skills: Skill[];
};

// 20 mascots: 4 free + 16 locked (some duplicates as placeholders)
const SAMPLE_MASCOTS: Mascot[] = [
  // Free tier (4 mascots)
  { 
    id: '1', 
    name: 'Analyst Bear', 
    subtitle: 'Great at research', 
    image: mascotImages.bear, 
    color: 'yellow',
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
    color: 'red',
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
    personality: ['Supportive', 'Wise', 'Balanced'],
    models: ['Claude 3', 'Gemini Pro'],
    skills: [
      { id: '4-1', label: 'Life coaching' },
      { id: '4-2', label: 'Decision making' },
      { id: '4-3', label: 'Problem solving' },
    ],
  },
  
  // Locked tier (16 mascots)
  { 
    id: '5', 
    name: 'Teacher Owl', 
    subtitle: 'Lets teach our kids', 
    image: mascotImages.owl, 
    color: 'yellow', 
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
    color: 'green', 
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
    color: 'red', 
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
    color: 'pink', 
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
    color: 'yellow', 
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
    color: 'green', 
    isLocked: true,
    personality: ['Logical', 'Precise', 'Patient'],
    models: ['GPT-4o', 'Claude 3'],
    skills: [
      { id: '10-1', label: 'Code review' },
      { id: '10-2', label: 'Debugging' },
      { id: '10-3', label: 'Architecture' },
    ],
  },
  
  // Placeholders (duplicates until you add more assets)
  { 
    id: '11', 
    name: 'Strategy Bear', 
    subtitle: 'Planning expert', 
    image: mascotImages.bear, 
    color: 'red', 
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
    name: 'Marketing Fox', 
    subtitle: 'Growth hacker', 
    image: mascotImages.fox, 
    color: 'pink', 
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
    name: 'Product Panda', 
    subtitle: 'Product management', 
    image: mascotImages.panda, 
    color: 'yellow', 
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
    name: 'Support Zebra', 
    subtitle: 'Customer success', 
    image: mascotImages.zebra, 
    color: 'green', 
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
    name: 'Mentor Owl', 
    subtitle: 'Career guidance', 
    image: mascotImages.owl, 
    color: 'red', 
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
    name: 'Project Turtle', 
    subtitle: 'Project management', 
    image: mascotImages.turtle, 
    color: 'pink', 
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
    name: 'Research Badger', 
    subtitle: 'Market research', 
    image: mascotImages.badger, 
    color: 'yellow', 
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
    name: 'Agile Mouse', 
    subtitle: 'Scrum master', 
    image: mascotImages.mouse, 
    color: 'green', 
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
    name: 'Brand Pig', 
    subtitle: 'Brand strategy', 
    image: mascotImages.pig, 
    color: 'red', 
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
    name: 'Dev Cat', 
    subtitle: 'Full-stack developer', 
    image: mascotImages.cat, 
    color: 'pink', 
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

export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [selectedMascot, setSelectedMascot] = useState<Mascot | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Show only first 6 mascots by default, all 20 when expanded
  const displayedMascots = showAll ? SAMPLE_MASCOTS : SAMPLE_MASCOTS.slice(0, 6);

  const handleMascotPress = (mascot: Mascot) => {
    setSelectedMascot(mascot);
  };

  const handleCloseModal = () => {
    setSelectedMascot(null);
  };

  const handleToggleFavorite = () => {
    if (!selectedMascot) return;
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(selectedMascot.id)) {
        newFavorites.delete(selectedMascot.id);
      } else {
        newFavorites.add(selectedMascot.id);
      }
      return newFavorites;
    });
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
    console.log(`Unlock ${selectedMascot?.name} for 99ct`);
    // TODO: Trigger in-app purchase
  };

  const handleSkillPress = (skill: Skill) => {
    console.log(`Skill pressed: ${skill.label}`);
    // TODO: Navigate to chat with skill pre-selected
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: colors.text,
              },
            ]}
          >
            {t.home.title}
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
            {t.home.subtitle}
          </Text>
        </View>

        {/* Mascot Grid */}
        <View style={styles.grid}>
          {displayedMascots.slice(0, 5).map((mascot) => (
            <MascotCard
              key={mascot.id}
              id={mascot.id}
              name={mascot.name}
              subtitle={mascot.subtitle}
              imageSource={mascot.image}
              colorVariant={mascot.color}
              isLocked={mascot.isLocked}
              onPress={() => handleMascotPress(mascot)}
            />
          ))}
          {/* Replace 6th mascot with CreateCustomCard when showing first 6 */}
          {!showAll && (
            <CreateCustomCard
              onPress={() => console.log('Create custom pressed')}
            />
          )}
          {/* Show remaining mascots when expanded */}
          {showAll && displayedMascots.slice(5).map((mascot) => (
            <MascotCard
              key={mascot.id}
              id={mascot.id}
              name={mascot.name}
              subtitle={mascot.subtitle}
              imageSource={mascot.image}
              colorVariant={mascot.color}
              isLocked={mascot.isLocked}
              onPress={() => handleMascotPress(mascot)}
            />
          ))}
        </View>

        {/* Show all button - only show when not all mascots are displayed */}
        {!showAll && (
          <View style={styles.showAllContainer}>
            <TextButton 
              label={t.home.showAll} 
              onPress={() => setShowAll(true)}
            />
          </View>
        )}

        {/* Subscribe CTA */}
        <View style={styles.ctaContainer}>
          <BigPrimaryButton
            label={t.home.subscribeCta}
            onPress={() => console.log('Subscribe pressed')}
          />
        </View>
      </ScrollView>

      {/* Mascot Details Modal */}
      <Modal
        visible={selectedMascot !== null}
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
              <MascotDetails
                name={selectedMascot.name}
                subtitle={selectedMascot.subtitle}
                imageSource={selectedMascot.image}
                personality={selectedMascot.personality}
                models={selectedMascot.models}
                skills={selectedMascot.skills}
                variant={selectedMascot.isLocked ? 'locked' : 'available'}
                isFavorite={favorites.has(selectedMascot.id)}
                onClose={handleCloseModal}
                onFavorite={handleToggleFavorite}
                onStartChat={handleStartChat}
                onTryOut={handleTryOut}
                onUnlock={handleUnlock}
                onSkillPress={handleSkillPress}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 64,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
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
  },
  showAllContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ctaContainer: {
    paddingHorizontal: 16,
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

