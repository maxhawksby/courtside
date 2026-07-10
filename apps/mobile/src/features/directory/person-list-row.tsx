import { Pressable, StyleSheet, View } from 'react-native';
import { ageFromDateOfBirth, isMinor, type PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type PersonListRowProps = {
  person: PersonRow;
  onPress: () => void;
};

export function PersonListRow({ person, onPress }: PersonListRowProps) {
  const hint = person.email ?? person.phone ?? null;
  const minor = isMinor(person.date_of_birth);
  const age = ageFromDateOfBirth(person.date_of_birth);

  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {({ pressed }) => (
        <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.pressed]}>
          <View style={styles.nameRow}>
            <ThemedText>
              {person.first_name} {person.last_name}
            </ThemedText>
            {minor ? (
              <ThemedView type="backgroundSelected" style={styles.chip}>
                <ThemedText type="small">Minor{age != null ? ` · ${age}` : ''}</ThemedText>
              </ThemedView>
            ) : null}
          </View>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
