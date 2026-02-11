import { useEffect, useState } from 'react';
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
    // Flag to prevent multiple redirects
    let isRedirecting = false;

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
          // Ensure we don't redirect to self to avoid loops
          if (destination !== window.location.href) {
            window.location.href = destination + window.location.hash;
          }
          return;
        }
      }

      // Standard logic: Wait for Supabase to detect the session from URL
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (isRedirecting) return;

        if (event === 'SIGNED_IN' || session) {
          isRedirecting = true;

          // Small delay to allow AuthContext to update its state
          // This prevents AuthGate from reacting to stale user=null state
          setTimeout(async () => {
            // Check for saved redirect path
            const redirectPath = await AsyncStorage.getItem('redirect_after_login');
            if (isRestorablePath(redirectPath)) {
              await AsyncStorage.removeItem('redirect_after_login');
              router.replace(redirectPath as string);
              return;
            }

            // Fallback to last route the user was on
            const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
            if (isRestorablePath(lastVisitedPath)) {
              router.replace(lastVisitedPath as string);
              return;
            }

            router.replace('/(tabs)');
          }, 500);
        }
      });

      // Validating session with a timeout fallback
      // STOP AUTO-REDIRECT LOOP: If we time out, show a button instead of redirecting.
      const timeoutId = setTimeout(async () => {
        if (isRedirecting) return;

        // Final check
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          return;
        }

        // Do NOT auto-redirect to login here, as it can cause loops.
        // Just show the manual button.
        setManualCheck(true);
        subscription.unsubscribe();
      }, 4000);

      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    };

    handleOAuthCallback();
  }, [router]);

  const [manualCheck, setManualCheck] = useState(false);

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

      {manualCheck && (
        <View style={styles.webContainer}>
          <Text style={[styles.subtext, { color: colors.red || 'orange' }]}>
            It seems appropriate session details were not found.
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Go to Login</Text>
          </Pressable>
        </View>
      )}

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
