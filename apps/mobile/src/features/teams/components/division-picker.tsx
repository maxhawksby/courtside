import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
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
      <Pressable onPress={() => onSelect(null)} hitSlop={4}>
        <ThemedView
          type={selectedDivisionId === null ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.option, { borderColor: theme.border }]}>
          <ThemedText type="small">No division</ThemedText>
        </ThemedView>
      </Pressable>

      {divisions.map((division) => (
        <Pressable key={division.id} onPress={() => onSelect(division.id)} hitSlop={4}>
          <ThemedView
            type={selectedDivisionId === division.id ? 'backgroundSelected' : 'backgroundElement'}
            style={[styles.option, { borderColor: theme.border }]}>
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
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
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
          <ThemedText type="small" themeColor="tint">
            Add
          </ThemedText>
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
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
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
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
    fontSize: 14,
  },
  addButton: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
    minWidth: TouchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
