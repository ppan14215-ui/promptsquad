import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, fontFamilies, textStyles } from '@/design-system';
import { useI18n, LANGUAGES, Language } from '@/i18n';
import { usePreferences, LLM_OPTIONS, LLMPreference } from '@/services/preferences';
import { useAuth } from '@/services/auth';
import { useIsAdmin } from '@/services/admin';
import { useSubscription } from '@/services/subscription';
import { Icon } from '@/components';
import { ChangelogModal } from '@/components/ui/ChangelogModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

type SettingRowProps = {
  label: string;
  value?: string;
  isSelected?: boolean;
  onPress?: () => void;
  showCheckmark?: boolean;
};

function SettingRow({ label, value, isSelected, onPress, showCheckmark }: SettingRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.settingRow,
        {
          backgroundColor: isSelected ? colors.primaryBg : colors.background,
          borderColor: colors.outline,
        },
      ]}
    >
      <Text
        style={[
          styles.settingLabel,
          {
            fontFamily: fontFamilies.figtree.regular,
            color: isSelected ? colors.primary : colors.text,
          },
        ]}
      >
        {label}
      </Text>
      {value && (
        <Text
          style={[
            styles.settingValue,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          {value}
        </Text>
      )}
      {showCheckmark && isSelected && (
        <View style={styles.checkmark}>
          <Icon name="arrow-up-right" size={16} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

type ToggleButtonProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function ToggleButton({ label, isActive, onPress }: ToggleButtonProps) {
  const { colors } = useTheme();

  // Web-specific transition style
  const webTransitionStyle = Platform.select({
    web: {
      transition: 'all 200ms ease-out',
    } as unknown as object,
    default: {},
  });

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleButton,
        webTransitionStyle,
        {
          backgroundColor: isActive ? colors.primary : colors.surface,
          borderColor: isActive ? colors.primary : colors.outline,
        },
      ]}
    >
      <Text
        style={[
          styles.toggleLabel,
          {
            fontFamily: fontFamilies.figtree.semiBold,
            color: isActive ? colors.buttonText : colors.textMuted,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type LanguageOptionProps = {
  code: Language;
  name: string;
  nativeName: string;
  isSelected: boolean;
  onPress: () => void;
};

function LanguageOption({ code, name, nativeName, isSelected, onPress }: LanguageOptionProps) {
  const { colors, mode } = useTheme();

  // Web-specific transition style
  const webTransitionStyle = Platform.select({
    web: {
      transition: 'all 200ms ease-out',
    } as unknown as object,
    default: {},
  });

  // In dark mode with selected state, use white text since primaryBg is dark
  const selectedTextColor = mode === 'dark' ? colors.buttonText : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.languageOption,
        webTransitionStyle,
        {
          backgroundColor: isSelected ? colors.primaryBg : colors.background,
          borderColor: isSelected ? colors.primary : colors.outline,
        },
      ]}
    >
      <View style={styles.languageTextContainer}>
        <Text
          style={[
            styles.languageName,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: isSelected ? selectedTextColor : colors.text,
            },
          ]}
        >
          {nativeName}
        </Text>
        <Text
          style={[
            styles.languageNative,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: isSelected && mode === 'dark' ? 'rgba(255,255,255,0.7)' : colors.text,
            },
          ]}
        >
          {name}
        </Text>
      </View>
      {isSelected && (
        <View style={[styles.checkIcon, { backgroundColor: mode === 'dark' ? colors.buttonText : colors.primary }]}>
          <Text style={[styles.checkText, { color: mode === 'dark' ? colors.primary : '#FFFFFF' }]}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

type LLMOptionProps = {
  code: LLMPreference;
  name: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
};

function LLMOption({ code, name, description, isSelected, onPress }: LLMOptionProps) {
  const { colors, mode } = useTheme();

  // Web-specific transition style
  const webTransitionStyle = Platform.select({
    web: {
      transition: 'all 200ms ease-out',
    } as unknown as object,
    default: {},
  });

  // In dark mode with selected state, use white text since primaryBg is dark
  const selectedTextColor = mode === 'dark' ? colors.buttonText : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.languageOption,
        webTransitionStyle,
        {
          backgroundColor: isSelected ? colors.primaryBg : colors.background,
          borderColor: isSelected ? colors.primary : colors.outline,
        },
      ]}
    >
      <View style={styles.languageTextContainer}>
        <Text
          style={[
            styles.languageName,
            {
              fontFamily: fontFamilies.figtree.semiBold,
              color: isSelected ? selectedTextColor : colors.text,
            },
          ]}
        >
          {name}
        </Text>
        <Text
          style={[
            styles.languageNative,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: isSelected && mode === 'dark' ? 'rgba(255,255,255,0.7)' : colors.text,
            },
          ]}
        >
          {description}
        </Text>
      </View>
      {isSelected && (
        <View style={[styles.checkIcon, { backgroundColor: mode === 'dark' ? colors.buttonText : colors.primary }]}>
          <Text style={[styles.checkText, { color: mode === 'dark' ? colors.primary : '#FFFFFF' }]}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const { language, setLanguage, t } = useI18n();
  const { preferredLLM, setPreferredLLM } = usePreferences();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isSubscribed } = useSubscription();
  const [showChangelog, setShowChangelog] = React.useState(false);

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
      >
        {/* Header - Moved to top */}
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
            {t.profile.title}
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
            {t.profile.subtitle}
          </Text>
        </View>

        {/* User Info Section */}
        {user && (
          <View style={[styles.userInfoSection, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.userAvatarText, { color: colors.buttonText }]}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfoText}>
              <Text
                style={[
                  styles.userName,
                  {
                    fontFamily: fontFamilies.figtree.semiBold,
                    color: colors.text,
                  },
                ]}
              >
                {userName}
              </Text>
              <Text
                style={[
                  styles.userEmail,
                  {
                    fontFamily: fontFamilies.figtree.regular,
                    color: colors.textMuted,
                  },
                ]}
              >
                {userEmail}
              </Text>
            </View>
          </View>
        )}

        {/* Appearance Section */}
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
            {t.profile.appearance}
          </Text>
          <View style={styles.toggleContainer}>
            <ToggleButton
              label={t.profile.lightMode}
              isActive={mode === 'light'}
              onPress={() => setMode('light')}
            />
            <ToggleButton
              label={t.profile.darkMode}
              isActive={mode === 'dark'}
              onPress={() => setMode('dark')}
            />
          </View>
        </View>

        {/* Language Section */}
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
            {t.profile.language}
          </Text>
          <View style={styles.languageContainer}>
            {LANGUAGES.map((lang) => (
              <LanguageOption
                key={lang.code}
                code={lang.code}
                name={lang.name}
                nativeName={lang.nativeName}
                isSelected={language === lang.code}
                onPress={() => setLanguage(lang.code)}
              />
            ))}
          </View>
        </View>

        {/* AI Provider Section */}
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
            {t.profile.aiProvider}
          </Text>
          <View style={styles.languageContainer}>
            {LLM_OPTIONS.map((option) => {
              const getName = () => {
                switch (option.code) {
                  case 'auto': return t.profile.auto;
                  case 'gemini': return t.profile.gemini;
                  case 'openai': return t.profile.openai;
                  case 'perplexity': return t.profile.perplexity || option.name;
                  case 'grok': return t.profile.grok || option.name;
                  default: return option.name;
                }
              };
              const getDesc = () => {
                switch (option.code) {
                  case 'auto': return t.profile.autoDesc;
                  case 'gemini': return t.profile.geminiDesc;
                  case 'openai': return t.profile.openaiDesc;
                  case 'perplexity': return t.profile.perplexityDesc || option.description;
                  case 'grok': return t.profile.grokDesc || option.description;
                  default: return option.description;
                }
              };
              return (
                <LLMOption
                  key={option.code}
                  code={option.code}
                  name={getName()}
                  description={getDesc()}
                  isSelected={preferredLLM === option.code}
                  onPress={() => setPreferredLLM(option.code)}
                />
              );
            })}
          </View>
        </View>

        {/* Account Section */}
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
            {t.profile.account}
          </Text>

          {/* Only show mascot chooser for Pro users or Admin */}
          {(isSubscribed || isAdmin) && (
            <SettingRow
              label="Choose Mascots"
              onPress={() => router.push('/(onboarding)/select-mascots')}
              showCheckmark={false}
            />
          )}
          <Pressable
            style={[
              styles.signOutButton,
              {
                borderColor: colors.outline,
                marginTop: 8,
              },
            ]}
            onPress={signOut}
          >
            <Text
              style={[
                styles.signOutText,
                {
                  fontFamily: fontFamilies.figtree.semiBold,
                  color: colors.red,
                },
              ]}
            >
              {t.profile.signOut}
            </Text>
          </Pressable>
        </View>

        {/* About Section */}
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
            About
          </Text>
          <SettingRow
            label="What's New"
            value={`v${Constants.expoConfig?.version || '1.0.0'}`}
            onPress={() => setShowChangelog(true)}
            showCheckmark={true}
          />
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text
            style={[
              styles.versionText,
              {
                fontFamily: fontFamilies.figtree.regular,
                color: colors.textMuted,
              },
            ]}
          >
            {t.profile.version} {Constants.expoConfig?.version || '1.1.2'}
          </Text>
        </View>
      </ScrollView>

      <ChangelogModal
        visible={showChangelog}
        onDismiss={() => setShowChangelog(false)}
        version={Constants.expoConfig?.version || '1.1.2'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'web' ? 64 : 16, // Less top padding on mobile
    paddingBottom: Platform.OS === 'web' ? 40 : 100, // More bottom padding on mobile for nav bar
  },
  userInfoSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
  },
  userInfoText: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
  },
  userEmail: {
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
    paddingTop: Platform.OS === 'web' ? 0 : 8, // Small top padding on mobile
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
  },
  languageContainer: {
    gap: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  languageTextContainer: {
    gap: 2,
  },
  languageName: {
    fontSize: 16,
  },
  languageNative: {
    fontSize: 12,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 14,
  },
  checkmark: {
    marginLeft: 8,
  },
  signOutButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 14,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  versionText: {
    fontSize: 12,
  },
});
