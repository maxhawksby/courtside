import { Stack } from 'expo-router';

export default function ChannelsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Chat' }} />
      <Stack.Screen name="new" options={{ title: 'New message', presentation: 'modal' }} />
      <Stack.Screen name="[channelId]" options={{ title: 'Channel' }} />
    </Stack>
  );
}
