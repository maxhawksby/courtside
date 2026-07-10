import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { isMinor, type PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listPersons } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

import { EmptyState } from '@/features/directory/empty-state';
import { PersonListRow } from '@/features/directory/person-list-row';
import { useDebouncedValue } from '@/features/directory/use-debounced-value';

type PersonFilter = 'all' | 'players' | 'adults';

const FILTER_OPTIONS: { value: PersonFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'players', label: 'Players' },
  { value: 'adults', label: 'Adults' },
];

export default function DirectoryIndexScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeOrg, loading: orgLoading } = useOrg();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PersonFilter>('all');

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listPersons(activeOrg.id, debouncedQuery);
      setPersons(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, [activeOrg, debouncedQuery]);

  // Focus-based reload: people added on pushed screens appear when returning.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (orgLoading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Directory' }} />
        <ThemedText themeColor="textSecondary">Loading organization…</ThemedText>
      </ThemedView>
    );
  }

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Directory' }} />
        <ThemedText type="subtitle" style={styles.centerText}>
          No organization selected
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          Choose or create an organization to see its directory.
        </ThemedText>
      </ThemedView>
    );
  }

  const trimmedQuery = debouncedQuery.trim();

  const filteredPersons = useMemo(() => {
    if (filter === 'all') return persons;
    return persons.filter((person) =>
      filter === 'players' ? isMinor(person.date_of_birth) : !isMinor(person.date_of_birth),
    );
  }, [persons, filter]);

  const filterLabel = filter === 'players' ? 'players' : filter === 'adults' ? 'adults' : 'people';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Directory',
          headerLeft: () => (
            <Pressable onPress={() => router.push('/households')} hitSlop={8}>
              <ThemedText type="linkPrimary">Households</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/directory/new')} hitSlop={8}>
              <ThemedText type="linkPrimary">Add person</ThemedText>
            </Pressable>
          ),
        }}
      />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.searchInput,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
        autoCapitalize="words"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <View style={styles.filterRow}>
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      </View>

      {error ? (
        <ThemedView style={styles.centered}>
          <ThemedText themeColor="textSecondary">{error}</ThemedText>
        </ThemedView>
      ) : loading ? (
        <ThemedView style={styles.centered}>
          <ThemedText themeColor="textSecondary">Loading…</ThemedText>
        </ThemedView>
      ) : persons.length === 0 ? (
        trimmedQuery ? (
          <EmptyState title="No matches" subtitle={`Nobody matches "${trimmedQuery}".`} />
        ) : (
          <EmptyState
            title="No people yet"
            subtitle="Add your first parent, player, or coach to get started."
            actionLabel="Add person"
            onAction={() => router.push('/directory/new')}
          />
        )
      ) : filteredPersons.length === 0 ? (
        <EmptyState
          title="No matches"
          subtitle={`No ${filterLabel} found${trimmedQuery ? ` for "${trimmedQuery}"` : ''}.`}
        />
      ) : (
        <FlatList
          data={filteredPersons}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PersonListRow person={item} onPress={() => router.push(`/directory/${item.id}`)} />
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
  centerText: {
    textAlign: 'center',
  },
  searchInput: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.three,
  },
  filterRow: {
    marginBottom: Spacing.three,
  },
  listContent: {
    paddingBottom: Spacing.six,
  },
});
