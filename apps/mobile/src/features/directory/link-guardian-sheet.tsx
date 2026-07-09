import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import type { PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createGuardianship } from '@/lib/data';

import { PersonPicker } from './person-picker';

type LinkGuardianSheetProps = {
  visible: boolean;
  onClose: () => void;
  orgId: string;
  /** The person being viewed — the player/child side of the relationship. */
  playerPersonId: string;
  /** Called after a guardianship is successfully created. */
  onLinked: () => void;
};

export function LinkGuardianSheet({
  visible,
  onClose,
  orgId,
  playerPersonId,
  onLinked,
}: LinkGuardianSheetProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState<PersonRow | null>(null);
  const [relationship, setRelationship] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setRelationship('');
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  const handleLink = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await createGuardianship(orgId, selected.id, playerPersonId, relationship.trim() || undefined);
      onLinked();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to link guardian');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.sheet}>
        <ThemedView style={styles.sheetHeader}>
          <ThemedText type="subtitle">Link guardian</ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <ThemedText type="link">Close</ThemedText>
          </Pressable>
        </ThemedView>

        {!selected ? (
          <PersonPicker orgId={orgId} excludePersonId={playerPersonId} onSelect={setSelected} />
        ) : (
          <ThemedView style={styles.selectedBlock}>
            <ThemedText>
              Guardian: {selected.first_name} {selected.last_name}
            </ThemedText>
            <TextInput
              value={relationship}
              onChangeText={setRelationship}
              placeholder="Relationship (optional, e.g. Mother)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            {error ? (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            ) : null}
            <Pressable onPress={handleLink} disabled={submitting} hitSlop={4}>
              <ThemedText type="linkPrimary">{submitting ? 'Linking…' : 'Link guardian'}</ThemedText>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} hitSlop={4}>
              <ThemedText type="link">Choose someone else</ThemedText>
            </Pressable>
          </ThemedView>
        )}
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
  selectedBlock: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
});
