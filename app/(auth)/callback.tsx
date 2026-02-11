import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/design-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_VISITED_PATH_KEY = 'last_visited_path';

function getCurrentWebPath() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  return '/';
}

function isRestorablePath(path: string | null | undefined) {
  if (!path) return false;
  if (path === '/' || path.startsWith('/?') || path.startsWith('/#')) return false;
  if (path.startsWith('/(auth)')) return false;
  if (path.startsWith('/(onboarding)')) return false;
  if (path.includes('/callback')) return false;
  if (path.includes('/login')) return false;
  return true;
}

export default function CallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Logic for Web Relay Pattern (Expo Go support)
      if (Platform.OS === 'web') {
        const currentPath = getCurrentWebPath();
        if (isRestorablePath(currentPath)) {
          await AsyncStorage.setItem(LAST_VISITED_PATH_KEY, currentPath);
        }

        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get('redirect_to');
        if (redirectTo) {
          let destination = redirectTo;
          const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
          if (isRestorablePath(lastVisitedPath)) {
            try {
              const parsedRedirect = new URL(redirectTo, window.location.origin);
              const isSameOriginRoot =
                parsedRedirect.origin === window.location.origin &&
                (parsedRedirect.pathname === '/' || parsedRedirect.pathname === '');
              if (isSameOriginRoot) {
                destination = `${window.location.origin}${lastVisitedPath}`;
              }
            } catch {
              // If redirect URL can't be parsed, use redirectTo as-is.
            }
          }

          // Relay the hash to the deep link
          window.location.href = destination + window.location.hash;
          return;
        }
      }

      // Standard logic: parse the hash fragment / check session
      const { data, error } = await supabase.auth.getSession();

      const proceed = async () => {
        // Check for saved redirect path
        const redirectPath = await AsyncStorage.getItem('redirect_after_login');
        if (isRestorablePath(redirectPath)) {
          await AsyncStorage.removeItem('redirect_after_login');
          router.replace(redirectPath as string);
          return;
        }

        // Fallback to last route the user was on before auth/callback.
        const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
        if (isRestorablePath(lastVisitedPath)) {
          router.replace(lastVisitedPath as string);
          return;
        }

        router.replace('/(tabs)');
      };

      if (!error && data.session) {
        await proceed();
        return;
      }

      // If session not ready, try again once
      const { data: data2, error: error2 } = await supabase.auth.getSession();
      if (!error2 && data2.session) {
        await proceed();
        return;
      }

      // Fallback: go to login
      router.replace('/(auth)/login');
    };

    handleOAuthCallback();
  }, [router]);

  // Extract redirect_to for display
  let redirectTo: string | null = null;
  let fallbackDestination: string | null = null;
  if (Platform.OS === 'web') {
    const params = new URLSearchParams(window.location.search);
    redirectTo = params.get('redirect_to');
    fallbackDestination = `${window.location.origin}/(tabs)`;
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
              } else if (fallbackDestination) {
                window.location.href = fallbackDestination;
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
