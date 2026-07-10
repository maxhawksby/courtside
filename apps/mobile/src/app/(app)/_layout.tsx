import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';

function tabIcon(name: ComponentProps<typeof Ionicons>['name']) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  }
  return TabIcon;
}

export default function AppLayout() {
  const theme = useTheme();
  const { session } = useAuth();

  // Root layout keeps its Slot mounted, so this swaps to the (auth) group.
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      }}>
      <Tabs.Screen
        name="teams"
        options={{ title: 'Teams', tabBarIcon: tabIcon('people-outline') }}
      />
      <Tabs.Screen
        name="directory"
        options={{ title: 'Directory', tabBarIcon: tabIcon('list-outline') }}
      />
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen
        name="events"
        options={{ title: 'Events', tabBarIcon: tabIcon('calendar-outline') }}
      />
      <Tabs.Screen
        name="channels"
        options={{ title: 'Chat', tabBarIcon: tabIcon('chatbubbles-outline') }}
      />
      {/* Not tabs: settings opens from the gear on Home; households from Directory. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="households" options={{ href: null }} />
    </Tabs>
  );
}
