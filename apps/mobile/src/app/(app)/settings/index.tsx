import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DivisionRow, OrgRoleRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useTheme } from '@/hooks/use-theme';
import {
  listDivisions,
  listMyRoles,
  listOrgRoles,
  listTeams,
  revokeRole,
  type OrgRoleWithPerson,
  type TeamWithDivision,
} from '@/lib/data';
import { useOrg } from '@/lib/org-context';

import { GrantRoleSheet } from '@/features/roles/grant-role-sheet';
import { ROLE_LABELS, friendlyRoleError, scopeLabel } from '@/features/roles/role-labels';
import { RoleRow } from '@/features/roles/role-row';

export default function SettingsScreen() {
  const theme = useTheme();
  const { activeOrg, loading: orgLoading } = useOrg();

  const [myRoles, setMyRoles] = useState<OrgRoleRow[]>([]);
  const [orgRoles, setOrgRoles] = useState<OrgRoleWithPerson[]>([]);
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);
  const [teams, setTeams] = useState<TeamWithDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grantVisible, setGrantVisible] = useState(false);

  const isOwner = myRoles.some((r) => r.role === 'owner');

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    setError(null);
    try {
      const [mine, divs, tms] = await Promise.all([
        listMyRoles(activeOrg.id),
        listDivisions(activeOrg.id),
        listTeams(activeOrg.id),
      ]);
      setMyRoles(mine);
      setDivisions(divs);
      setTeams(tms);
      // Section visibility is gated on 'owner' membership (safety rule 1); the
      // server (RLS) independently enforces this on every read and write.
      setOrgRoles(mine.some((r) => r.role === 'owner') ? await listOrgRoles(activeOrg.id) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load settings');
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleRevoke = (role: OrgRoleWithPerson) => {
    const name = role.user_profiles?.persons
      ? `${role.user_profiles.persons.first_name} ${role.user_profiles.persons.last_name}`
      : 'this member';
    Alert.alert('Revoke role', `Remove ${ROLE_LABELS[role.role]} from ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setError(null);
            try {
              await revokeRole(role.id);
              await load();
            } catch (e) {
              setError(friendlyRoleError(e, 'Could not revoke role'));
            }
          })();
        },
      },
    ]);
  };

  if (orgLoading) {
    return (
      <ThemedView style={[styles.centered, styles.fullScreen]}>
        <ActivityIndicator color={theme.tint} />
      </ThemedView>
    );
  }

  if (!activeOrg) {
    return (
      <ThemedView style={[styles.centered, styles.fullScreen]}>
        <ThemedText type="small" themeColor="textSecondary">
          Select or create an organization first.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{activeOrg.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Settings
            </ThemedText>
          </View>

          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.tint} />
            </View>
          )}

          {!loading && error && (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          )}

          {!loading && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Your roles</ThemedText>
              <View style={styles.chipRow}>
                {myRoles.length === 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    No roles assigned yet.
                  </ThemedText>
                )}
                {myRoles.map((r) => (
                  <ThemedView key={r.id} type="backgroundSelected" style={styles.chip}>
                    <ThemedText type="small" themeColor="tint">
                      {ROLE_LABELS[r.role]} · {scopeLabel(r, divisions, teams)}
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>
            </View>
          )}

          {!loading && isOwner && (
            <View style={styles.section}>
              <View style={styles.headerRow}>
                <ThemedText type="smallBold">Role management</ThemedText>
                <PrimaryButton label="Grant role" onPress={() => setGrantVisible(true)} />
              </View>

              {orgRoles.length === 0 ? (
                <EmptyState
                  title="No roles yet"
                  body="Grant roles to give members access to coaching, scorekeeping, or division management tools."
                />
              ) : (
                <View style={styles.rows}>
                  {orgRoles.map((r) => (
                    <RoleRow
                      key={r.id}
                      role={r}
                      scopeLabel={scopeLabel(r, divisions, teams)}
                      onRevoke={() => handleRevoke(r)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {!loading && !isOwner && (
            <ThemedText type="small" themeColor="textSecondary">
              Contact the organization owner to request a role change.
            </ThemedText>
          )}
        </ScrollView>

        <GrantRoleSheet
          visible={grantVisible}
          onClose={() => setGrantVisible(false)}
          orgId={activeOrg.id}
          onGranted={() => void load()}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  rows: {
    gap: Spacing.two,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
});
