import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme, textStyles, fontFamilies } from '@/design-system';
import { MascotCard, MascotCardState, CreateCustomCard, CreateCustomCardState, MiniButton, MiniButtonState, BigPrimaryButton, BigPrimaryButtonState, MediumDarkButton, MediumDarkButtonState, TextButton, TextButtonState, LinkPill, LinkPillState, ColoredTab, ColoredTabState, IconButton, IconButtonState, MascotDetails, MascotDetailsVariant } from '@/components';

// Sample mascot for component preview
const SAMPLE_MASCOT = {
  id: 'preview',
  name: 'Analyst Bear',
  subtitle: 'Great at research',
  image: require('../../assets/mascots/Bear.png'),
};

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
                onFavorite={() => console.log(`${label} favorite pressed`)}
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

