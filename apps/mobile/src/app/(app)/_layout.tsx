import { Redirect, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';

function tabIcon(name: SymbolViewProps['name']) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <SymbolView name={name} size={size} tintColor={color} />
  );
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
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: tabIcon({ ios: 'person.3', android: 'groups', web: 'groups' }),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: tabIcon({
            ios: 'list.bullet',
            android: 'format_list_bulleted',
            web: 'format_list_bulleted',
          }),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon({ ios: 'house', android: 'home', web: 'home' }),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: tabIcon({
            ios: 'calendar',
            android: 'calendar_month',
            web: 'calendar_month',
          }),
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: 'Chat',
          tabBarIcon: tabIcon({
            ios: 'bubble.left.and.bubble.right',
            android: 'chat',
            web: 'chat',
          }),
        }}
      />
      {/* Not tabs: settings opens from the gear on Home; households from Directory. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="households" options={{ href: null }} />
    </Tabs>
  );
}
