import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing } from '@/constants/theme';
import { RsvpAnswerRow } from '@/features/events/components/rsvp-answer-row';
import { EVENT_TYPE_LABELS, formatDateTime } from '@/features/events/format';
import { useTheme } from '@/hooks/use-theme';
import {
  clearRsvp,
  getEvent,
  getMyProfile,
  listGuardianshipsFor,
  listRsvps,
  setRsvp,
  type RsvpWithPerson,
} from '@/lib/data';
import { useOrg } from '@/lib/org-context';
import type { EventRow, RsvpStatus } from '@courtside/shared';

type AnswerablePerson = { id: string; name: string };

function personName(person: { first_name: string; last_name: string } | null): string {
  return person ? `${person.first_name} ${person.last_name}` : 'Unknown';
}

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const theme = useTheme();
  const { activeOrg } = useOrg();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [rsvps, setRsvps] = useState<RsvpWithPerson[]>([]);
  const [answerablePersons, setAnswerablePersons] = useState<AnswerablePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPersonId, setPendingPersonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrg || !eventId) return;
    setLoading(true);
    setError(null);
    try {
      const [eventRow, rsvpRows, myProfile] = await Promise.all([
        getEvent(eventId),
        listRsvps(eventId),
        getMyProfile(activeOrg.id),
      ]);
      setEvent(eventRow);
      setRsvps(rsvpRows);

      const myPerson = myProfile?.persons ?? null;
      const answerable: AnswerablePerson[] = [];
      if (myPerson) {
        answerable.push({ id: myPerson.id, name: personName(myPerson) });
        const guardianships = await listGuardianshipsFor(myPerson.id);
        for (const g of guardianships) {
          if (g.guardian_person_id === myPerson.id && g.player) {
            answerable.push({ id: g.player.id, name: personName(g.player) });
          }
        }
      }
      setAnswerablePersons(answerable);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load event');
    } finally {
      setLoading(false);
    }
  }, [activeOrg, eventId]);

  // Focus-based reload: RSVP changes made here or elsewhere show up on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const statusFor = (personId: string): RsvpStatus => {
    const row = rsvps.find((r) => r.person_id === personId);
    return row?.status ?? 'unanswered';
  };

  const handleSetStatus = async (personId: string, status: 'going' | 'not_going') => {
    if (!activeOrg || !event) return;
    setPendingPersonId(personId);
    setError(null);
    try {
      const current = statusFor(personId);
      if (current === status) {
        await clearRsvp(event.id, personId);
      } else {
        await setRsvp(activeOrg.id, event.id, personId, status);
      }
      const rows = await listRsvps(event.id);
      setRsvps(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update RSVP');
    } finally {
      setPendingPersonId(null);
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

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Event' }} />
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !event) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Event' }} />
        <ThemedText type="small" themeColor="textSecondary">
          {error ?? 'Event not found'}
        </ThemedText>
        {error ? <PrimaryButton label="Try again" onPress={() => void load()} /> : null}
      </ThemedView>
    );
  }

  const going = rsvps.filter((r) => r.status === 'going');
  const notGoing = rsvps.filter((r) => r.status === 'not_going');

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: event.title ?? EVENT_TYPE_LABELS[event.type] }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={[styles.headerCard, { borderColor: theme.border }]}>
          <ThemedView type="backgroundSelected" style={styles.badge}>
            <ThemedText type="small">{EVENT_TYPE_LABELS[event.type]}</ThemedText>
          </ThemedView>
          <ThemedText type="subtitle">{event.title ?? EVENT_TYPE_LABELS[event.type]}</ThemedText>

          <View style={styles.timesBlock}>
            {event.arrival_at && (
              <ThemedText type="small" themeColor="textSecondary">
                Arrive: {formatDateTime(event.arrival_at)}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              Starts: {formatDateTime(event.starts_at)}
            </ThemedText>
            {event.ends_at && (
              <ThemedText type="small" themeColor="textSecondary">
                Ends: {formatDateTime(event.ends_at)}
              </ThemedText>
            )}
          </View>

          {event.location && (
            <ThemedText type="small" themeColor="textSecondary">
              {event.location}
            </ThemedText>
          )}
          {event.notes && <ThemedText type="small">{event.notes}</ThemedText>}
        </ThemedView>

        <View style={styles.section}>
          <ThemedText type="smallBold">Your RSVP</ThemedText>
          {answerablePersons.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No linked person to RSVP for in this organization.
            </ThemedText>
          ) : (
            <View style={styles.answerRows}>
              {answerablePersons.map((person) => (
                <RsvpAnswerRow
                  key={person.id}
                  name={person.name}
                  status={statusFor(person.id)}
                  disabled={pendingPersonId === person.id}
                  onSetGoing={() => void handleSetStatus(person.id, 'going')}
                  onSetNotGoing={() => void handleSetStatus(person.id, 'not_going')}
                />
              ))}
            </View>
          )}
          {error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Attendees</ThemedText>

          <View style={styles.attendeeGroup}>
            <ThemedText type="small" themeColor="success">
              Going ({going.length})
            </ThemedText>
            {going.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No one yet.
              </ThemedText>
            ) : (
              going.map((r) => (
                <ThemedText key={r.id} type="small">
                  {personName(r.persons)}
                </ThemedText>
              ))
            )}
          </View>

          <View style={styles.attendeeGroup}>
            <ThemedText type="small" themeColor="danger">
              Not going ({notGoing.length})
            </ThemedText>
            {notGoing.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No one yet.
              </ThemedText>
            ) : (
              notGoing.map((r) => (
                <ThemedText key={r.id} type="small">
                  {personName(r.persons)}
                </ThemedText>
              ))
            )}
          </View>
        </View>
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
  headerCard: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  timesBlock: {
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.three,
  },
  answerRows: {
    gap: Spacing.three,
  },
  attendeeGroup: {
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
