import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme, textStyles, fontFamilies } from '@/design-system';
import { MascotCard, MascotCardState, CreateCustomCard, CreateCustomCardState, MiniButton, MiniButtonState, BigPrimaryButton, BigPrimaryButtonState, MediumDarkButton, MediumDarkButtonState, TextButton, TextButtonState, LinkPill, LinkPillState, ColoredTab, ColoredTabState, IconButton, IconButtonState, MascotDetails, MascotDetailsVariant, SegmentedToggle, InputField, ChatInputBox, BigSecondaryButton, HomeHeader, MascotCarousel, ChatHeader } from '@/components';

// Sample mascot for component preview
const SAMPLE_MASCOT = {
  id: 'preview',
  name: 'Analyst Bear',
  subtitle: 'Great at research',
  image: require('../../assets/mascots/Bear.png'),
  grayscaleImage: require('../../assets/mascots/Bear-grayscale.png'),
};

import type { MascotCarouselMascot } from '@/components/mascot/MascotCarousel';

const SAMPLE_CAROUSEL_MASCOTS: MascotCarouselMascot[] = [
  {
    id: '1',
    name: 'Analyst Bear',
    subtitle: 'Great at research',
    image: require('../../assets/mascots/Bear.png'),
    color: 'yellow' as const,
  },
  {
    id: '2',
    name: 'Writer Fox',
    subtitle: 'Best at writing',
    image: require('../../assets/mascots/fox.png'),
    color: 'orange' as const,
  },
  {
    id: '3',
    name: 'UX Panda',
    subtitle: 'Principal UX skills',
    image: require('../../assets/mascots/panda.png'),
    color: 'green' as const,
  },
  {
    id: '4',
    name: 'Advice Zebra',
    subtitle: 'Here to support',
    image: require('../../assets/mascots/zebra.png'),
    color: 'pink' as const,
  },
  {
    id: '5',
    name: 'Teacher Owl',
    subtitle: 'Lets teach our kids',
    image: require('../../assets/mascots/owl.png'),
    color: 'purple' as const,
  },
];

const CHAT_TABS = [
  { key: 'chat', label: 'Chat' },
  { key: 'sources', label: 'Sources' },
  { key: 'skills', label: 'Skills' },
  { key: 'personality', label: 'Personality' },
];

const CARD_STATES: { state: MascotCardState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'hover', label: 'Hover' },
  { state: 'locked', label: 'Locked' },
  { state: 'locked-hover', label: 'Locked Hover' },
];

const BUTTON_STATES: { state: MiniButtonState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'hover', label: 'Hover' },
];

const BIG_BUTTON_STATES: { state: BigPrimaryButtonState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'hover', label: 'Hover' },
];

const MEDIUM_DARK_BUTTON_STATES: { state: MediumDarkButtonState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'hover', label: 'Hover' },
];

const TEXT_BUTTON_STATES: { state: TextButtonState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'hover', label: 'Hover' },
];

const LINK_PILL_STATES: { state: LinkPillState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'hover', label: 'Hover' },
];

const COLORED_TAB_STATES: { state: ColoredTabState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'active', label: 'Active' },
];

const ICON_BUTTON_STATES: { state: IconButtonState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'hover', label: 'Hover' },
  { state: 'selected', label: 'Selected' },
  { state: 'selected-hover', label: 'Selected Hover' },
];

const CREATE_CUSTOM_CARD_STATES: { state: CreateCustomCardState; label: string }[] = [
  { state: 'default', label: 'Default' },
  { state: 'hover', label: 'Hover' },
];

const MASCOT_DETAILS_VARIANTS: { variant: MascotDetailsVariant; label: string }[] = [
  { variant: 'available', label: 'Available' },
  { variant: 'locked', label: 'Locked' },
];

const SEGMENTED_OPTIONS = [
  { key: 'first', label: 'First' },
  { key: 'second', label: 'Second' },
];

const SAMPLE_MASCOT_DETAILS = {
  name: 'Analyst Bear',
  subtitle: 'Great at research',
  image: require('../../assets/mascots/Bear.png'),
  personality: ['Funny', 'Organized', 'Helpful'],
  models: ['Gpt 4.o', 'Gemini Pro'],
  skills: [
    { id: '1', label: 'Stock analysis' },
    { id: '2', label: 'Competitive analysis' },
    { id: '3', label: 'Market analysis' },
  ],
};

