import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth';
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
  const { user, isLoading } = useAuth();
  const [manualCheck, setManualCheck] = useState(false);

  // If we're on native, don't render anything (we're redirecting above)
  if (Platform.OS !== 'web') {
    if (isLoading) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
  }

  // ─── WEB ONLY below this point ───

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Parse tokens from URL hash (web OAuth redirect)
      if (window.location.hash?.includes('access_token=')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
        } catch {
          // Continue with normal callback flow.
        }
      }

      const currentPath = getCurrentWebPath();
      if (isRestorablePath(currentPath)) {
        await AsyncStorage.setItem(LAST_VISITED_PATH_KEY, currentPath);
      }

      // Handle relay redirect (Vercel callback with redirect_to param)
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
            // use redirectTo as-is
          }
        }

        try {
          const parsedDestination = new URL(destination, window.location.origin);
          const destinationPath = `${parsedDestination.pathname}${parsedDestination.search}`;
          const currentPathQuery = `${window.location.pathname}${window.location.search}`;
          if (!destinationPath.includes('/callback') && destinationPath !== currentPathQuery) {
            window.location.href = parsedDestination.toString() + window.location.hash;
          }
        } catch {
          if (destination !== window.location.href && !destination.includes('/callback')) {
            window.location.href = destination + window.location.hash;
          }
        }
        return;
      }

      // Standard: user detected by auth context → redirect to app
      if (user) {
        const redirectPath = await AsyncStorage.getItem('redirect_after_login');
        if (isRestorablePath(redirectPath)) {
          await AsyncStorage.removeItem('redirect_after_login');
          router.replace('/(tabs)');
          return;
        }
        router.replace('/(tabs)');
      }
    };

    handleOAuthCallback();
  }, [router, user]);

  // Timeout: if no session after 3s, show manual button
  useEffect(() => {
    if (user) return;
    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) return;
        setManualCheck(true);
      } catch {
        // Supabase lock acquisition can be aborted during parallel auth transitions.
        // Do not crash the app; fall back to manual recovery UI.
        setManualCheck(true);
      }
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [user]);

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const redirectTo = params?.get('redirect_to') ?? null;

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

      {redirectTo && (
        <View style={styles.webContainer}>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            If you are not redirected automatically, please click below:
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              window.location.href = redirectTo + window.location.hash;
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
