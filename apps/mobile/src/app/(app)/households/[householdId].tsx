import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getHousehold, removeHouseholdMember, type HouseholdWithMembers } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

import { AddMemberSection } from '@/features/households/add-member-section';
import { MemberRow } from '@/features/households/member-row';

export default function HouseholdDetailScreen() {
  const params = useLocalSearchParams<{ householdId: string }>();
  const householdId = Array.isArray(params.householdId) ? params.householdId[0] : params.householdId;
  const { activeOrg } = useOrg();

  const [household, setHousehold] = useState<HouseholdWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    setError(null);
    try {
      const row = await getHousehold(householdId);
      setHousehold(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load household');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  // Focus-based reload: members added/removed here reflect immediately, and
  // this also catches changes made if the user backs out mid-edit.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const doRemove = useCallback(
    async (personId: string) => {
      if (!householdId) return;
      setRemovingId(personId);
      setRemoveError(null);
      try {
        await removeHouseholdMember(householdId, personId);
        await load();
      } catch (e) {
        setRemoveError(e instanceof Error ? e.message : 'Could not remove member');
      } finally {
        setRemovingId(null);
      }
    },
    [householdId, load],
  );

  const handleRemove = (personId: string, name: string) => {
    Alert.alert('Remove member', `Remove ${name} from this household?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void doRemove(personId),
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Household' }} />
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !household) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Household' }} />
        <ThemedText type="small" themeColor="textSecondary">
          {error ?? 'Household not found'}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: household.name }} />
        <ThemedText themeColor="textSecondary">No organization selected.</ThemedText>
      </ThemedView>
    );
  }

  const members = household.household_members.filter((m) => m.persons);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: household.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{household.name}</ThemedText>

        <View style={styles.section}>
          <ThemedText type="smallBold">Members</ThemedText>
          {members.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No members yet.
            </ThemedText>
          ) : (
            <View style={styles.memberRows}>
              {members.map((member) => (
                <MemberRow
                  key={member.person_id}
                  member={member}
                  removing={removingId === member.person_id}
                  onRemove={() =>
                    handleRemove(
                      member.person_id,
                      `${member.persons!.first_name} ${member.persons!.last_name}`,
                    )
                  }
                />
              ))}
            </View>
          )}
          {removeError ? (
            <ThemedText type="small" themeColor="text">
              {removeError}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Add member</ThemedText>
          <AddMemberSection
            orgId={activeOrg.id}
            householdId={household.id}
            existingMemberIds={members.map((m) => m.person_id)}
            onAdded={() => void load()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  section: {
    gap: Spacing.two,
  },
  memberRows: {
    gap: Spacing.two,
  },
});
