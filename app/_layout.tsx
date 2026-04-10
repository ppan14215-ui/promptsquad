import 'react-native-gesture-handler';
import { Stack, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
import { ThemeProvider, useTheme } from '@/design-system';
import { I18nProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/services/auth';
import { PreferencesProvider } from '@/services/preferences';
import { hasCompletedOnboarding } from '@/services/mascot-access';
import { ChatPreferencesProvider } from '@/context/ChatPreferencesContext';
import { MascotsDataProvider } from '@/context/MascotsDataContext';
import { useFonts } from 'expo-font';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
} from '@expo-google-fonts/figtree';
import { AbyssinicaSIL_400Regular } from '@expo-google-fonts/abyssinica-sil';
import { View, ActivityIndicator, StyleSheet, LogBox, Platform, StatusBar as RNStatusBar } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChangelogModal } from '@/components/ui/ChangelogModal';
import * as NavigationBar from 'expo-navigation-bar';

const CURRENT_VERSION = '1.4.0';
const CHANGELOG_VERSION_KEY = 'last_seen_changelog_version';
const LAST_VISITED_PATH_KEY = 'last_visited_path';
const PASSWORD_RECOVERY_ACTIVE_KEY = 'password_recovery_active';
const ONBOARDING_CHECK_TIMEOUT_MS = 6000;
// Keep onboarding screens in codebase, but disable gating for now.
const ONBOARDING_SELECTION_ENABLED = false;

function getCurrentAppPath(pathname: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  return pathname;
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

/** Normalize stored path to a valid Expo Router href to avoid "unmatched route". */
function toValidHref(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return '/(tabs)';
  const pathname = path.replace(/#.*$/, '').replace(/\?.*$/, '').trim();
  if (!pathname || pathname === '/') return '/(tabs)';
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (withSlash.startsWith('/(tabs)') || withSlash.startsWith('/chat/')) {
    return withSlash;
  }
  return '/(tabs)';
}

async function hasCompletedOnboardingWithTimeout(): Promise<boolean> {
  return await Promise.race<boolean>([
    hasCompletedOnboarding(),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), ONBOARDING_CHECK_TIMEOUT_MS);
    }),
  ]);
}

LogBox.ignoreLogs(['A props object containing a "key" prop is being spread into JSX']);

function StatusBarWrapper() {
  const { mode } = useTheme();
  const statusBarStyle = mode === 'light' ? 'dark' : 'light';
  if (Platform.OS === 'android') {
    return (
      <RNStatusBar
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent={true}
      />
    );
  }
  return <StatusBar style={statusBarStyle} />;
}

