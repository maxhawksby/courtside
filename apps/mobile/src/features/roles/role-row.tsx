import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { OrgRoleWithPerson } from '@/lib/data';

import { ROLE_LABELS } from './role-labels';

type RoleRowProps = {
  role: OrgRoleWithPerson;
  scopeLabel: string;
  onRevoke: () => void;
};

/** Owner rows have no revoke affordance — de-owning the org is out of scope (see roles.ts). */
export function RoleRow({ role, scopeLabel, onRevoke }: RoleRowProps) {
  const person = role.user_profiles?.persons ?? null;
  const name = person ? `${person.first_name} ${person.last_name}` : 'Unlinked member';

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.info}>
        <ThemedText type="default">{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {ROLE_LABELS[role.role]} · {scopeLabel}
        </ThemedText>
      </View>
      {role.role !== 'owner' && (
        <Pressable onPress={onRevoke} hitSlop={8}>
          <ThemedText type="link" themeColor="textSecondary">
            Revoke
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  info: {
    gap: Spacing.half,
    flexShrink: 1,
  },
});
