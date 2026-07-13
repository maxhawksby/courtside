import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TeamListRow } from '@/features/teams/components/team-list-row';
import { listTeams, type TeamWithDivision } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

const NO_DIVISION_LABEL = 'No division';

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
  const { activeOrg, loading: orgLoading } = useOrg();
  const [teams, setTeams] = useState<TeamWithDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listTeams(activeOrg.id, { includeArchived: showArchived });
      setTeams(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load teams');
    } finally {
      setLoading(false);
    }
  }, [activeOrg, showArchived]);

  // Reload whenever the screen gains focus so teams created on pushed
  // screens appear when the user navigates back (Stack keeps this screen
  // mounted, so a mount-only effect would show a stale list).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
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

  const groups = groupByDivision(teams);

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
          <ThemedText type="small" themeColor="text">
            {error}
          </ThemedText>
        )}

        {!loading && !error && teams.length === 0 && (
          <EmptyState
            title={showArchived ? 'No teams' : 'No teams yet'}
            body={
              showArchived
                ? 'This organization has no teams, archived or active.'
                : 'Teams group your players and coaches by season. Create a team to start building a roster, tracking games, and messaging.'
            }
          />
        )}

        {!loading &&
          !error &&
          groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <ThemedText type="small" themeColor="textSecondary">
                {group.label}
              </ThemedText>
              <View style={styles.groupRows}>
                {group.teams.map((team) => (
                  <TeamListRow
                    key={team.id}
                    team={team}
                    onPress={() => router.push(`/(app)/teams/${team.id}`)}
                  />
                ))}
              </View>
            </View>
          ))}

        {!loading && !error && (
          <Pressable onPress={() => setShowArchived((v) => !v)} hitSlop={8}>
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
