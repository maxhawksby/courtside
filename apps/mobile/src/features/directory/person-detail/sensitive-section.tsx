import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { PersonSensitiveRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upsertSensitive } from '@/lib/data';

type EmergencyContact = { name?: string; phone?: string };

type SensitiveSectionProps = {
  orgId: string;
  personId: string;
  /**
   * The parent screen mounts this either with an existing row, or with null
   * ONLY when it has locally established the viewer as the person themself
   * or a guardian (create mode — an empty form reveals nothing, and RLS
   * still decides the write). Never mount it for anyone else
   * (docs/COMPLIANCE.md: sensitive data fails closed).
   */
  sensitive: PersonSensitiveRow | null;
  onSaved: (row: PersonSensitiveRow) => void;
};

/** Medical notes + emergency contact, editable, saved via upsertSensitive. */
export function SensitiveSection({ orgId, personId, sensitive, onSaved }: SensitiveSectionProps) {
  const theme = useTheme();
  const existingContact = (sensitive?.emergency_contact ?? {}) as EmergencyContact;

  const [medicalNotes, setMedicalNotes] = useState(sensitive?.medical_notes ?? '');
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
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
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
          style={[styles.multiline, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
        />

        <ThemedText type="small" themeColor="textSecondary">
          Emergency contact
        </ThemedText>
        <TextInput
          value={contactName}
          onChangeText={setContactName}
          placeholder="Name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
        />
        <TextInput
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="Phone"
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
        />

        {error ? (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        ) : null}
        {saved && !error ? (
          <ThemedText type="small" themeColor="success">
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
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.minimum,
    fontSize: 16,
  },
  multiline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
