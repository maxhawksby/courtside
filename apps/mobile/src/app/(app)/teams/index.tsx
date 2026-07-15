import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TeamListRow } from '@/features/teams/components/team-list-row';
import { useTheme } from '@/hooks/use-theme';
import { listTeams, type TeamWithDivision } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

const NO_DIVISION_LABEL = 'No division';

// Entrance cascade (DESIGN.md §4: one orchestrated entrance per screen).
// No motion tokens exist yet — flagged in DESIGN.md §5.
const ENTRANCE_STAGGER_MS = 40;
const ENTRANCE_DURATION_MS = 250;
const ENTRANCE_STAGGER_CAP = 12;

function groupByDivision(teams: TeamWithDivision[]): { label: string; teams: TeamWithDivision[] }[] {
  const groups = new Map<string, { label: string; teams: TeamWithDivision[] }>();
  for (const team of teams) {
    const key = team.divisions?.id ?? '__none__';
    const label = team.divisions?.name ?? NO_DIVISION_LABEL;
    if (!groups.has(key)) groups.set(key, { label, teams: [] });
    groups.get(key)!.teams.push(team);
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.label === NO_DIVISION_LABEL) return 1;
    if (b.label === NO_DIVISION_LABEL) return -1;
    return a.label.localeCompare(b.label);
  });
}

export default function TeamsIndexScreen() {
  const theme = useTheme();
  const { activeOrg, loading: orgLoading } = useOrg();
  // Rows are stored with the org they were fetched for, so a stale list can
  // never render under another org's screen (it derives to [] on mismatch).
  const [teamsState, setTeamsState] = useState<{ orgId: string; rows: TeamWithDivision[] } | null>(
    null,
  );
  // Same semantics as org-context's loading (decision 2026-07-13-p14), screen-local:
  // the spinner shows only until the first fetch for the active org settles. Refocus
  // and filter refetches update the visible list in place — no flash.
  const [settledOrgId, setSettledOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // Retry re-runs the focused effect below (its only fetch path), so every
  // request is cancellation-guarded; bumping the nonce cancels any in-flight one.
  const [reloadNonce, setReloadNonce] = useState(0);

  // Fetch on focus so teams created on pushed screens appear when the user
  // navigates back (Stack keeps this screen mounted, so a mount-only effect
  // would show a stale list). Cancellation per the house idiom
  // (org-context.tsx): a superseded request must not commit any state.
  useFocusEffect(
    useCallback(() => {
      if (!activeOrg) return;
      let cancelled = false;
      const orgId = activeOrg.id;
      listTeams(orgId, { includeArchived: showArchived })
        .then((rows) => {
          if (cancelled) return;
          setTeamsState({ orgId, rows });
          setError(null);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : 'Could not load teams');
        })
        .finally(() => {
          if (cancelled) return;
          // Also clears any retry-in-flight flag: an error card only renders
          // after a request settles, so `retrying` can never be stuck true.
          setSettledOrgId(orgId);
          setRetrying(false);
        });
      return () => {
        cancelled = true;
      };
      // reloadNonce is a deliberate re-run trigger (retry), never read in the body.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOrg, showArchived, reloadNonce]),
  );

  if (orgLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          Select or create an organization to manage teams.
        </ThemedText>
      </ThemedView>
    );
  }

  const loading = settledOrgId !== activeOrg.id;
  const teams = teamsState?.orgId === activeOrg.id ? teamsState.rows : [];
  const groups = groupByDivision(teams);
  // Running row offset per group, computed up front so cascade delays derive
  // from map indices instead of a counter mutated during JSX evaluation.
  let rowsBefore = 0;
  const groupOffsets = groups.map((group) => {
    const offset = rowsBefore;
    rowsBefore += group.teams.length;
    return offset;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Teams</ThemedText>
          <PrimaryButton label="New team" onPress={() => router.push('/(app)/teams/new')} />
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        )}

        {!loading && error && (
          <ThemedView
            type="backgroundElement"
            style={[styles.errorCard, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              Couldn&apos;t load teams
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
            <PrimaryButton
              label={retrying ? 'Trying again…' : 'Try again'}
              disabled={retrying}
              onPress={() => {
                setRetrying(true);
                setReloadNonce((n) => n + 1);
              }}
            />
          </ThemedView>
        )}

        {!loading && !error && teams.length === 0 && (
          <EmptyState
            title={showArchived ? 'No teams yet, active or archived' : 'The season starts here'}
            body={
              showArchived
                ? 'When a team wraps its season you can archive it, and it will show up here.'
                : 'Create your first team, then build the roster, schedule games, and keep every family in the loop.'
            }
          />
        )}

        {/* A failed same-org refetch keeps the last-known list visible below the
            error card; cross-org staleness is impossible (`teams` derives to []). */}
        {!loading &&
          teams.length > 0 &&
          groups.map((group, groupIndex) => (
            <View key={group.label} style={styles.group}>
              <ThemedText type="small" themeColor="textSecondary">
                {group.label}
              </ThemedText>
              <View style={styles.groupRows}>
                {group.teams.map((team, rowIndex) => (
                  <Animated.View
                    key={team.id}
                    entering={FadeInDown.delay(
                      Math.min(groupOffsets[groupIndex] + rowIndex, ENTRANCE_STAGGER_CAP) *
                        ENTRANCE_STAGGER_MS,
                    ).duration(ENTRANCE_DURATION_MS)}>
                    <TeamListRow
                      team={team}
                      onPress={() => router.push(`/(app)/teams/${team.id}`)}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          ))}

        {!loading && !error && (
          <Pressable onPress={() => setShowArchived((v) => !v)} hitSlop={12}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.archivedToggle}>
              {showArchived ? 'Hide archived teams' : 'Show archived teams'}
            </ThemedText>
          </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  errorCard: {
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    alignItems: 'flex-start',
  },
  group: {
    gap: Spacing.two,
  },
  groupRows: {
    gap: Spacing.two,
  },
  archivedToggle: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
  },
});
