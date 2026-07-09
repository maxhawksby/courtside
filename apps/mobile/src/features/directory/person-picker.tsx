import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import type { PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPerson, listPersons } from '@/lib/data';

import { useDebouncedValue } from './use-debounced-value';

type PersonPickerProps = {
  orgId: string;
  /** Person to exclude from results (e.g. the person you're linking against). */
  excludePersonId?: string;
  onSelect: (person: PersonRow) => void;
};

/** Search-existing-or-quick-create picker used by the link-guardian flow. */
export function PersonPicker({ orgId, excludePersonId, onSelect }: PersonPickerProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPersons(orgId, debouncedQuery)
      .then((rows) => {
        if (cancelled) return;
        setResults(rows.filter((p) => p.id !== excludePersonId));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, debouncedQuery, excludePersonId]);

  const handleQuickCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const person = await createPerson(orgId, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      onSelect(person);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create person');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ThemedView style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {error ? (
        <ThemedText type="small" themeColor="textSecondary">
          {error}
        </ThemedText>
      ) : null}

      {loading ? (
        <ThemedText type="small" themeColor="textSecondary">
          Searching…
        </ThemedText>
      ) : results.length === 0 && debouncedQuery.trim() ? (
        <ThemedText type="small" themeColor="textSecondary">
          No matches.
        </ThemedText>
      ) : null}

      {results.map((person) => (
        <Pressable key={person.id} onPress={() => onSelect(person)} hitSlop={4}>
          <ThemedView type="backgroundElement" style={styles.resultRow}>
            <ThemedText>
              {person.first_name} {person.last_name}
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}

      {!showQuickCreate ? (
        <Pressable onPress={() => setShowQuickCreate(true)} hitSlop={4}>
          <ThemedText type="linkPrimary">+ Quick-create a new person</ThemedText>
        </Pressable>
      ) : (
        <ThemedView style={styles.quickCreate}>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            autoCapitalize="words"
          />
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            autoCapitalize="words"
          />
          <Pressable
            onPress={handleQuickCreate}
            disabled={creating || !firstName.trim() || !lastName.trim()}
            hitSlop={4}>
            <ThemedText type="linkPrimary">{creating ? 'Creating…' : 'Create & select'}</ThemedText>
          </Pressable>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  resultRow: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  quickCreate: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
