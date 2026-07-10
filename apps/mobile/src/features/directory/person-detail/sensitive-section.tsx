import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { PersonSensitiveRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upsertSensitive } from '@/lib/data';

type EmergencyContact = { name?: string; phone?: string };

type SensitiveSectionProps = {
  orgId: string;
  personId: string;
  /**
   * The parent screen only mounts this component once getSensitive has
   * already resolved to a real row — never render this against a null/error
   * result (docs/COMPLIANCE.md: sensitive data fails closed).
   */
  sensitive: PersonSensitiveRow;
  onSaved: (row: PersonSensitiveRow) => void;
};

/** Medical notes + emergency contact, editable, saved via upsertSensitive. */
export function SensitiveSection({ orgId, personId, sensitive, onSaved }: SensitiveSectionProps) {
  const theme = useTheme();
  const existingContact = (sensitive.emergency_contact ?? {}) as EmergencyContact;

  const [medicalNotes, setMedicalNotes] = useState(sensitive.medical_notes ?? '');
  const [contactName, setContactName] = useState(existingContact.name ?? '');
  const [contactPhone, setContactPhone] = useState(existingContact.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const trimmedName = contactName.trim();
      const trimmedPhone = contactPhone.trim();
      const row = await upsertSensitive(orgId, personId, {
        medical_notes: medicalNotes.trim() || null,
        emergency_contact:
          trimmedName || trimmedPhone ? { name: trimmedName, phone: trimmedPhone } : null,
      });
      onSaved(row);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save — you may not have permission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Sensitive info</ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Medical notes
        </ThemedText>
        <TextInput
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          placeholder="Allergies, conditions, medications…"
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          style={[styles.multiline, { color: theme.text, backgroundColor: theme.background }]}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Emergency contact
        </ThemedText>
        <TextInput
          value={contactName}
          onChangeText={setContactName}
          placeholder="Name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
        />
        <TextInput
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="Phone"
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
          style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
        />

        {error ? (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        ) : null}
        {saved && !error ? (
          <ThemedText type="small" themeColor="textSecondary">
            Saved.
          </ThemedText>
        ) : null}

        <PrimaryButton
          label={saving ? 'Saving…' : 'Save'}
          onPress={() => void handleSave()}
          disabled={saving}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  multiline: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
