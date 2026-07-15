import { Pressable, StyleSheet, View } from 'react-native';
import type { HouseholdMemberRow, PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MemberRowProps = {
  member: HouseholdMemberRow & { persons: PersonRow | null };
  onRemove: () => void;
  removing?: boolean;
};

export function MemberRow({ member, onRemove, removing }: MemberRowProps) {
  const theme = useTheme();
  const name = member.persons
    ? `${member.persons.first_name} ${member.persons.last_name}`
    : 'Unknown person';

  return (
    <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
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
      <Pressable onPress={onRemove} disabled={removing} hitSlop={12} style={styles.tapTarget}>
        <ThemedText type="link" style={{ color: theme.danger }}>
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
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: TouchTarget.minimum,
  },
  tapTarget: {
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  info: {
    gap: Spacing.half,
  },
});
