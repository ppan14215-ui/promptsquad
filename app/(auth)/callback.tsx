import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/design-system';

export default function CallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // This will parse the hash fragment returned by Supabase OAuth
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
