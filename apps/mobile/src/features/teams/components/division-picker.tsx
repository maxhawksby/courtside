import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DivisionRow } from '@courtside/shared';

type DivisionPickerProps = {
  divisions: DivisionRow[];
  selectedDivisionId: string | null;
  onSelect: (divisionId: string | null) => void;
  onCreateDivision: (name: string) => Promise<void>;
};

export function DivisionPicker({
  divisions,
  selectedDivisionId,
  onSelect,
  onCreateDivision,
}: DivisionPickerProps) {
  const theme = useTheme();
  const [newDivisionName, setNewDivisionName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = newDivisionName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreateDivision(name);
      setNewDivisionName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => onSelect(null)}>
        <ThemedView
          type={selectedDivisionId === null ? 'backgroundSelected' : 'backgroundElement'}
          style={styles.option}>
          <ThemedText type="small">No division</ThemedText>
        </ThemedView>
      </Pressable>

      {divisions.map((division) => (
        <Pressable key={division.id} onPress={() => onSelect(division.id)}>
          <ThemedView
            type={selectedDivisionId === division.id ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.option}>
            <ThemedText type="small">{division.name}</ThemedText>
          </ThemedView>
        </Pressable>
      ))}

      <View style={styles.newDivisionRow}>
        <TextInput
          value={newDivisionName}
          onChangeText={setNewDivisionName}
          placeholder="New division name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
        />
        <Pressable
          onPress={handleCreate}
          disabled={creating || !newDivisionName.trim()}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: theme.backgroundSelected,
              opacity: creating || !newDivisionName.trim() ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}>
          <ThemedText type="small">Add</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  option: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  newDivisionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  addButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
