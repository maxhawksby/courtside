import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ORG_ROLES, type DivisionRow, type OrgRole, type RoleScope } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { PrimaryButton } from '@/components/ui/primary-button';
import {
  grantRole,
  listDivisions,
  listOrgUserProfiles,
  listTeams,
  type TeamWithDivision,
  type UserProfileWithPerson,
} from '@/lib/data';

import { ROLE_LABELS, friendlyRoleError } from './role-labels';

// 'owner' is never offered here — transferring ownership is out of scope (safety rule 2).
const GRANTABLE_ROLES = ORG_ROLES.filter((role) => role !== 'owner') as Exclude<OrgRole, 'owner'>[];

const SCOPE_OPTIONS: { value: RoleScope; label: string }[] = [
  { value: 'organization', label: 'Organization' },
  { value: 'division', label: 'Division' },
  { value: 'team', label: 'Team' },
];

type GrantRoleSheetProps = {
  visible: boolean;
  onClose: () => void;
  orgId: string;
  onGranted: () => void;
};

export function GrantRoleSheet({ visible, onClose, orgId, onGranted }: GrantRoleSheetProps) {
  const theme = useTheme();

  const [members, setMembers] = useState<UserProfileWithPerson[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState('');
  // Never preselected — including the signed-in owner — per safety rule 2.
  const [selectedMember, setSelectedMember] = useState<UserProfileWithPerson | null>(null);

  const [role, setRole] = useState<Exclude<OrgRole, 'owner'>>('coach');

  const [scopeType, setScopeType] = useState<RoleScope>('organization');
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);
  const [divisionsLoading, setDivisionsLoading] = useState(false);
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamWithDivision[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setSelectedMember(null);
    setRole('coach');
    setScopeType('organization');
    setDivisionId(null);
    setTeamId(null);
    setError(null);
    setSubmitting(false);

    setMembersLoading(true);
    listOrgUserProfiles(orgId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [visible, orgId]);

  useEffect(() => {
    if (!visible || scopeType !== 'division') return;
    setDivisionsLoading(true);
    listDivisions(orgId)
      .then(setDivisions)
      .catch(() => setDivisions([]))
      .finally(() => setDivisionsLoading(false));
  }, [visible, scopeType, orgId]);

  useEffect(() => {
    if (!visible || scopeType !== 'team') return;
    setTeamsLoading(true);
    listTeams(orgId)
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false));
  }, [visible, scopeType, orgId]);

  const filteredMembers = members.filter((member) => {
    if (!search.trim()) return true;
    const name = member.persons ? `${member.persons.first_name} ${member.persons.last_name}` : '';
    return name.toLowerCase().includes(search.trim().toLowerCase());
  });

  const canSubmit =
    !!selectedMember &&
    (scopeType !== 'division' || !!divisionId) &&
    (scopeType !== 'team' || !!teamId) &&
    !submitting;

  const handleGrant = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    setError(null);
    try {
      await grantRole(orgId, {
        userId: selectedMember.user_id,
        role,
        scopeType,
        divisionId: scopeType === 'division' ? (divisionId ?? undefined) : undefined,
        teamId: scopeType === 'team' ? (teamId ?? undefined) : undefined,
      });
      onGranted();
      onClose();
    } catch (e) {
      setError(friendlyRoleError(e, 'Could not grant role'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <ThemedText type="subtitle">Grant role</ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <ThemedText type="link">Close</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Member
            </ThemedText>
            {selectedMember ? (
              <View style={styles.selectedRow}>
                <ThemedText type="small">
                  {selectedMember.persons
                    ? `${selectedMember.persons.first_name} ${selectedMember.persons.last_name}`
                    : 'Unlinked member'}
                </ThemedText>
                <Pressable onPress={() => setSelectedMember(null)}>
                  <ThemedText type="link" themeColor="textSecondary">
                    Change
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.pickerBlock}>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search members"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                />
                {membersLoading && <ActivityIndicator />}
                {!membersLoading &&
                  filteredMembers.map((member) => (
                    <Pressable key={member.user_id} onPress={() => setSelectedMember(member)}>
                      <ThemedView type="backgroundElement" style={styles.optionRow}>
                        <ThemedText type="small">
                          {member.persons
                            ? `${member.persons.first_name} ${member.persons.last_name}`
                            : 'Unlinked member'}
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                {!membersLoading && filteredMembers.length === 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    No matching members.
                  </ThemedText>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Role
            </ThemedText>
            <View style={styles.pickerBlock}>
              {GRANTABLE_ROLES.map((option) => (
                <Pressable key={option} onPress={() => setRole(option)}>
                  <ThemedView
                    type={role === option ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.optionRow}>
                    <ThemedText type="small">{ROLE_LABELS[option]}</ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Scope
            </ThemedText>
            <SegmentedControl options={SCOPE_OPTIONS} value={scopeType} onChange={setScopeType} />

            {scopeType === 'division' && (
              <View style={styles.pickerBlock}>
                {divisionsLoading && <ActivityIndicator />}
                {!divisionsLoading &&
                  divisions.map((division) => (
                    <Pressable key={division.id} onPress={() => setDivisionId(division.id)}>
                      <ThemedView
                        type={divisionId === division.id ? 'backgroundSelected' : 'backgroundElement'}
                        style={styles.optionRow}>
                        <ThemedText type="small">{division.name}</ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                {!divisionsLoading && divisions.length === 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    No divisions yet.
                  </ThemedText>
                )}
              </View>
            )}

            {scopeType === 'team' && (
              <View style={styles.pickerBlock}>
                {teamsLoading && <ActivityIndicator />}
                {!teamsLoading &&
                  teams.map((team) => (
                    <Pressable key={team.id} onPress={() => setTeamId(team.id)}>
                      <ThemedView
                        type={teamId === team.id ? 'backgroundSelected' : 'backgroundElement'}
                        style={styles.optionRow}>
                        <ThemedText type="small">{team.name}</ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                {!teamsLoading && teams.length === 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    No teams yet.
                  </ThemedText>
                )}
              </View>
            )}
          </View>

          {error && (
            <ThemedText type="small" themeColor="text">
              {error}
            </ThemedText>
          )}

          <PrimaryButton
            label={submitting ? 'Granting…' : 'Grant role'}
            onPress={handleGrant}
            disabled={!canSubmit}
          />
        </ScrollView>
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
  scroll: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  pickerBlock: {
    gap: Spacing.two,
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  optionRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