function NavigationBarWrapper() {
  const { colors, mode } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Set the Android system navigation bar color to match the app theme
    NavigationBar.setBackgroundColorAsync(colors.background).catch(() => { });
    NavigationBar.setButtonStyleAsync(mode === 'light' ? 'dark' : 'light').catch(() => { });
  }, [colors.background, mode]);

  return null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState(); // Check navigation state
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogChecked, setChangelogChecked] = useState(false);

  // Check if we should show the changelog
  useEffect(() => {
    if (!user || changelogChecked) return;

    AsyncStorage.getItem(CHANGELOG_VERSION_KEY).then((lastVersion) => {
      if (lastVersion !== CURRENT_VERSION) {
        setShowChangelog(true);
      }
      setChangelogChecked(true);
    }).catch(() => {
      setChangelogChecked(true);
    });
  }, [user, changelogChecked]);

  const handleDismissChangelog = async () => {
    setShowChangelog(false);
    await AsyncStorage.setItem(CHANGELOG_VERSION_KEY, CURRENT_VERSION);
  };

  // Persist the last meaningful route so refresh/login callback can restore it.
  useEffect(() => {
    const currentPath = getCurrentAppPath(pathname);
    if (!isRestorablePath(currentPath)) return;
    AsyncStorage.setItem(LAST_VISITED_PATH_KEY, currentPath).catch(() => { });
  }, [pathname]);

  useEffect(() => {
    // Wait for auth to load and navigation to be ready
    if (isLoading || !rootNavigationState?.key) return;

    const first = segments[0];
    const inAuthGroup = first === '(auth)' || first === 'login' || first === 'callback';
    const inCallbackRoute = pathname.includes('/callback') || segments.includes('callback');
    const inResetPasswordRoute = pathname.includes('/reset-password') || segments.includes('reset-password');
    const inOnboardingGroup = first === '(onboarding)';

    const checkRedirect = async () => {
      // 0. Callback route: callback screen owns redirect handling.
      if (inCallbackRoute) {
        return;
      }

      const isRecoveryActive = user
        ? await AsyncStorage.getItem(PASSWORD_RECOVERY_ACTIVE_KEY)
        : null;

      // 1. Not logged in -> Redirect to Login
      if (!user && !inAuthGroup) {
        const currentPath = getCurrentAppPath(pathname);
        if (isRestorablePath(currentPath)) {
          await AsyncStorage.setItem('redirect_after_login', currentPath);
          await AsyncStorage.setItem(LAST_VISITED_PATH_KEY, currentPath);
        }
        router.replace('/(auth)/login');
      }
      // 1.5 If recovery is active, always force reset-password route.
      else if (user && isRecoveryActive === 'true' && !inResetPasswordRoute) {
        router.replace('/(auth)/reset-password');
        return;
      }
      // 2. Logged in, but on Auth pages (Login only; callback handled above) -> Redirect to App
      else if (user && inAuthGroup) {
        // Allow recovery users to stay on reset screen to set new password.
        if (inResetPasswordRoute) {
          return;
        }
        // Check if we have a saved redirect
        const redirectPath = await AsyncStorage.getItem('redirect_after_login');
        if (isRestorablePath(redirectPath)) {
          await AsyncStorage.removeItem('redirect_after_login');
          router.replace(toValidHref(redirectPath));
          return;
        }

        const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
        if (isRestorablePath(lastVisitedPath)) {
          router.replace(toValidHref(lastVisitedPath));
          return;
        }

        if (!ONBOARDING_SELECTION_ENABLED) {
          setOnboardingChecked(true);
          router.replace('/(tabs)');
          return;
        }

        // Onboarding check
        if (!isCheckingOnboarding) {
          setIsCheckingOnboarding(true);
          try {
            const completed = await hasCompletedOnboardingWithTimeout();
            setOnboardingChecked(true);
            setIsCheckingOnboarding(false);
            if (completed) router.replace('/(tabs)');
            else router.replace('/(onboarding)/select-mascots');
          } catch (e) {
            setIsCheckingOnboarding(false);
            router.replace('/(onboarding)/select-mascots');
          }
        }
      }
      // 3. Logged in, on Onboarding -> Just mark checked
      else if (user && inOnboardingGroup) {
        if (!ONBOARDING_SELECTION_ENABLED) {
          router.replace('/(tabs)');
          return;
        }
        setOnboardingChecked(true);
      }
      // 4. Logged in, inside App -> Verify Onboarding
      else if (user && !inAuthGroup && !inOnboardingGroup && !onboardingChecked) {
        const currentPath = getCurrentAppPath(pathname);
        if (currentPath === '/' || currentPath.startsWith('/?') || currentPath.startsWith('/#')) {
          const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
          if (isRestorablePath(lastVisitedPath)) {
            router.replace(toValidHref(lastVisitedPath));
            return;
          }
        }

        if (!ONBOARDING_SELECTION_ENABLED) {
          setOnboardingChecked(true);
          if (currentPath === '/' || currentPath.startsWith('/?') || currentPath.startsWith('/#')) {
            const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
            if (isRestorablePath(lastVisitedPath)) {
              router.replace(toValidHref(lastVisitedPath));
            } else {
              router.replace('/(tabs)');
            }
          }
          return;
        }

        if (!isCheckingOnboarding) {
          setIsCheckingOnboarding(true);
          try {
            const completed = await hasCompletedOnboardingWithTimeout();
            setOnboardingChecked(true);
            setIsCheckingOnboarding(false);

            if (!completed) {
              router.replace('/(onboarding)/select-mascots');
            } else if (currentPath === '/' || currentPath.startsWith('/?') || currentPath.startsWith('/#')) {
              const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
              if (isRestorablePath(lastVisitedPath)) {
                router.replace(toValidHref(lastVisitedPath));
              } else {
                router.replace('/(tabs)');
              }
            }
          } catch (e) {
            setIsCheckingOnboarding(false);
            setOnboardingChecked(true);
          }
        }
      }
    };

    checkRedirect();
  }, [user, isLoading, segments, onboardingChecked, isCheckingOnboarding, rootNavigationState?.key, pathname]);

  if (isLoading || !rootNavigationState?.key || (user && isCheckingOnboarding && segments[0] !== '(onboarding)')) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <>
      {children}
      <ChangelogModal
        visible={showChangelog}
        onDismiss={handleDismissChangelog}
        version={CURRENT_VERSION}
      />
    </>
  );
}

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <>
      <StatusBarWrapper />
      <NavigationBarWrapper />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[mascotId]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    AbyssinicaSIL_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PreferencesProvider>
            <ThemeProvider>
              <I18nProvider>
                <ChatPreferencesProvider>
                  <AuthGate>
                    <MascotsDataProvider>
                      <ThemedStack />
                    </MascotsDataProvider>
                  </AuthGate>
                </ChatPreferencesProvider>
              </I18nProvider>
            </ThemeProvider>
          </PreferencesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
