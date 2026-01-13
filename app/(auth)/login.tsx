import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, fontFamilies, textStyles } from '@/design-system';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';
import { BigPrimaryButton, TextButton, ColoredTab } from '@/components';

type AuthMode = 'login' | 'signup';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === 'login';

  const validateForm = (): boolean => {
    setError(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t.auth.errors.invalidEmail);
      return false;
    }

    // Password validation
    if (password.length < 6) {
      setError(t.auth.errors.passwordTooShort);
      return false;
    }

    // Confirm password for signup
    if (!isLogin && password !== confirmPassword) {
      setError(t.auth.errors.passwordMismatch);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (authError) {
        setError(authError.message || t.auth.errors.generic);
      } else {
        // Navigation will be handled by auth state change in layout
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(t.auth.errors.generic);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) {
        setError(authError.message || t.auth.errors.generic);
      }
    } catch (e) {
      setError(t.auth.errors.generic);
    } finally {
      setIsLoading(false);
    }
  };

  // Web-specific styles
  const webInputStyle = Platform.select({
    web: { outlineStyle: 'none' } as any,
    default: {},
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={[styles.logoBox, { backgroundColor: colors.surface }]}>
          <View style={[styles.logoInner, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoEmoji}>🐻</Text>
          </View>
        </View>
      </View>

      {/* Title */}
      <Text
        style={[
          styles.title,
          {
            fontFamily: fontFamilies.figtree.semiBold,
            color: colors.text,
          },
        ]}
      >
        {isLogin ? t.auth.loginTitle : t.auth.signupTitle}
      </Text>

      {/* Subtitle */}
      <Text
        style={[
          styles.subtitle,
          {
            fontFamily: fontFamilies.figtree.regular,
            color: colors.textMuted,
          },
        ]}
      >
        {isLogin ? t.auth.loginSubtitle : t.auth.signupSubtitle}
      </Text>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { borderColor: colors.outline }]}>
        <Pressable
          style={[
            styles.tab,
            !isLogin && styles.tabActive,
            !isLogin && { backgroundColor: colors.background },
          ]}
          onPress={() => setMode('signup')}
        >
          <Text
            style={[
              styles.tabText,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: !isLogin ? colors.text : colors.textMuted,
              },
            ]}
          >
            {t.auth.tabs.signup}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            isLogin && styles.tabActive,
            isLogin && { backgroundColor: colors.background },
          ]}
          onPress={() => setMode('login')}
        >
          <Text
            style={[
              styles.tabText,
              {
                fontFamily: fontFamilies.figtree.semiBold,
                color: isLogin ? colors.text : colors.textMuted,
              },
            ]}
          >
            {t.auth.tabs.login}
          </Text>
        </Pressable>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: `${colors.red}20` }]}>
          <Text
            style={[
              styles.errorText,
              {
                fontFamily: fontFamilies.figtree.medium,
                color: colors.red,
              },
            ]}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Email Input */}
      <View style={styles.inputGroup}>
        <Text
          style={[
            styles.label,
            {
              fontFamily: fontFamilies.figtree.medium,
              color: colors.text,
            },
          ]}
        >
          {t.auth.email}
        </Text>
        <TextInput
          style={[
            styles.input,
            webInputStyle,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.text,
              borderColor: colors.outline,
              backgroundColor: colors.background,
            },
          ]}
          placeholder={t.auth.emailPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!isLoading}
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputGroup}>
        <Text
          style={[
            styles.label,
            {
              fontFamily: fontFamilies.figtree.medium,
              color: colors.text,
            },
          ]}
        >
          {t.auth.password}
        </Text>
        <TextInput
          style={[
            styles.input,
            webInputStyle,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.text,
              borderColor: colors.outline,
              backgroundColor: colors.background,
            },
          ]}
          placeholder={t.auth.passwordPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          editable={!isLoading}
        />
      </View>

      {/* Confirm Password (Signup only) */}
      {!isLogin && (
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                fontFamily: fontFamilies.figtree.medium,
                color: colors.text,
              },
            ]}
          >
            {t.auth.confirmPassword}
          </Text>
          <TextInput
            style={[
              styles.input,
              webInputStyle,
              {
                fontFamily: fontFamilies.figtree.regular,
                color: colors.text,
                borderColor: colors.outline,
                backgroundColor: colors.background,
              },
            ]}
            placeholder={t.auth.confirmPasswordPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={!isLoading}
          />
        </View>
      )}

      {/* Remember Me & Forgot Password (Login only) */}
      {isLogin && (
        <View style={styles.optionsRow}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: colors.outline,
                  backgroundColor: rememberMe ? colors.primary : 'transparent',
                },
              ]}
            >
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text
              style={[
                styles.checkboxLabel,
                {
                  fontFamily: fontFamilies.figtree.regular,
                  color: colors.text,
                },
              ]}
            >
              {t.auth.rememberMe}
            </Text>
          </Pressable>
          <TextButton
            label={t.auth.forgotPassword}
            onPress={() => console.log('Forgot password')}
          />
        </View>
      )}

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <BigPrimaryButton
          label={isLogin ? t.auth.signIn : t.auth.signUp}
          onPress={handleSubmit}
          disabled={isLoading}
        />
        {isLoading && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            color={colors.primary}
          />
        )}
      </View>

      {/* Google Sign In */}
      <Pressable
        style={[
          styles.googleButton,
          {
            borderColor: colors.outline,
            backgroundColor: colors.background,
          },
        ]}
        onPress={handleGoogleSignIn}
        disabled={isLoading}
      >
        <Text style={styles.googleIcon}>G</Text>
        <Text
          style={[
            styles.googleText,
            {
              fontFamily: fontFamilies.figtree.medium,
              color: colors.text,
            },
          ]}
        >
          {isLogin ? t.auth.signInWithGoogle : t.auth.signUpWithGoogle}
        </Text>
      </Pressable>

      {/* Switch Mode */}
      <View style={styles.switchModeContainer}>
        <Text
          style={[
            styles.switchModeText,
            {
              fontFamily: fontFamilies.figtree.regular,
              color: colors.textMuted,
            },
          ]}
        >
          {isLogin ? t.auth.noAccount : t.auth.hasAccount}
        </Text>
        <TextButton
          label={isLogin ? t.auth.tabs.signup : t.auth.tabs.login}
          onPress={() => setMode(isLogin ? 'signup' : 'login')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoInner: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
  },
  errorContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  submitContainer: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  googleButton: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
    color: '#4285F4',
  },
  googleText: {
    fontSize: 14,
  },
  switchModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchModeText: {
    fontSize: 14,
  },
});
