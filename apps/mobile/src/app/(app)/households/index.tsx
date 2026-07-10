import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Placeholder — replaced by the Phase-1 wave task that owns this directory.
export default function ComingSoon() {
  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText type="smallBold">Coming soon</ThemedText>
    </ThemedView>
  );
}
