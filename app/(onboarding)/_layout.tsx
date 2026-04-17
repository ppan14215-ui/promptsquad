import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="showcase" options={{ headerShown: false }} />
      <Stack.Screen name="select-mascots" options={{ headerShown: false }} />
      <Stack.Screen name="meet-stockbear" options={{ headerShown: false }} />
    </Stack>
  );
}
