import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Icon } from '@/components';
import { useTheme, fontFamilies } from '@/design-system';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // Hide the top header bar
        headerShown: false,
        // Tab bar styling
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.outline,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fontFamilies.figtree.medium,
          fontSize: 10,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Icon name="user" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="tokens"
        options={{
          tabBarLabel: 'Tokens',
          tabBarIcon: ({ color }) => <Icon name="home" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="components"
        options={{
          tabBarLabel: 'Components',
          tabBarIcon: ({ color }) => <Icon name="home" color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}

