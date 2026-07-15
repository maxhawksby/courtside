import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { GuardianshipWithPersons } from '@/lib/data';

import { InviteParentSheet } from '@/features/directory/invite-parent-sheet';
import { LinkGuardianSheet } from '@/features/directory/link-guardian-sheet';

type GuardiansSectionProps = {
  orgId: string;
  orgName: string;
  person: { id: string; email: string | null };
  relationships: GuardianshipWithPersons[];
  /** Called after a guardian link or invite completes, to refresh the page. */
  onChanged: () => void;
};

/**
 * Guardian/player relationships for this person, wired to the existing
 * link-guardian and invite-parent sheets exactly as the prior page did.
 * Those sheets are frozen imports — not edited here.
 */
export function GuardiansSection({
  orgId,
  orgName,
  person,
  relationships,
  onChanged,
}: GuardiansSectionProps) {
  const router = useRouter();
  const theme = useTheme();
  const [linkVisible, setLinkVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);

  const guardians = relationships.filter((r) => r.player_person_id === person.id && r.guardian);
  const players = relationships.filter((r) => r.guardian_person_id === person.id && r.player);

  return (
    <>
      <View style={styles.actionsRow}>
        <Pressable onPress={() => setLinkVisible(true)} hitSlop={12} style={styles.tapTarget}>
          <ThemedText type="linkPrimary">Link guardian</ThemedText>
        </Pressable>
        <Pressable onPress={() => setInviteVisible(true)} hitSlop={12} style={styles.tapTarget}>
          <ThemedText type="linkPrimary">Invite as parent</ThemedText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">Guardians</ThemedText>
        {guardians.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No guardians linked yet.
          </ThemedText>
        ) : (
          guardians.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/directory/${r.guardian!.id}`)}
              hitSlop={4}>
              <ThemedView type="backgroundElement" style={[styles.relRow, { borderColor: theme.border }]}>
                <ThemedText>
                  {r.guardian!.first_name} {r.guardian!.last_name}
                </ThemedText>
                {r.relationship ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.relationship}
                  </ThemedText>
                ) : null}
              </ThemedView>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">Players</ThemedText>
        {players.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Not a guardian of anyone yet.
          </ThemedText>
        ) : (
          players.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/directory/${r.player!.id}`)}
              hitSlop={4}>
              <ThemedView type="backgroundElement" style={[styles.relRow, { borderColor: theme.border }]}>
                <ThemedText>
                  {r.player!.first_name} {r.player!.last_name}
                </ThemedText>
                {r.relationship ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.relationship}
                  </ThemedText>
                ) : null}
              </ThemedView>
            </Pressable>
          ))
        )}
      </View>

      <LinkGuardianSheet
        visible={linkVisible}
        onClose={() => setLinkVisible(false)}
        orgId={orgId}
        playerPersonId={person.id}
        onLinked={onChanged}
      />
      <InviteParentSheet
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        orgId={orgId}
        orgName={orgName}
        personId={person.id}
        defaultEmail={person.email}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  tapTarget: {
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  relRow: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
    gap: Spacing.half,
  },
});
