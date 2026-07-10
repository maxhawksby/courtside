import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Events' }} />
      <Stack.Screen name="new" options={{ title: 'New event', presentation: 'modal' }} />
      <Stack.Screen name="[eventId]" options={{ title: 'Event' }} />
    </Stack>
  );
}
