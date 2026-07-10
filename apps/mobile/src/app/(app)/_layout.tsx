import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';

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
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="teams" options={{ title: 'Teams' }} />
      <Tabs.Screen name="directory" options={{ title: 'Directory' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="channels" options={{ title: 'Chat' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      {/* Not a tab: reachable from Directory. */}
      <Tabs.Screen name="households" options={{ href: null }} />
    </Tabs>
  );
}
