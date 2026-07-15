import { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, TextInput } from 'react-native';
import type { InviteRow, OrgRole } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { createInvite } from '@/lib/data';

// Roles offered from this sheet — a person-linked invite, so scoped to the
// relationships that make sense from a person's directory entry. Defaults to
// 'parent' so existing callers (which don't know about this picker) behave
// exactly as before.
type InviteRole = Extract<OrgRole, 'parent' | 'follower' | 'scorekeeper'>;
const INVITE_ROLE_OPTIONS: { value: InviteRole; label: string }[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'follower', label: 'Follower' },
  { value: 'scorekeeper', label: 'Scorekeeper' },
];

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
  const [role, setRole] = useState<InviteRole>('parent');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteRow | null>(null);

  // Reset the form whenever the sheet opens (or defaultEmail changes while
  // open), using the adjust-state-during-render pattern instead of an effect
  // so no setState happens inside an effect body.
  const resetKey = visible ? `open|${defaultEmail ?? ''}` : 'closed';
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    if (visible) {
      setEmail(defaultEmail ?? '');
      setRole('parent');
      setInvite(null);
      setError(null);
      setSubmitting(false);
    }
  }

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createInvite(orgId, {
        email: email.trim(),
        role,
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
          <ThemedText type="subtitle">Invite</ThemedText>
          <Pressable onPress={onClose} hitSlop={12} style={styles.tapTarget}>
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
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Role
            </ThemedText>
            <SegmentedControl options={INVITE_ROLE_OPTIONS} value={role} onChange={setRole} />
            {error ? (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            ) : null}
            <Pressable
              onPress={handleInvite}
              disabled={submitting || !email.trim()}
              hitSlop={12}
              style={styles.tapTarget}>
              <ThemedText type="linkPrimary">{submitting ? 'Sending…' : 'Send invite'}</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView style={styles.form}>
            <ThemedText>Invite created for {invite.email}.</ThemedText>
            <ThemedView type="backgroundElement" style={[styles.tokenBox, { borderColor: theme.border }]}>
              <ThemedText type="code">{invite.token}</ThemedText>
            </ThemedView>
            <Pressable onPress={handleShare} hitSlop={12} style={styles.tapTarget}>
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
  tokenBox: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
});
