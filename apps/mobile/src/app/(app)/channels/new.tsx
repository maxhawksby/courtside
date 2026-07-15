import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { MemberRow } from '@/features/messaging/components/member-row';
import { TeamSeasonPicker, type TeamSeasonOption } from '@/features/messaging/components/team-season-picker';
import {
  MinorRequiresGuardianError,
  createTeamChannel,
  getMyProfile,
  listOrgUserProfiles,
  listSeasons,
  listTeamSeasons,
  listTeams,
  openDirectMessage,
  type UserProfileWithPerson,
} from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { useOrg } from '@/lib/org-context';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'dm' | 'team';

export default function NewChannelScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeOrg } = useOrg();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>('dm');

  // Shared: org members (self excluded), used by both the DM picker and the
  // team-channel multi-select.
  const [members, setMembers] = useState<UserProfileWithPerson[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [myFirstName, setMyFirstName] = useState('Me');

  // DM mode
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [dmErrors, setDmErrors] = useState<Record<string, string | null>>({});

  // Team-channel mode
  const [name, setName] = useState('');
  const [teamSeasonOptions, setTeamSeasonOptions] = useState<TeamSeasonOption[]>([]);
  const [selectedTeamSeasonId, setSelectedTeamSeasonId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Both loading flags are derived: a fetch is pending until the current
  // org (+user) combination settles, so the effects never set state
  // synchronously. If the guards keep us from fetching, they stay true
  // forever — same as the previous initial-true behavior.
  const membersKey = `${activeOrg?.id ?? ''}|${user?.id ?? ''}`;
  const [membersSettledKey, setMembersSettledKey] = useState<string | null>(null);
  const membersLoading = membersSettledKey !== membersKey;
  const [teamSeasonsSettledFor, setTeamSeasonsSettledFor] = useState<string | null>(null);
  const teamSeasonsLoading = teamSeasonsSettledFor !== (activeOrg?.id ?? '');

  useEffect(() => {
    if (!activeOrg || !user) return;
    let cancelled = false;
    listOrgUserProfiles(activeOrg.id)
      .then((rows) => {
        if (cancelled) return;
        setMembers(rows.filter((p) => p.user_id !== user.id));
        setMembersError(null);
      })
      .catch((e) => {
        if (!cancelled) setMembersError(e instanceof Error ? e.message : 'Could not load members');
      })
      .finally(() => {
        if (!cancelled) setMembersSettledKey(membersKey);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrg, user, membersKey]);

  useEffect(() => {
    if (!activeOrg) return;
    let cancelled = false;
    const orgId = activeOrg.id;
    (async (): Promise<TeamSeasonOption[]> => {
      const seasons = await listSeasons(orgId);
      if (seasons.length === 0) return [];
      // listSeasons orders newest-first — the first row is the current season.
      const currentSeason = seasons[0];
      const [teamSeasons, teams] = await Promise.all([
        listTeamSeasons(orgId, currentSeason.id),
        listTeams(orgId),
      ]);
      const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
      return teamSeasons.map((ts) => ({
        teamSeasonId: ts.id,
        teamName: teamNameById.get(ts.team_id) ?? 'Unknown team',
      }));
    })()
      .then((options) => {
        if (!cancelled) setTeamSeasonOptions(options);
      })
      .catch((e) => {
        if (!cancelled) setTeamError(e instanceof Error ? e.message : 'Could not load teams');
      })
      .finally(() => {
        if (!cancelled) setTeamSeasonsSettledFor(orgId);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrg]);

  useEffect(() => {
    if (!activeOrg) return;
    let cancelled = false;
    getMyProfile(activeOrg.id)
      .then((profile) => {
        if (!cancelled && profile?.persons?.first_name) setMyFirstName(profile.persons.first_name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeOrg]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((p) => {
      const full = `${p.persons?.first_name ?? ''} ${p.persons?.last_name ?? ''}`.toLowerCase();
      return full.includes(q);
    });
  }, [members, query]);

  const handleOpenDm = async (profile: UserProfileWithPerson) => {
    if (!activeOrg) return;
    setDmErrors((prev) => ({ ...prev, [profile.user_id]: null }));
    setBusyUserId(profile.user_id);
    try {
      const otherFirstName = profile.persons?.first_name ?? 'Member';
      const channelName = `${myFirstName} & ${otherFirstName}`;
      const channel = await openDirectMessage(activeOrg.id, profile.user_id, channelName);
      router.replace(`/(app)/channels/${channel.id}`);
    } catch (e) {
      const message =
        e instanceof MinorRequiresGuardianError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not open direct message';
      setDmErrors((prev) => ({ ...prev, [profile.user_id]: message }));
    } finally {
      setBusyUserId(null);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreateTeamChannel = async () => {
    if (!activeOrg || !selectedTeamSeasonId || !name.trim()) return;
    setSubmitting(true);
    setTeamError(null);
    try {
      const channel = await createTeamChannel(
        activeOrg.id,
        selectedTeamSeasonId,
        name.trim(),
        [...selectedMemberIds],
        isReadOnly,
      );
      router.replace(`/(app)/channels/${channel.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not create channel';
      setTeamError(
        message.toLowerCase().includes('row-level security')
          ? 'Only team staff can create team channels.'
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'New message' }} />
        <ThemedText type="small" themeColor="textSecondary">
          Select or create an organization first.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'New message' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl
          options={[
            { value: 'dm', label: 'Direct message' },
            { value: 'team', label: 'Team channel' },
          ]}
          value={mode}
          onChange={setMode}
        />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          autoCapitalize="words"
          autoCorrect={false}
        />

        {membersError && !membersLoading ? (
          <ThemedText type="small">{membersError}</ThemedText>
        ) : membersLoading ? (
          <ActivityIndicator />
        ) : null}

        {mode === 'dm' && !membersLoading && !membersError && (
          <View style={styles.section}>
            {filteredMembers.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No matching members.
              </ThemedText>
            ) : (
              filteredMembers.map((profile) => (
                <MemberRow
                  key={profile.user_id}
                  profile={profile}
                  onPress={() => void handleOpenDm(profile)}
                  busy={busyUserId === profile.user_id}
                  errorText={dmErrors[profile.user_id]}
                />
              ))
            )}
          </View>
        )}

        {mode === 'team' && (
          <View style={styles.section}>
            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Channel name
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Varsity Boys — Team Chat"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Team
              </ThemedText>
              {teamSeasonsLoading ? (
                <ActivityIndicator />
              ) : (
                <TeamSeasonPicker
                  options={teamSeasonOptions}
                  selectedTeamSeasonId={selectedTeamSeasonId}
                  onSelect={setSelectedTeamSeasonId}
                />
              )}
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Members
              </ThemedText>
              {membersLoading ? (
                <ActivityIndicator />
              ) : filteredMembers.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No matching members.
                </ThemedText>
              ) : (
                filteredMembers.map((profile) => (
                  <MemberRow
                    key={profile.user_id}
                    profile={profile}
                    selected={selectedMemberIds.has(profile.user_id)}
                    onPress={() => toggleMember(profile.user_id)}
                  />
                ))
              )}
            </View>

            <View style={styles.switchRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Read only (staff post, everyone reads)
              </ThemedText>
              <Switch value={isReadOnly} onValueChange={setIsReadOnly} />
            </View>

            {teamError ? <ThemedText type="small">{teamError}</ThemedText> : null}

            <PrimaryButton
              label={submitting ? 'Creating…' : 'Create team channel'}
              onPress={() => void handleCreateTeamChannel()}
              disabled={submitting || !name.trim() || !selectedTeamSeasonId}
            />
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.minimum,
    fontSize: 16,
  },
  section: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