export default function ComponentsScreen() {
  const { colors } = useTheme();
  const [chatInput, setChatInput] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false);
  const [chatLLM, setChatLLM] = useState<'auto' | 'openai' | 'gemini' | 'perplexity'>('auto');
  const [carouselIndex, setCarouselIndex] = useState(2);
  const [activeChatTab, setActiveChatTab] = useState('chat');
  const [isChatLiked, setIsChatLiked] = useState(false);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.content}
    >
      <Text
        style={[
          styles.pageTitle,
          {
            fontFamily: fontFamilies.figtree.semiBold,
            color: colors.text,
          },
        ]}
      >
        Components
      </Text>
      <Text
        style={[
          styles.pageSubtitle,
          {
            fontFamily: fontFamilies.figtree.regular,
            color: colors.textMuted,
          },
        ]}
      >
        Global component library
      </Text>

      {/* Home Header Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Home Header</Text>
        <HomeHeader
          userName="Julian"
          questionPrompt="What should we analyze?"
          skills={SAMPLE_MASCOT_DETAILS.skills}
          onSkillPress={() => { }}
          skillsLoading={false}
          isDesktop={false}
        />
      </View>

      {/* Mascot Carousel Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mascot Carousel</Text>
        <MascotCarousel
          mascots={SAMPLE_CAROUSEL_MASCOTS}
          selectedIndex={carouselIndex}
          onMascotPress={(_, index) => setCarouselIndex(index)}
          onPrev={() =>
            setCarouselIndex((prev) => (prev > 0 ? prev - 1 : SAMPLE_CAROUSEL_MASCOTS.length - 1))
          }
          onNext={() =>
            setCarouselIndex((prev) => (prev < SAMPLE_CAROUSEL_MASCOTS.length - 1 ? prev + 1 : 0))
          }
          isDesktop={false}
        />
      </View>

      {/* Chat Header Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chat Header</Text>
        <ChatHeader
          mascotName="Analyst Bear"
          mascotSubtitle="Great at research"
          mascotImage={require('../../assets/mascots/Bear.png')}
          isLiked={isChatLiked}
          likeCount={12}
          onBack={() => { }}
          onToggleLike={() => setIsChatLiked((prev) => !prev)}
          tabs={CHAT_TABS}
          activeTab={activeChatTab}
          onTabChange={setActiveChatTab}
          isToggling={false}
          insets={{ top: 0 }}
        />
      </View>

      {/* MascotCard Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          MascotCard
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Card component for displaying mascots. Supports default, hover, and locked states.
        </Text>

        <View style={styles.statesGrid}>
          {CARD_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <MascotCard
                id={SAMPLE_MASCOT.id}
                name={SAMPLE_MASCOT.name}
                subtitle={SAMPLE_MASCOT.subtitle}
                imageSource={SAMPLE_MASCOT.image}
                grayscaleImageSource={
                  (state === 'locked' || state === 'locked-hover')
                    ? SAMPLE_MASCOT.grayscaleImage
                    : undefined
                }
                isLocked={state === 'locked' || state === 'locked-hover'}
                forceState={state}
                onPress={() => console.log(`${label} card pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* CreateCustomCard Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          CreateCustomCard
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Empty card with dashed border for creating custom mascots. Shows primary color on hover.
        </Text>

        <View style={styles.statesGrid}>
          {CREATE_CUSTOM_CARD_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <CreateCustomCard
                forceState={state}
                onPress={() => console.log(`${label} create custom pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* MiniButton Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          MiniButton
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Compact button for CTAs like unlock/purchase. Uses skeuomorphic styling.
        </Text>

        <View style={styles.statesGrid}>
          {BUTTON_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <MiniButton
                label="Unlock for 99ct"
                forceState={state}
                onPress={() => console.log(`${label} button pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* BigPrimaryButton Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          BigPrimaryButton
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Large primary button for main CTAs like subscription. Uses skeuomorphic styling.
        </Text>

        <View style={styles.statesGrid}>
          {BIG_BUTTON_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <BigPrimaryButton
                label="Subscribe to Prompt Squad pro to unlock all for 4,99€"
                forceState={state}
                onPress={() => console.log(`${label} big button pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* MediumDarkButton Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          MediumDarkButton
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Medium dark button for secondary CTAs. Uses dark skeuomorphic styling.
        </Text>

        <View style={styles.statesGrid}>
          {MEDIUM_DARK_BUTTON_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <MediumDarkButton
                label="Start chatting"
                forceState={state}
                onPress={() => console.log(`${label} medium dark button pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* TextButton Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          TextButton
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Text-only button for secondary actions. Shows subtle background on hover.
        </Text>

        <View style={styles.statesGrid}>
          {TEXT_BUTTON_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <TextButton
                label="Show all"
                forceState={state}
                onPress={() => console.log(`${label} text button pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* LinkPill Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          LinkPill
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Tag/chip component for filters or categories. Shows icon when selected.
        </Text>

        <View style={styles.statesGrid}>
          {LINK_PILL_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <LinkPill
                label="Funny"
                forceState={state}
                onPress={() => console.log(`${label} link pill pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* ColoredTab Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          ColoredTab
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Tab button for navigation. Active state has colored background.
        </Text>

        <View style={styles.statesGrid}>
          {COLORED_TAB_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <ColoredTab
                label="Funny"
                forceState={state}
                onPress={() => console.log(`${label} colored tab pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* SegmentedToggle Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          SegmentedToggle
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Segmented control for switching between two or more options.
        </Text>
        <View style={styles.statesGrid}>
          <View style={[styles.stateItem, { width: 320 }]}>
            <Text
              style={[
                styles.stateLabel,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.textMuted,
                },
              ]}
            >
              Default
            </Text>
            <SegmentedToggle
              options={SEGMENTED_OPTIONS}
              selectedKey="first"
              onChange={() => { }}
            />
          </View>
        </View>
      </View>

      {/* InputField Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          InputField
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Labeled input with outline and shadow.
        </Text>
        <View style={styles.statesGrid}>
          <View style={[styles.stateItem, { width: 320 }]}>
            <Text
              style={[
                styles.stateLabel,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.textMuted,
                },
              ]}
            >
              Default
            </Text>
            <InputField
              label="Email"
              placeholder="Enter your email"
              value=""
              onChangeText={() => { }}
            />
          </View>
        </View>
      </View>

      {/* ChatInputBox Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          ChatInputBox
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Full-featured chat input with LLM picker, web search, deep thinking, and voice input.
          Uses shadow lg, 24px border radius, 24px padding, and mascot-colored send button.
        </Text>
        <View style={styles.statesGrid}>
          <View style={[styles.stateItem, { width: 480, alignItems: 'stretch' }]}>
            <Text
              style={[
                styles.stateLabel,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.textMuted,
                },
              ]}
            >
              Default (all features)
            </Text>
            <ChatInputBox
              value={chatInput}
              onChangeText={setChatInput}
              onSend={() => console.log('Send:', chatInput)}
              placeholder="Write a message"
              mascotColor="#EDB440"
              showLLMPicker={true}
              chatLLM={chatLLM}
              onLLMChange={setChatLLM}
              webSearchEnabled={webSearchEnabled}
              onWebSearchToggle={() => setWebSearchEnabled(!webSearchEnabled)}
              deepThinkingEnabled={deepThinkingEnabled}
              onDeepThinkingToggle={() => setDeepThinkingEnabled(!deepThinkingEnabled)}
              onVoicePress={() => console.log('Voice input pressed')}
              isPro={true} // Enabled for demo
              maxWidth={480}
            />
          </View>
        </View>
      </View>

      {/* BigSecondaryButton Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          BigSecondaryButton
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Large secondary button with outline style. Same rounding as primary, shadow xs, turns light gray on hover.
        </Text>
        <View style={styles.statesGrid}>
          <View style={styles.stateItem}>
            <Text
              style={[
                styles.stateLabel,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.textMuted,
                },
              ]}
            >
              Default
            </Text>
            <BigSecondaryButton
              label="Sign in with Google"
              onPress={() => console.log('Secondary button pressed')}
            />
          </View>
          <View style={styles.stateItem}>
            <Text
              style={[
                styles.stateLabel,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.textMuted,
                },
              ]}
            >
              Hover
            </Text>
            <BigSecondaryButton
              label="Sign in with Google"
              forceState="hover"
              onPress={() => console.log('Secondary button hover pressed')}
            />
          </View>
        </View>
      </View>

      {/* IconButton Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          IconButton
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Icon button with circular background on hover. Can be in selected state.
        </Text>

        <View style={styles.statesGrid}>
          {ICON_BUTTON_STATES.map(({ state, label }) => (
            <View key={state} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <IconButton
                iconName="close"
                forceState={state}
                onPress={() => console.log(`${label} icon button pressed`)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* MascotDetails Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: colors.text,
            },
          ]}
        >
          MascotDetails
        </Text>
        <Text
          style={[
            styles.sectionDescription,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          Detailed popup view for mascots. Shows personality, models, skills and CTA.
        </Text>

        <View style={styles.statesGrid}>
          {MASCOT_DETAILS_VARIANTS.map(({ variant, label }) => (
            <View key={variant} style={styles.stateItem}>
              <Text
                style={[
                  styles.stateLabel,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              <MascotDetails
                name={SAMPLE_MASCOT_DETAILS.name}
                subtitle={SAMPLE_MASCOT_DETAILS.subtitle}
                imageSource={SAMPLE_MASCOT_DETAILS.image}
                personality={SAMPLE_MASCOT_DETAILS.personality}
                models={SAMPLE_MASCOT_DETAILS.models}
                skills={SAMPLE_MASCOT_DETAILS.skills}
                variant={variant}
                onClose={() => console.log(`${label} close pressed`)}
                onStartChat={() => console.log(`${label} start chat pressed`)}
                onTryOut={() => console.log(`${label} try out pressed`)}
                onUnlock={() => console.log(`${label} unlock pressed`)}
                onSkillPress={(skill) => console.log(`${label} skill pressed:`, skill.label)}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Add more component sections here as we build them */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  pageTitle: {
    fontSize: 28,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    marginBottom: 32,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  statesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  stateItem: {
    alignItems: 'center',
  },
  stateLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
});

