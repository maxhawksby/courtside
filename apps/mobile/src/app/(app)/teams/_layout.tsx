import { Stack } from 'expo-router';

export default function TeamsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Teams' }} />
      <Stack.Screen name="new" options={{ title: 'New team', presentation: 'modal' }} />
      <Stack.Screen name="[teamId]" options={{ title: 'Team' }} />
    </Stack>
  );
}
