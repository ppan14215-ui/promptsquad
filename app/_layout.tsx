import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, useTheme } from '@/design-system';
import { I18nProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/services/auth';
import { PreferencesProvider } from '@/services/preferences';
import { hasCompletedOnboarding } from '@/services/mascot-access';
import { useFonts } from 'expo-font';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
} from '@expo-google-fonts/figtree';
import { AbyssinicaSIL_400Regular } from '@expo-google-fonts/abyssinica-sil';
import { View, ActivityIndicator, StyleSheet, LogBox, Platform, StatusBar as RNStatusBar } from 'react-native';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Suppress warning from hugeicons-react-native internal prop spreading
LogBox.ignoreLogs(['A props object containing a "key" prop is being spread into JSX']);

function StatusBarWrapper() {
  const { mode } = useTheme();
  // When theme is light, use dark content (black icons on white background)
  // When theme is dark, use light content (white icons on dark background)
  const statusBarStyle = mode === 'light' ? 'dark' : 'light';
  
  // Use React Native StatusBar for Android (more reliable)
  // Use Expo StatusBar for iOS
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

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = React.useState(false);

  useEffect(() => {
    if (isLoading) return;

    const first = segments[0];
    const inAuthGroup =
      first === '(auth)' ||
      first === 'login' ||
      first === 'callback';
    const inOnboardingGroup = first === '(onboarding)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // User just logged in, check onboarding
      if (!isCheckingOnboarding) {
        setIsCheckingOnboarding(true);
        hasCompletedOnboarding().then((completed) => {
          setOnboardingChecked(true);
          setIsCheckingOnboarding(false);
          if (completed) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(onboarding)/select-mascots');
          }
        }).catch(() => {
          setIsCheckingOnboarding(false);
          // On error, assume onboarding needed
          router.replace('/(onboarding)/select-mascots');
        });
      }
    } else if (user && inOnboardingGroup) {
      // User is in onboarding - let them stay there, don't redirect
      setOnboardingChecked(true);
    } else if (user && !inAuthGroup && !inOnboardingGroup && !onboardingChecked) {
      // User is on main app pages but we haven't checked onboarding yet
      if (!isCheckingOnboarding) {
        setIsCheckingOnboarding(true);
        hasCompletedOnboarding().then((completed) => {
          setOnboardingChecked(true);
          setIsCheckingOnboarding(false);
          if (!completed) {
            router.replace('/(onboarding)/select-mascots');
          }
        }).catch(() => {
          setIsCheckingOnboarding(false);
          setOnboardingChecked(true); // Don't keep retrying
        });
      }
    }
  }, [user, isLoading, segments, onboardingChecked, isCheckingOnboarding]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Show loading only when actively checking onboarding, not forever
  if (user && isCheckingOnboarding && segments[0] !== '(onboarding)') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
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
            <StatusBarWrapper />
            <I18nProvider>
              <AuthGate>
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                  <Stack.Screen name="chat/[mascotId]" options={{ headerShown: false }} />
                </Stack>
              </AuthGate>
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

