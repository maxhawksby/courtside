import { Pressable, StyleSheet } from 'react-native';
import type { PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type PersonListRowProps = {
  person: PersonRow;
  onPress: () => void;
};

export function PersonListRow({ person, onPress }: PersonListRowProps) {
  const hint = person.email ?? person.phone ?? null;

  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {({ pressed }) => (
        <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.pressed]}>
          <ThemedText>
            {person.first_name} {person.last_name}
          </ThemedText>
          {hint ? (
            <ThemedText type="small" themeColor="textSecondary">
              {hint}
            </ThemedText>
          ) : null}
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
