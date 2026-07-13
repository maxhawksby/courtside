import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { AddToRosterPanel } from '@/features/teams/components/add-to-roster-panel';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { RosterRow } from '@/features/teams/components/roster-row';
import {
  createSeason,
  createTeamSeason,
  deleteTeam,
  getRoster,
  listMyRoles,
  listSeasons,
  listTeams,
  listTeamSeasons,
  type RosterEntry,
  type TeamWithDivision,
} from '@/lib/data';
import { useOrg } from '@/lib/org-context';

const DEFAULT_SEASON_NAME = '2026-27';

export default function TeamDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();
  const { activeOrg } = useOrg();

  const [team, setTeam] = useState<TeamWithDivision | null>(null);
  const [teamSeasonId, setTeamSeasonId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  // UI gate only — RLS `teams_write` is the real check on delete.
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrg || !teamId) return;
    setLoading(true);
    setError(null);
    try {
      const [teams, myRoles] = await Promise.all([
        listTeams(activeOrg.id),
        listMyRoles(activeOrg.id),
      ]);
      setCanManageTeam(myRoles.some((r) => r.role === 'owner' || r.role === 'division_admin'));
      const found = teams.find((t) => t.id === teamId) ?? null;
      setTeam(found);
      if (!found) {
        setError('Team not found');
        return;
      }

      let seasons = await listSeasons(activeOrg.id);
      if (seasons.length === 0) {
        const created = await createSeason(activeOrg.id, DEFAULT_SEASON_NAME);
        seasons = [created];
      }
      const season = seasons[0];

      let teamSeasons = await listTeamSeasons(activeOrg.id, season.id);
      let teamSeason = teamSeasons.find((ts) => ts.team_id === teamId) ?? null;
      if (!teamSeason) {
        try {
          teamSeason = await createTeamSeason(activeOrg.id, teamId, season.id);
        } catch {
          // Likely a unique-violation race with another client creating the
          // same team_season concurrently — re-fetch and use the winner.
          teamSeasons = await listTeamSeasons(activeOrg.id, season.id);
          teamSeason = teamSeasons.find((ts) => ts.team_id === teamId) ?? null;
          if (!teamSeason) throw new Error('Could not set up this season for the team');
        }
      }
      setTeamSeasonId(teamSeason.id);

      const rosterRows = await getRoster(teamSeason.id);
      setRoster(rosterRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load team');
    } finally {
      setLoading(false);
    }
  }, [activeOrg, teamId]);

  // Focus-based reload: roster changes made on pushed screens show up on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refreshRoster = useCallback(async () => {
    if (!teamSeasonId) return;
    const rows = await getRoster(teamSeasonId);
    setRoster(rows);
    setShowAddPanel(false);
  }, [teamSeasonId]);

  const doDelete = useCallback(async () => {
    if (!teamId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTeam(teamId);
      router.back(); // Teams list reloads on focus.
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete team');
      setDeleting(false);
    }
  }, [teamId, router]);

  const handleDelete = useCallback(() => {
    if (!team) return;
    Alert.alert(
      'Delete team',
      `Permanently delete ${team.name}? This also removes its seasons, rosters, schedule, games, and team chat history. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
      ],
    );
  }, [team, doDelete]);

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          Select or create an organization first.
        </ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !team) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          {error ?? 'Team not found'}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{team.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {team.divisions?.name ?? 'No division'}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">Roster</ThemedText>
            {!showAddPanel && (
              <PrimaryButton label="Add to roster" onPress={() => setShowAddPanel(true)} />
            )}
          </View>

          {roster.length === 0 && !showAddPanel && (
            <EmptyState
              title="No one on the roster yet"
              body="Add players, coaches, or scorekeepers to this team's season roster."
            />
          )}

          <View style={styles.rosterRows}>
            {roster.map((entry) => (
              <RosterRow key={entry.id} entry={entry} />
            ))}
          </View>

          {showAddPanel && teamSeasonId && (
            <AddToRosterPanel
              orgId={activeOrg.id}
              teamSeasonId={teamSeasonId}
              onAdded={() => void refreshRoster()}
              onClose={() => setShowAddPanel(false)}
            />
          )}
        </View>

        {canManageTeam && (
          <View style={styles.dangerSection}>
            <Pressable onPress={handleDelete} disabled={deleting} hitSlop={8}>
              {deleting ? (
                <ActivityIndicator />
              ) : (
                <ThemedText type="small" style={styles.deleteText}>
                  Delete team
                </ThemedText>
              )}
            </Pressable>
            {deleteError ? (
              <ThemedText type="small" themeColor="textSecondary">
                {deleteError}
              </ThemedText>
            ) : null}
          </View>
        )}
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
  header: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rosterRows: {
    gap: Spacing.two,
  },
  dangerSection: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  deleteText: {
    color: Brand.danger,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
