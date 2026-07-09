import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getPerson, listGuardianshipsFor, type GuardianshipWithPersons } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

import { InviteParentSheet } from '@/features/directory/invite-parent-sheet';
import { LinkGuardianSheet } from '@/features/directory/link-guardian-sheet';

export default function PersonDetailScreen() {
  const params = useLocalSearchParams<{ personId: string }>();
  const personId = Array.isArray(params.personId) ? params.personId[0] : params.personId;
  const router = useRouter();
  const { activeOrg } = useOrg();

  const [person, setPerson] = useState<PersonRow | null>(null);
  const [relationships, setRelationships] = useState<GuardianshipWithPersons[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkVisible, setLinkVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);

  const load = useCallback(async () => {
    if (!personId) return;
    setLoading(true);
    setError(null);
    try {
      const [personRow, rels] = await Promise.all([
        getPerson(personId),
        listGuardianshipsFor(personId),
      ]);
      setPerson(personRow);
      setRelationships(rels);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load person');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  // Focus-based reload: guardian links created on pushed screens appear on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Person' }} />
        <ThemedText themeColor="textSecondary">Loading…</ThemedText>
      </ThemedView>
    );
  }

  if (error || !person) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Person' }} />
        <ThemedText themeColor="textSecondary">{error ?? 'Person not found'}</ThemedText>
      </ThemedView>
    );
  }

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: `${person.first_name} ${person.last_name}` }} />
        <ThemedText themeColor="textSecondary">No organization selected.</ThemedText>
      </ThemedView>
    );
  }

  const guardians = relationships.filter(
    (r) => r.player_person_id === person.id && r.guardian,
  );
  const players = relationships.filter(
    (r) => r.guardian_person_id === person.id && r.player,
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `${person.first_name} ${person.last_name}` }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.headerCard}>
          <ThemedText type="subtitle">
            {person.first_name} {person.last_name}
          </ThemedText>
          {person.email ? (
            <ThemedText themeColor="textSecondary">{person.email}</ThemedText>
          ) : null}
          {person.phone ? (
            <ThemedText themeColor="textSecondary">{person.phone}</ThemedText>
          ) : null}
          {person.date_of_birth ? (
            <ThemedText themeColor="textSecondary">DOB: {person.date_of_birth}</ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.actionsRow}>
          <Pressable onPress={() => setLinkVisible(true)} hitSlop={4}>
            <ThemedText type="linkPrimary">Link guardian</ThemedText>
          </Pressable>
          <Pressable onPress={() => setInviteVisible(true)} hitSlop={4}>
            <ThemedText type="linkPrimary">Invite as parent</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Guardians</ThemedText>
          {guardians.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No guardians linked yet.
            </ThemedText>
          ) : (
            guardians.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/directory/${r.guardian!.id}`)}
                hitSlop={4}>
                <ThemedView type="backgroundElement" style={styles.relRow}>
                  <ThemedText>
                    {r.guardian!.first_name} {r.guardian!.last_name}
                  </ThemedText>
                  {r.relationship ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {r.relationship}
                    </ThemedText>
                  ) : null}
                </ThemedView>
              </Pressable>
            ))
          )}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Players</ThemedText>
          {players.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Not a guardian of anyone yet.
            </ThemedText>
          ) : (
            players.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/directory/${r.player!.id}`)}
                hitSlop={4}>
                <ThemedView type="backgroundElement" style={styles.relRow}>
                  <ThemedText>
                    {r.player!.first_name} {r.player!.last_name}
                  </ThemedText>
                  {r.relationship ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {r.relationship}
                    </ThemedText>
                  ) : null}
                </ThemedView>
              </Pressable>
            ))
          )}
        </ThemedView>
      </ScrollView>

      <LinkGuardianSheet
        visible={linkVisible}
        onClose={() => setLinkVisible(false)}
        orgId={activeOrg.id}
        playerPersonId={person.id}
        onLinked={load}
      />
      <InviteParentSheet
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        orgId={activeOrg.id}
        orgName={activeOrg.name}
        personId={person.id}
        defaultEmail={person.email}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  headerCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.half,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  relRow: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
});
