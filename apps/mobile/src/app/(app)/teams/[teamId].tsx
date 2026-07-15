import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { AddToRosterPanel } from '@/features/teams/components/add-to-roster-panel';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { buildIcs } from '@/features/events/ics';
import { shareIcs } from '@/features/events/share-ics';
import { RosterRow } from '@/features/teams/components/roster-row';
import { useTheme } from '@/hooks/use-theme';
import {
  archiveTeam,
  createSeason,
  createTeamSeason,
  getRoster,
  listEvents,
  listMyRoles,
  listSeasons,
  listTeams,
  listTeamSeasons,
  unarchiveTeam,
  type RosterEntry,
  type TeamWithDivision,
} from '@/lib/data';
import { useOrg } from '@/lib/org-context';
import type { EventRow } from '@courtside/shared';

function scheduleFileName(teamName: string): string {
  const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'team';
  return `${slug}-schedule.ics`;
}

const DEFAULT_SEASON_NAME = '2026-27';

export default function TeamDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { activeOrg } = useOrg();

  const [team, setTeam] = useState<TeamWithDivision | null>(null);
  const [teamSeasonId, setTeamSeasonId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  // UI gate only — RLS `teams_update` is the real check on archive/unarchive.
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrg || !teamId) return;
    setLoading(true);
    setError(null);
    try {
      const [teams, myRoles] = await Promise.all([
        // includeArchived so an archived team stays viewable (and unarchivable)
        // here even though default lists hide it.
        listTeams(activeOrg.id, { includeArchived: true }),
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

      const [rosterRows, eventRows] = await Promise.all([
        getRoster(teamSeason.id),
        listEvents(activeOrg.id, { teamSeasonId: teamSeason.id, from: new Date().toISOString() }),
      ]);
      setRoster(rosterRows);
      setUpcomingEvents(eventRows);
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

  const doArchive = useCallback(async () => {
    if (!teamId) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      await archiveTeam(teamId);
      router.back(); // Teams list reloads on focus; archived team drops out of the default list.
    } catch (e) {
      setArchiveError(e instanceof Error ? e.message : 'Could not archive team');
      setArchiveBusy(false);
    }
  }, [teamId, router]);

  const handleExportSchedule = useCallback(async () => {
    if (!team || upcomingEvents.length === 0) return;
    setExportBusy(true);
    setExportError(null);
    try {
      const ics = buildIcs(upcomingEvents, `${team.name} Schedule`);
      await shareIcs(ics, scheduleFileName(team.name));
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not export the schedule');
    } finally {
      setExportBusy(false);
    }
  }, [team, upcomingEvents]);

  const handleArchive = useCallback(() => {
    if (!team) return;
    Alert.alert(
      'Archive team',
      `Archive ${team.name}? Archiving hides the team from team lists, but its roster, schedule, and chat history are all preserved. No data is deleted, and you can unarchive it at any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', onPress: () => void doArchive() },
      ],
    );
  }, [team, doArchive]);

  const doUnarchive = useCallback(async () => {
    if (!teamId) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      await unarchiveTeam(teamId);
      await load(); // Stay on the screen; banner clears once archived_at is null again.
    } catch (e) {
      setArchiveError(e instanceof Error ? e.message : 'Could not unarchive team');
    } finally {
      setArchiveBusy(false);
    }
  }, [teamId, load]);

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
        {error ? <PrimaryButton label="Try again" onPress={() => void load()} /> : null}
      </ThemedView>
    );
  }

  const archived = team.archived_at !== null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{team.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {team.divisions?.name ?? 'No division'}
          </ThemedText>
        </View>

        {archived && (
          <ThemedView
            type="backgroundElement"
            style={[styles.archivedBanner, { borderColor: theme.border }]}>
            <View style={styles.archivedBannerText}>
              <ThemedText type="smallBold">Archived</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Hidden from team lists. The roster, schedule, and chat history are preserved.
              </ThemedText>
            </View>
            {canManageTeam &&
              (archiveBusy ? (
                <ActivityIndicator />
              ) : (
                <PrimaryButton label="Unarchive" onPress={() => void doUnarchive()} />
              ))}
            {archiveError ? (
              <ThemedText type="small" themeColor="textSecondary">
                {archiveError}
              </ThemedText>
            ) : null}
          </ThemedView>
        )}

        <View style={styles.section}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">Schedule</ThemedText>
            {exportBusy ? (
              <ActivityIndicator />
            ) : (
              <PrimaryButton
                label="Export schedule"
                onPress={() => void handleExportSchedule()}
                disabled={upcomingEvents.length === 0}
              />
            )}
          </View>
          {upcomingEvents.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No upcoming games or practices yet — schedule one to export a calendar file.
            </ThemedText>
          )}
          {exportError ? (
            <ThemedText type="small" themeColor="textSecondary">
              {exportError}
            </ThemedText>
          ) : null}
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

        {canManageTeam && !archived && (
          <View style={styles.dangerSection}>
            <Pressable
              onPress={handleArchive}
              disabled={archiveBusy}
              hitSlop={12}
              style={styles.archiveTapTarget}>
              {archiveBusy ? (
                <ActivityIndicator />
              ) : (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  Archive team
                </ThemedText>
              )}
            </Pressable>
            {archiveError ? (
              <ThemedText type="small" themeColor="textSecondary">
                {archiveError}
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
  archiveTapTarget: {
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  archivedBanner: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  archivedBannerText: {
    gap: Spacing.one,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
