import { Pressable, StyleSheet, View } from 'react-native';
import type { HouseholdMemberRow, PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type MemberRowProps = {
  member: HouseholdMemberRow & { persons: PersonRow | null };
  onRemove: () => void;
  removing?: boolean;
};

export function MemberRow({ member, onRemove, removing }: MemberRowProps) {
  const name = member.persons
    ? `${member.persons.first_name} ${member.persons.last_name}`
    : 'Unknown person';

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.info}>
        <ThemedText type="default">
          {member.is_owner ? '★ ' : ''}
          {name}
        </ThemedText>
        {member.is_owner ? (
          <ThemedText type="small" themeColor="textSecondary">
            Owner
          </ThemedText>
        ) : null}
      </View>
      <Pressable onPress={onRemove} disabled={removing} hitSlop={8}>
        <ThemedText type="link" themeColor="textSecondary">
          {removing ? 'Removing…' : 'Remove'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  info: {
    gap: Spacing.half,
  },
});
