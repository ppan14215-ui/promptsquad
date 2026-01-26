import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Icon } from '@/components';
import { useTheme, fontFamilies } from '@/design-system';
import { useIsAdmin } from '@/services/admin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { isAdmin } = useIsAdmin();
  const insets = useSafeAreaInsets();

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
          // Standard height + safe area
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 70,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
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
        name="store"
        options={{
          tabBarLabel: 'Store',
          tabBarIcon: ({ color }) => <Icon name="store" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="skills"
        options={{
          tabBarLabel: 'Skills',
          tabBarIcon: ({ color }) => <Icon name="settings" color={color} size={24} />,
          // Hide from tab bar for non-admins
          href: isAdmin ? undefined : null,
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
        name="privacy"
        options={{
          tabBarLabel: 'Privacy',
          tabBarIcon: ({ color }) => <Icon name="lock" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="tokens"
        options={{
          tabBarLabel: 'Tokens',
          tabBarIcon: ({ color }) => <Icon name="idea" color={color} size={24} />,
          // Hide from tab bar for non-admins
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="components"
        options={{
          tabBarLabel: 'Components',
          tabBarIcon: ({ color }) => <Icon name="add-circle" color={color} size={24} />,
          // Hide from tab bar for non-admins
          href: isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}

