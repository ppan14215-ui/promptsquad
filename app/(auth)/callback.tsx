import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
