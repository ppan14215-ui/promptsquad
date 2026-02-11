import { Stack, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
import { ThemeProvider, useTheme } from '@/design-system';
import { I18nProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/services/auth';
import { PreferencesProvider } from '@/services/preferences';
import { hasCompletedOnboarding } from '@/services/mascot-access';
import { ChatPreferencesProvider } from '@/context/ChatPreferencesContext';
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
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChangelogModal } from '@/components/ui/ChangelogModal';
import * as NavigationBar from 'expo-navigation-bar';

const CURRENT_VERSION = '1.2.0';
const CHANGELOG_VERSION_KEY = 'last_seen_changelog_version';
const LAST_VISITED_PATH_KEY = 'last_visited_path';

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
    const inOnboardingGroup = first === '(onboarding)';

    const checkRedirect = async () => {
      // 1. Not logged in -> Redirect to Login
      if (!user && !inAuthGroup) {
        const currentPath = getCurrentAppPath(pathname);
        // Save current location before redirecting to login
        // Only save if it's a meaningful path (not root/auth)
        if (isRestorablePath(currentPath)) {
          await AsyncStorage.setItem('redirect_after_login', currentPath);
          await AsyncStorage.setItem(LAST_VISITED_PATH_KEY, currentPath);
        }
        router.replace('/(auth)/login');
      }
      // 2. Logged in, but on Auth pages (Login/Callback) -> Redirect to App
      // EXEMPTION: Do not auto-redirect if on 'callback'. Let callback page handle it.
      else if (user && inAuthGroup && first !== 'callback') {
        // Check if we have a saved redirect
        const redirectPath = await AsyncStorage.getItem('redirect_after_login');
        if (isRestorablePath(redirectPath)) {
          await AsyncStorage.removeItem('redirect_after_login');
          router.replace(redirectPath as string);
          return;
        }

        const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
        if (isRestorablePath(lastVisitedPath)) {
          router.replace(lastVisitedPath as string);
          return;
        }

        // Onboarding check
        if (!isCheckingOnboarding) {
          setIsCheckingOnboarding(true);
          try {
            const completed = await hasCompletedOnboarding();
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
        setOnboardingChecked(true);
      }
      // 4. Logged in, inside App -> Verify Onboarding
      else if (user && !inAuthGroup && !inOnboardingGroup && !onboardingChecked) {
        const currentPath = getCurrentAppPath(pathname);
        if (currentPath === '/' || currentPath.startsWith('/?') || currentPath.startsWith('/#')) {
          const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
          if (isRestorablePath(lastVisitedPath)) {
            router.replace(lastVisitedPath as string);
            return;
          }
        }

        if (!isCheckingOnboarding) {
          setIsCheckingOnboarding(true);
          try {
            const completed = await hasCompletedOnboarding();
            setOnboardingChecked(true);
            setIsCheckingOnboarding(false);

            if (!completed) {
              router.replace('/(onboarding)/select-mascots');
            } else if (currentPath === '/' || currentPath.startsWith('/?') || currentPath.startsWith('/#')) {
              const lastVisitedPath = await AsyncStorage.getItem(LAST_VISITED_PATH_KEY);
              if (isRestorablePath(lastVisitedPath)) {
                router.replace(lastVisitedPath as string);
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
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <ThemeProvider>
            <I18nProvider>
              <ChatPreferencesProvider>
                <AuthGate>
                  <ThemedStack />
                </AuthGate>
              </ChatPreferencesProvider>
            </I18nProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
