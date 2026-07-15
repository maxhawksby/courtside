import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addHouseholdMember } from '@/lib/data';

import { PersonPicker } from '@/features/directory/person-picker';

type AddMemberSectionProps = {
  orgId: string;
  householdId: string;
  /** Person ids already in the household — excluded from picker results. */
  existingMemberIds: string[];
  onAdded: () => void;
};

/** Search-or-create picker (reused from directory) plus an owner toggle, wired to addHouseholdMember. */
export function AddMemberSection({
  orgId,
  householdId,
  existingMemberIds,
  onAdded,
}: AddMemberSectionProps) {
  const theme = useTheme();
  const [isOwner, setIsOwner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (person: PersonRow) => {
    setSubmitting(true);
    setError(null);
    try {
      await addHouseholdMember(orgId, householdId, person.id, isOwner);
      setIsOwner(false);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.wrap}>
      <Pressable onPress={() => setIsOwner((v) => !v)} hitSlop={4}>
        <ThemedView
          type={isOwner ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.toggle, { borderColor: theme.border }]}>
          <ThemedText type="small">{isOwner ? '☑' : '☐'} Add as household owner</ThemedText>
        </ThemedView>
      </Pressable>

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      {submitting ? (
        <View style={styles.submitting}>
          <ThemedText type="small" themeColor="textSecondary">
            Adding…
          </ThemedText>
        </View>
      ) : (
        <PersonPicker orgId={orgId} excludeIds={existingMemberIds} onSelect={handleSelect} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  toggle: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  submitting: {
    paddingVertical: Spacing.two,
  },
});
