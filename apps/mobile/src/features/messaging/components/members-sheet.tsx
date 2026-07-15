import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChannelMemberWithPerson } from '@/lib/data';

function displayName(member: ChannelMemberWithPerson): string {
  const person = member.user_profiles?.persons;
  if (!person) return 'Unnamed member';
  return `${person.first_name} ${person.last_name}`;
}

type MembersSheetProps = {
  visible: boolean;
  onClose: () => void;
  members: ChannelMemberWithPerson[];
  myUserId: string | null;
};

export function MembersSheet({ visible, onClose, members, myUserId }: MembersSheetProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.sheet}>
        <ThemedView style={styles.sheetHeader}>
          <ThemedText type="subtitle">Members</ThemedText>
          <Pressable onPress={onClose} hitSlop={12} style={styles.tapTarget}>
            <ThemedText type="link">Close</ThemedText>
          </Pressable>
        </ThemedView>

        <ScrollView contentContainerStyle={styles.list}>
          {members.map((member) => (
            <ThemedView
              key={member.user_id}
              type="backgroundElement"
              style={[styles.row, { borderColor: theme.border }]}>
              <ThemedText>{displayName(member)}</ThemedText>
              {member.user_id === myUserId ? (
                <ThemedText type="small" themeColor="textSecondary">
                  You
                </ThemedText>
              ) : null}
            </ThemedView>
          ))}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapTarget: {
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  list: {
    gap: Spacing.two,
  },
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
});
