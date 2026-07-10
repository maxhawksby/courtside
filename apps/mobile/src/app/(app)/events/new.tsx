import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TeamPicker, type TeamOption } from '@/features/events/components/team-picker';
import { createEvent, listSeasons, listTeamSeasons, listTeams } from '@/lib/data';
import { useOrg } from '@/lib/org-context';
import { useTheme } from '@/hooks/use-theme';
import type { EventType } from '@courtside/shared';

const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'game', label: 'Game' },
  { value: 'practice', label: 'Practice' },
  { value: 'general', label: 'General' },
];

/** Parses a user-typed ISO 8601 date/time string; null on empty or unparsable input. */
function parseIso(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function NewEventScreen() {
  const { activeOrg } = useOrg();
  const theme = useTheme();

  const [type, setType] = useState<EventType>('game');
  const [title, setTitle] = useState('');
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamSeasonId, setTeamSeasonId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [arrivalAt, setArrivalAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    if (!activeOrg) return;
    setLoadingTeams(true);
    try {
      const seasons = await listSeasons(activeOrg.id);
      if (seasons.length === 0) {
        setTeamOptions([]);
        return;
      }
      // listSeasons orders newest-first; the current season is the first row.
      const season = seasons[0];
      const [teamSeasons, teams] = await Promise.all([
        listTeamSeasons(activeOrg.id, season.id),
        listTeams(activeOrg.id),
      ]);
      const teamsById = new Map(teams.map((t) => [t.id, t]));
      const options = teamSeasons
        .map((ts) => {
          const team = teamsById.get(ts.team_id);
          return team ? { teamSeasonId: ts.id, teamName: team.name } : null;
        })
        .filter((o): o is TeamOption => o !== null)
        .sort((a, b) => a.teamName.localeCompare(b.teamName));
      setTeamOptions(options);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load teams');
    } finally {
      setLoadingTeams(false);
    }
  }, [activeOrg]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const handleSubmit = async () => {
    if (!activeOrg) return;

    const startsDate = parseIso(startsAt);
    if (!startsDate) {
      setError('Enter a valid start date/time, e.g. 2026-07-15T18:00');
      return;
    }

    let arrivalDate: Date | null = null;
    if (arrivalAt.trim()) {
      arrivalDate = parseIso(arrivalAt);
      if (!arrivalDate) {
        setError('Enter a valid arrival date/time, e.g. 2026-07-15T17:30');
        return;
      }
    }

    let endsDate: Date | null = null;
    if (endsAt.trim()) {
      endsDate = parseIso(endsAt);
      if (!endsDate) {
        setError('Enter a valid end date/time, e.g. 2026-07-15T20:00');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      await createEvent(activeOrg.id, {
        type,
        title: title.trim() || null,
        team_season_id: teamSeasonId,
        starts_at: startsDate.toISOString(),
        arrival_at: arrivalDate ? arrivalDate.toISOString() : null,
        ends_at: endsDate ? endsDate.toISOString() : null,
        location: location.trim() || null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create event');
      setSubmitting(false);
    }
  };

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          Select or create an organization first.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Type
          </ThemedText>
          <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Title (optional)
          </ThemedText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. vs. Riverside Hawks"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Team (optional)
          </ThemedText>
          {loadingTeams ? (
            <ActivityIndicator />
          ) : teamOptions.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No teams set up for the current season yet.
            </ThemedText>
          ) : (
            <TeamPicker
              options={teamOptions}
              selectedTeamSeasonId={teamSeasonId}
              onSelect={setTeamSeasonId}
            />
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Starts at (required)
          </ThemedText>
          <TextInput
            value={startsAt}
            onChangeText={setStartsAt}
            placeholder="2026-07-15T18:00"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Arrival time (optional)
          </ThemedText>
          <TextInput
            value={arrivalAt}
            onChangeText={setArrivalAt}
            placeholder="2026-07-15T17:30"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Ends at (optional)
          </ThemedText>
          <TextInput
            value={endsAt}
            onChangeText={setEndsAt}
            placeholder="2026-07-15T20:00"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Location (optional)
          </ThemedText>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Main Gym"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Notes (optional)
          </ThemedText>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything the team should know"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.input, styles.notesInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
        </View>

        {error && (
          <ThemedText type="small" themeColor="text">
            {error}
          </ThemedText>
        )}

        <PrimaryButton
          label={submitting ? 'Creating…' : 'Create event'}
          onPress={handleSubmit}
          disabled={submitting || !startsAt.trim()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
