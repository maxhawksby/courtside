import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HouseholdWithMembers } from '@/lib/data';

type HouseholdCardProps = {
  household: HouseholdWithMembers;
  onPress: () => void;
};

/** Household summary card — index list row. Owner members get a star prefix. */
export function HouseholdCard({ household, onPress }: HouseholdCardProps) {
  const theme = useTheme();
  const members = household.household_members.filter((m) => m.persons);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <ThemedText type="default">{household.name}</ThemedText>
        {members.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No members yet
          </ThemedText>
        ) : (
          <View style={styles.chipRow}>
            {members.map((member) => (
              <ThemedView key={member.person_id} type="backgroundSelected" style={styles.chip}>
                <ThemedText type="small">
                  {member.is_owner ? '★ ' : ''}
                  {member.persons!.first_name} {member.persons!.last_name}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: TouchTarget.minimum,
  },
  pressed: {
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
