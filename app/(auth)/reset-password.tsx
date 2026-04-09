import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, fontFamilies } from '@/design-system';
import { BigPrimaryButton, InputField, TextButton } from '@/components';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, updatePassword, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(
    () => !isLoading && password.length >= 6 && confirmPassword.length >= 6,
    [isLoading, password.length, confirmPassword.length]
  );

  const handleUpdatePassword = async () => {
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError(t.auth.errors.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.errors.passwordMismatch);
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await updatePassword(password);
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message || t.auth.errors.generic);
      return;
    }

    setSuccess(t.auth.passwordReset.passwordUpdated);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text, fontFamily: fontFamilies.figtree.semiBold }]}>
        {t.auth.passwordReset.title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: fontFamilies.figtree.regular }]}>
        {t.auth.passwordReset.subtitle}
      </Text>

      {!user && (
        <View style={[styles.messageContainer, { backgroundColor: `${colors.red}20` }]}>
          <Text style={[styles.messageText, { color: colors.red, fontFamily: fontFamilies.figtree.medium }]}>
            {t.auth.passwordReset.invalidSession}
          </Text>
        </View>
      )}

      {error && (
        <View style={[styles.messageContainer, { backgroundColor: `${colors.red}20` }]}>
          <Text style={[styles.messageText, { color: colors.red, fontFamily: fontFamilies.figtree.medium }]}>
            {error}
          </Text>
        </View>
      )}

      {success && (
        <View style={[styles.messageContainer, { backgroundColor: `${colors.primary}18` }]}>
          <Text style={[styles.messageText, { color: colors.primary, fontFamily: fontFamilies.figtree.medium }]}>
            {success}
          </Text>
        </View>
      )}

      <InputField
        label={t.auth.passwordReset.newPassword}
        placeholder={t.auth.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        editable={!isLoading && !!user}
      />
      <InputField
        label={t.auth.passwordReset.confirmNewPassword}
        placeholder={t.auth.confirmPasswordPlaceholder}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
        editable={!isLoading && !!user}
      />

      <View style={styles.actions}>
        <BigPrimaryButton
          label={t.auth.passwordReset.updatePassword}
          onPress={handleUpdatePassword}
          disabled={!canSubmit || !user}
        />
        {isLoading && <ActivityIndicator style={styles.loader} color={colors.primary} />}
      </View>

      <TextButton
        label={success ? t.auth.passwordReset.continueToApp : t.auth.passwordReset.backToLogin}
        onPress={async () => {
          if (success) {
            router.replace('/(tabs)');
            return;
          }
          await signOut();
          router.replace('/(auth)/login');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 72,
    alignItems: 'center',
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
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
  messageContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
});
