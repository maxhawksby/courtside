import { Stack } from 'expo-router';

export default function DirectoryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Directory' }} />
      <Stack.Screen name="new" options={{ title: 'Add person', presentation: 'modal' }} />
      <Stack.Screen name="[personId]" options={{ title: 'Person' }} />
    </Stack>
  );
}
