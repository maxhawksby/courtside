import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import type { PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
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

  // Clear the form when the sheet closes, using the adjust-state-during-render
  // pattern instead of an effect so no setState happens inside an effect body.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (!visible) {
      setSelected(null);
      setRelationship('');
      setError(null);
      setSubmitting(false);
    }
  }

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
          <Pressable onPress={onClose} hitSlop={12} style={styles.tapTarget}>
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
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            />
            {error ? (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            ) : null}
            <Pressable onPress={handleLink} disabled={submitting} hitSlop={12} style={styles.tapTarget}>
              <ThemedText type="linkPrimary">{submitting ? 'Linking…' : 'Link guardian'}</ThemedText>
            </Pressable>
            <Pressable onPress={() => setSelected(null)} hitSlop={12} style={styles.tapTarget}>
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
  tapTarget: {
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.minimum,
    fontSize: 16,
  },
});
