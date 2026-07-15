import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EventListRow } from '@/features/events/components/event-list-row';
import { dayKey, formatDayHeader } from '@/features/events/format';
import { useTheme } from '@/hooks/use-theme';
import { listEvents } from '@/lib/data';
import { useOrg } from '@/lib/org-context';
import type { EventRow, EventType } from '@courtside/shared';

// Entrance cascade (DESIGN.md §4: one orchestrated entrance per screen).
// No motion tokens exist yet — flagged in DESIGN.md §5.
const ENTRANCE_STAGGER_MS = 40;
const ENTRANCE_DURATION_MS = 250;
const ENTRANCE_STAGGER_CAP = 12;

type TypeFilter = 'all' | Extract<EventType, 'game' | 'practice'>;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'game', label: 'Games' },
  { value: 'practice', label: 'Practices' },
];

function groupByDay(events: EventRow[]): { key: string; label: string; events: EventRow[] }[] {
  const groups = new Map<string, { key: string; label: string; events: EventRow[] }>();
  for (const event of events) {
    const key = dayKey(event.starts_at);
    if (!groups.has(key)) {
      groups.set(key, { key, label: formatDayHeader(event.starts_at), events: [] });
    }
    groups.get(key)!.events.push(event);
  }
  return Array.from(groups.values());
}

export default function EventsIndexScreen() {
  const theme = useTheme();
  const { activeOrg, loading: orgLoading } = useOrg();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setError(null);
    try {
      const rows = await listEvents(activeOrg.id, { from: new Date().toISOString() });
      setEvents(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load events');
    }
  }, [activeOrg]);

  // Reload whenever the screen gains focus so events created on pushed
  // screens appear when the user navigates back (Stack keeps this screen
  // mounted, so a mount-only effect would show a stale list).
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

  const filtered = useMemo(
    () => (typeFilter === 'all' ? events : events.filter((e) => e.type === typeFilter)),
    [events, typeFilter],
  );
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  // Running row offset per group, computed up front so cascade delays derive
  // from map indices instead of a counter mutated during JSX evaluation.
  let rowsBefore = 0;
  const groupOffsets = groups.map((group) => {
    const offset = rowsBefore;
    rowsBefore += group.events.length;
    return offset;
  });

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
          Select or create an organization to view events.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Events</ThemedText>
          <PrimaryButton label="New event" onPress={() => router.push('/(app)/events/new')} />
        </View>

        <SegmentedControl options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />

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
              Couldn&apos;t load events
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
            <PrimaryButton label="Try again" onPress={() => void load()} />
          </ThemedView>
        )}

        {!loading && !error && groups.length === 0 && (
          <EmptyState
            title="No upcoming events"
            body="Schedule a game, practice, or general event to start collecting RSVPs."
          />
        )}

        {!loading &&
          !error &&
          groups.map((group, groupIndex) => (
            <View key={group.key} style={styles.group}>
              <ThemedText type="small" themeColor="textSecondary">
                {group.label}
              </ThemedText>
              <View style={styles.groupRows}>
                {group.events.map((event, rowIndex) => (
                  <Animated.View
                    key={event.id}
                    entering={FadeInDown.delay(
                      Math.min(groupOffsets[groupIndex] + rowIndex, ENTRANCE_STAGGER_CAP) *
                        ENTRANCE_STAGGER_MS,
                    ).duration(ENTRANCE_DURATION_MS)}>
                    <EventListRow
                      event={event}
                      onPress={() => router.push(`/(app)/events/${event.id}`)}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          ))}
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
});
