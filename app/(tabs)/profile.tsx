import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useTheme, fontFamilies, textStyles } from '@/design-system';
import { useI18n, LANGUAGES, Language } from '@/i18n';
import { Icon } from '@/components';

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
              color: isSelected && mode === 'dark' ? 'rgba(255,255,255,0.7)' : colors.textMuted,
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

export default function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const { language, setLanguage, t } = useI18n();

  return (
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
        <Pressable
          style={[
            styles.signOutButton,
            {
              borderColor: colors.outline,
            },
          ]}
          onPress={() => console.log('Sign out pressed')}
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
          {t.profile.version} 1.0.0
        </Text>
      </View>
    </ScrollView>
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
    marginBottom: 32,
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
