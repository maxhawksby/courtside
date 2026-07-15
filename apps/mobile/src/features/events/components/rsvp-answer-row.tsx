import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RsvpStatus } from '@courtside/shared';

type RsvpAnswerRowProps = {
  name: string;
  /** Current answer, or 'unanswered' when no rsvps row exists yet. */
  status: RsvpStatus;
  onSetGoing: () => void;
  onSetNotGoing: () => void;
  disabled?: boolean;
};

/** One answerable person (self or a guarded player) with Going / Not going buttons. */
export function RsvpAnswerRow({ name, status, onSetGoing, onSetNotGoing, disabled }: RsvpAnswerRowProps) {
  const theme = useTheme();
  const going = status === 'going';
  const notGoing = status === 'not_going';

  return (
    <View style={styles.row}>
      <ThemedText type="small" style={styles.name}>
        {name}
      </ThemedText>
      <View style={styles.buttons}>
        <Pressable
          onPress={onSetGoing}
          disabled={disabled}
          style={({ pressed }) => [styles.pressable, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
          <ThemedView
            type="backgroundElement"
            style={[styles.pill, { borderColor: going ? theme.success : theme.border }]}>
            <ThemedText type="small" themeColor={going ? 'success' : 'textSecondary'}>
              Going
            </ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable
          onPress={onSetNotGoing}
          disabled={disabled}
          style={({ pressed }) => [styles.pressable, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
          <ThemedView
            type="backgroundElement"
            style={[styles.pill, { borderColor: notGoing ? theme.danger : theme.border }]}>
            <ThemedText type="small" themeColor={notGoing ? 'danger' : 'textSecondary'}>
              Not going
            </ThemedText>
          </ThemedView>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressable: {
    borderRadius: Radius.pill,
  },
  pill: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
});
