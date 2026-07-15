import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addToRoster, createPerson, listPersons } from '@/lib/data';
import type { PersonRow, RosterMembershipRow } from '@courtside/shared';

import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';

const ROLE_OPTIONS: { value: RosterMembershipRow['role']; label: string }[] = [
  { value: 'player', label: 'Player' },
  { value: 'coach', label: 'Coach' },
  { value: 'scorekeeper', label: 'Scorekeeper' },
];

type AddToRosterPanelProps = {
  orgId: string;
  teamSeasonId: string;
  onAdded: () => void;
  onClose: () => void;
};

export function AddToRosterPanel({ orgId, teamSeasonId, onAdded, onClose }: AddToRosterPanelProps) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PersonRow[]>([]);
  // Searching is derived: a fetch is pending until the current org+query
  // combination settles, so the effect never sets state synchronously.
  const [settledSearchKey, setSettledSearchKey] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonRow | null>(null);
  const searchKey = `${orgId}|${search}`;
  const searching = !selectedPerson && settledSearchKey !== searchKey;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<RosterMembershipRow['role']>('player');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPerson) return;
    let cancelled = false;
    listPersons(orgId, search)
      .then((people) => {
        if (!cancelled) setResults(people);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSettledSearchKey(searchKey);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, search, selectedPerson, searchKey]);

  const submit = async (personId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await addToRoster(orgId, teamSeasonId, personId, role, jerseyNumber.trim() || undefined);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to roster');
      setSubmitting(false);
    }
  };

  const handleAddExisting = () => {
    if (!selectedPerson) return;
    void submit(selectedPerson.id);
  };

  const handleQuickCreate = async () => {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) return;
    setSubmitting(true);
    setError(null);
    try {
      const person = await createPerson(orgId, { first_name: first, last_name: last });
      await submit(person.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create person');
      setSubmitting(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={[styles.panel, { borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold">Add to roster</ThemedText>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeTapTarget}>
          <ThemedText type="small" themeColor="textSecondary">
            Close
          </ThemedText>
        </Pressable>
      </View>

      {!selectedPerson && (
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Search existing people
          </ThemedText>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="First or last name"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          {searching && <ActivityIndicator />}
          {!searching &&
            results.map((person) => (
              <Pressable key={person.id} onPress={() => setSelectedPerson(person)} hitSlop={4}>
                <ThemedView
                  type="backgroundSelected"
                  style={[styles.resultRow, { borderColor: theme.border }]}>
                  <ThemedText type="small">
                    {person.first_name} {person.last_name}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          {!searching && search.trim() && results.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No matches. Create a new person below.
            </ThemedText>
          )}

          <View style={styles.divider} />

          <ThemedText type="small" themeColor="textSecondary">
            Or create a new person
          </ThemedText>
          <View style={styles.nameRow}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, styles.nameInput, { color: theme.text, borderColor: theme.border }]}
            />
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, styles.nameInput, { color: theme.text, borderColor: theme.border }]}
            />
          </View>
        </View>
      )}

      {selectedPerson && (
        <View style={styles.section}>
          <ThemedText type="small">
            Selected: {selectedPerson.first_name} {selectedPerson.last_name}
          </ThemedText>
          <Pressable
            onPress={() => {
              // Clear the settled key too so deselecting shows the search
              // spinner while the (re-run) fetch is in flight, as before.
              setSettledSearchKey(null);
              setSelectedPerson(null);
            }}
            hitSlop={8}>
            <ThemedText type="link" themeColor="textSecondary">
              Change person
            </ThemedText>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Role
        </ThemedText>
        <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={setRole} />
      </View>

      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Jersey number (optional)
        </ThemedText>
        <TextInput
          value={jerseyNumber}
          onChangeText={setJerseyNumber}
          placeholder="e.g. 23"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      )}

      <PrimaryButton
        label={submitting ? 'Adding…' : 'Add to roster'}
        onPress={selectedPerson ? handleAddExisting : handleQuickCreate}
        disabled={submitting || (!selectedPerson && (!firstName.trim() || !lastName.trim()))}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeTapTarget: {
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
    fontSize: 14,
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  nameInput: {
    flex: 1,
  },
  resultRow: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  divider: {
    height: Spacing.two,
  },
});
