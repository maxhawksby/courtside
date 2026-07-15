import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { MediaConsentRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getEffectiveConsent, listConsentHistory, setConsent } from '@/lib/data';

type MediaConsentSectionProps = {
  orgId: string;
  playerPersonId: string;
  /** Current effective consent (getEffectiveConsent), owned by the parent screen. */
  consent: boolean;
  /** Called with the freshly re-read effective consent after a write. */
  onConsentChange: (granted: boolean) => void;
};

/**
 * Minors-only media consent controls (docs/COMPLIANCE.md §5). The toggle
 * writes through setConsent and then re-reads getEffectiveConsent — never an
 * optimistic flip of the displayed state.
 */
export function MediaConsentSection({
  orgId,
  playerPersonId,
  consent,
  onConsentChange,
}: MediaConsentSectionProps) {
  const theme = useTheme();
  const [history, setHistory] = useState<MediaConsentRow[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Returns data instead of setting state so the effect below can keep all
  // setState calls inside promise callbacks (never synchronously in the
  // effect body). A read failure renders as an empty history.
  const fetchHistory = useCallback(
    () => listConsentHistory(playerPersonId).catch(() => [] as MediaConsentRow[]),
    [playerPersonId],
  );

  useEffect(() => {
    let cancelled = false;
    fetchHistory().then((rows) => {
      if (cancelled) return;
      setHistory(rows);
      setHistoryLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchHistory]);

  const handleToggle = async (granted: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      await setConsent(orgId, playerPersonId, granted, note.trim() || undefined);
      // Re-read the effective state from the server — no optimistic flip.
      const fresh = await getEffectiveConsent(playerPersonId);
      onConsentChange(fresh);
      setHistory(await fetchHistory());
      setHistoryLoaded(true);
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update media consent');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Media consent</ThemedText>
      <ThemedView type="backgroundElement" style={[styles.stateCard, { borderColor: theme.border }]}>
        <ThemedText themeColor={consent ? 'success' : 'textSecondary'}>
          {consent ? 'Photos allowed' : 'No consent on file — media hidden'}
        </ThemedText>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note (optional)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
        />

        {error ? (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        ) : null}

        <View style={styles.actionsRow}>
          <PrimaryButton
            label={submitting ? 'Saving…' : 'Grant'}
            onPress={() => void handleToggle(true)}
            disabled={submitting || consent}
          />
          <PrimaryButton
            label={submitting ? 'Saving…' : 'Revoke'}
            onPress={() => void handleToggle(false)}
            disabled={submitting || !consent}
          />
        </View>
      </ThemedView>

      <View style={styles.historyBlock}>
        <ThemedText type="small" themeColor="textSecondary">
          History
        </ThemedText>
        {historyLoaded && history.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No consent on file — deny by default until a guardian grants it.
          </ThemedText>
        ) : (
          history.map((row) => (
            <View key={row.id} style={styles.historyRow}>
              <ThemedText type="small" themeColor={row.granted ? 'success' : 'danger'}>
                {row.granted ? 'Granted' : 'Revoked'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(row.created_at).toLocaleDateString()}
              </ThemedText>
              {row.note ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {row.note}
                </ThemedText>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  stateCard: {
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
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  historyBlock: {
    gap: Spacing.two,
  },
  historyRow: {
    gap: Spacing.half,
  },
});
