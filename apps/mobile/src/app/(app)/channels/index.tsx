import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import type { ChannelRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/empty-state';
import { ChannelListRow } from '@/features/messaging/components/channel-list-row';
import { listChannels } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

export default function ChannelsIndexScreen() {
  const router = useRouter();
  const { activeOrg, loading: orgLoading } = useOrg();

  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setError(null);
    try {
      const rows = await listChannels(activeOrg.id);
      setChannels(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load channels');
    }
  }, [activeOrg]);

  // Focus-based reload: channels created on the pushed "new" screen appear on return.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (orgLoading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <ThemedText themeColor="textSecondary">Loading organization…</ThemedText>
      </ThemedView>
    );
  }

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <ThemedText type="small" themeColor="textSecondary">
          Select or create an organization to see channels.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Chat',
          headerRight: () => (
            <Pressable onPress={() => router.push('/(app)/channels/new')} hitSlop={8}>
              <ThemedText type="linkPrimary">+</ThemedText>
            </Pressable>
          ),
        }}
      />

      {error ? (
        <ThemedView style={styles.centered}>
          <ThemedText themeColor="textSecondary">{error}</ThemedText>
        </ThemedView>
      ) : loading ? (
        <ThemedView style={styles.centered}>
          <ThemedText themeColor="textSecondary">Loading…</ThemedText>
        </ThemedView>
      ) : channels.length === 0 ? (
        <EmptyState
          title="No channels yet"
          body="Start a direct message or create a team channel to begin messaging."
        />
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => (
            <ChannelListRow channel={item} onPress={() => router.push(`/(app)/channels/${item.id}`)} />
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  listContent: {
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
});
