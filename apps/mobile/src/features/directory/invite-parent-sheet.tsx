import { useEffect, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, TextInput } from 'react-native';
import type { InviteRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createInvite } from '@/lib/data';

type InviteParentSheetProps = {
  visible: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  personId: string;
  defaultEmail: string | null;
};

export function InviteParentSheet({
  visible,
  onClose,
  orgId,
  orgName,
  personId,
  defaultEmail,
}: InviteParentSheetProps) {
  const theme = useTheme();
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteRow | null>(null);

  useEffect(() => {
    if (visible) {
      setEmail(defaultEmail ?? '');
      setInvite(null);
      setError(null);
      setSubmitting(false);
    }
  }, [visible, defaultEmail]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createInvite(orgId, {
        email: email.trim(),
        role: 'parent',
        personId,
      });
      setInvite(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invite');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!invite) return;
    try {
      await Share.share({
        message: `You're invited to join ${orgName} on Courtside. Invite code: ${invite.token}`,
      });
    } catch {
      // Share sheet dismissed or unsupported — nothing to recover from.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.sheet}>
        <ThemedView style={styles.sheetHeader}>
          <ThemedText type="subtitle">Invite as parent</ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <ThemedText type="link">Close</ThemedText>
          </Pressable>
        </ThemedView>

        {!invite ? (
          <ThemedView style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            ) : null}
            <Pressable onPress={handleInvite} disabled={submitting || !email.trim()} hitSlop={4}>
              <ThemedText type="linkPrimary">{submitting ? 'Sending…' : 'Send invite'}</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView style={styles.form}>
            <ThemedText>Invite created for {invite.email}.</ThemedText>
            <ThemedView type="backgroundElement" style={styles.tokenBox}>
              <ThemedText type="code">{invite.token}</ThemedText>
            </ThemedView>
            <Pressable onPress={handleShare} hitSlop={4}>
              <ThemedText type="linkPrimary">Share invite</ThemedText>
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
  form: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  tokenBox: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
});
