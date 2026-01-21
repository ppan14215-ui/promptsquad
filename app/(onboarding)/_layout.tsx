import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="select-mascots" options={{ headerShown: false }} />
    </Stack>
  );
}
