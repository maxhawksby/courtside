import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { isMinor } from '@courtside/shared';
import type { PersonRow, PersonSensitiveRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  getEffectiveConsent,
  getPerson,
  getSensitive,
  listGuardianshipsFor,
  type GuardianshipWithPersons,
} from '@/lib/data';
import { useOrg } from '@/lib/org-context';

import { GuardiansSection } from '@/features/directory/person-detail/guardians-section';
import { MediaConsentSection } from '@/features/directory/person-detail/media-consent-section';
import { PersonHeader } from '@/features/directory/person-detail/person-header';
import { SensitiveSection } from '@/features/directory/person-detail/sensitive-section';

export default function PersonDetailScreen() {
  const params = useLocalSearchParams<{ personId: string }>();
  const personId = Array.isArray(params.personId) ? params.personId[0] : params.personId;
  const { activeOrg } = useOrg();

  const [person, setPerson] = useState<PersonRow | null>(null);
  const [relationships, setRelationships] = useState<GuardianshipWithPersons[]>([]);
  const [consent, setEffectiveConsent] = useState(false);
  const [sensitive, setSensitive] = useState<PersonSensitiveRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Media consent only applies to minors; canRenderMedia treats adults
      // as always renderable regardless of this value.
      setEffectiveConsent(isMinor(personRow.date_of_birth) ? await getEffectiveConsent(personId) : false);

      // Sensitive info fails closed: getSensitive's contract treats "no
      // record yet" and "RLS is hiding it" identically (both resolve to
      // null), and any read error is caught here too. Either way we hide the
      // section rather than show an editable form or an error state that
      // would confirm to an unauthorized viewer that it exists for this
      // person's child.
      try {
        setSensitive(await getSensitive(personId));
      } catch {
        setSensitive(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load person');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  // Focus-based reload: guardian links, consent changes, and sensitive-info
  // edits made on this screen or pushed screens appear on return.
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

  const minor = isMinor(person.date_of_birth);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `${person.first_name} ${person.last_name}` }} />
      <ScrollView contentContainerStyle={styles.content}>
        <PersonHeader person={person} consent={consent} />

        <GuardiansSection
          orgId={activeOrg.id}
          orgName={activeOrg.name}
          person={{ id: person.id, email: person.email }}
          relationships={relationships}
          onChanged={load}
        />

        {minor ? (
          <MediaConsentSection
            orgId={activeOrg.id}
            playerPersonId={person.id}
            consent={consent}
            onConsentChange={setEffectiveConsent}
          />
        ) : null}

        {sensitive ? (
          <SensitiveSection
            orgId={activeOrg.id}
            personId={person.id}
            sensitive={sensitive}
            onSaved={setSensitive}
          />
        ) : null}
      </ScrollView>
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
});
