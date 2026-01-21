import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme, fontFamilies, textStyles } from '@/design-system';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';
import { BigPrimaryButton, BigSecondaryButton, TextButton, SegmentedToggle, InputField } from '@/components';
import { createNamedLogger } from '@/lib/utils/logger';

const logger = createNamedLogger('Login');

type AuthMode = 'login' | 'signup';

const STORAGE_KEYS = {
  savedEmail: 'saved_email',
  rememberMe: 'remember_me',
};

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

  // Load saved email on mount - run immediately
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const [savedEmail, rememberMeValue] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.savedEmail),
          AsyncStorage.getItem(STORAGE_KEYS.rememberMe),
        ]);

        if (rememberMeValue === 'true' && savedEmail) {
          // Set email only - password should never be stored
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (err) {
        logger.error('Error loading saved email:', err);
      }
    };

    // Run immediately, don't wait
    loadSavedEmail();
  }, []);

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
        // Save email only if "Remember Me" is checked (password should never be stored)
        if (isLogin && rememberMe) {
          try {
            await Promise.all([
              AsyncStorage.setItem(STORAGE_KEYS.savedEmail, email),
              AsyncStorage.setItem(STORAGE_KEYS.rememberMe, 'true'),
            ]);
          } catch (err) {
            logger.error('Error saving email:', err);
          }
        } else if (isLogin && !rememberMe) {
          // Clear saved email if "Remember Me" is unchecked
          try {
            await Promise.all([
              AsyncStorage.removeItem(STORAGE_KEYS.savedEmail),
              AsyncStorage.removeItem(STORAGE_KEYS.rememberMe),
            ]);
          } catch (err) {
            logger.error('Error clearing saved email:', err);
          }
        }

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
      <SegmentedToggle
        options={[
          { key: 'signup', label: t.auth.tabs.signup },
          { key: 'login', label: t.auth.tabs.login },
        ]}
        selectedKey={mode}
        onChange={(key) => setMode(key as AuthMode)}
        style={styles.tabContainer}
      />

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
      <InputField
        label={t.auth.email}
        placeholder={t.auth.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        editable={!isLoading}
        style={webInputStyle}
      />

      {/* Password Input */}
      <InputField
        label={t.auth.password}
        placeholder={t.auth.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={isLogin ? 'current-password' : 'new-password'}
        textContentType={isLogin ? 'password' : 'newPassword'}
        editable={!isLoading}
        style={webInputStyle}
      />

      {/* Confirm Password (Signup only) */}
      {!isLogin && (
        <InputField
          label={t.auth.confirmPassword}
          placeholder={t.auth.confirmPasswordPlaceholder}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!isLoading}
          style={webInputStyle}
        />
      )}

      {/* Remember Me & Forgot Password (Login only) */}
      {isLogin && (
        <View style={styles.optionsRow}>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => {
              const newValue = !rememberMe;
              setRememberMe(newValue);
              // If unchecking, clear saved email
              if (!newValue) {
                AsyncStorage.multiRemove([
                  STORAGE_KEYS.savedEmail,
                  STORAGE_KEYS.rememberMe,
                ]).catch((err) => logger.error('Error clearing saved email:', err));
              }
            }}
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
      <View style={styles.googleButtonContainer}>
        <BigSecondaryButton
          label={isLogin ? t.auth.signInWithGoogle : t.auth.signUpWithGoogle}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          icon={
            <Image
              source={require('@/assets/images/google-logo.png')}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
            />
          }
        />
      </View>

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
    marginBottom: 24,
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
  googleButtonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
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
