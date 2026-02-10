import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/design-system';

export default function CallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Logic for Web Relay Pattern (Expo Go support)
      if (Platform.OS === 'web') {
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get('redirect_to');
        if (redirectTo) {
          // Relay the hash to the deep link
          window.location.href = redirectTo + window.location.hash;
          return;
        }
      }

      // Standard logic: parse the hash fragment / check session
      const { data, error } = await supabase.auth.getSession();

      if (!error && data.session) {
        router.replace('/(tabs)');
        return;
      }

      // If session not ready, try again once
      const { data: data2, error: error2 } = await supabase.auth.getSession();
      if (!error2 && data2.session) {
        router.replace('/(tabs)');
        return;
      }

      // Fallback: go to login
      router.replace('/(auth)/login');
    };

    handleOAuthCallback();
  }, [router]);

  // Extract redirect_to for display
  let redirectTo: string | null = null;
  if (Platform.OS === 'web') {
    const params = new URLSearchParams(window.location.search);
    redirectTo = params.get('redirect_to');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.text, marginTop: 20 }]}>
        Authenticating...
      </Text>
      {Platform.OS === 'web' && redirectTo && (
        <View style={styles.webContainer}>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            If you are not redirected automatically, please click below:
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (redirectTo) {
                window.location.href = redirectTo + window.location.hash;
              }
            }}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Return to App</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webContainer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
