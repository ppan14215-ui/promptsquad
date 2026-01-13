import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '@/design-system';
import { I18nProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/services/auth';
import { PreferencesProvider } from '@/services/preferences';
import { useFonts } from 'expo-font';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
} from '@expo-google-fonts/figtree';
import { AbyssinicaSIL_400Regular } from '@expo-google-fonts/abyssinica-sil';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { useEffect } from 'react';

// Suppress warning from hugeicons-react-native internal prop spreading
LogBox.ignoreLogs(['A props object containing a "key" prop is being spread into JSX']);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to home if authenticated
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
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
    <AuthProvider>
      <PreferencesProvider>
        <ThemeProvider>
          <I18nProvider>
            <AuthGate>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="chat/[mascotId]" options={{ headerShown: false }} />
              </Stack>
            </AuthGate>
          </I18nProvider>
        </ThemeProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

