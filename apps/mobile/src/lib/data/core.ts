/**
 * Data-access layer, core domains — CONTRACT FILE (PM-owned).
 * Organizations, divisions/seasons/teams, persons/guardianships, roster,
 * invites. Thin, typed wrappers over Supabase queries. Feature code calls
 * these; it never queries supabase directly. RLS enforces security
 * server-side.
 */
import type {
  DivisionRow,
  GuardianshipRow,
  InviteRow,
  OrganizationRow,
  OrgRole,
  PersonRow,
  RosterMembershipRow,
  SeasonRow,
  TeamRow,
  TeamSeasonRow,
  UserProfileRow,
} from '@courtside/shared';

import { supabase } from '../supabase';
import { many, one, slugify } from './_helpers';

// ---- organizations ----

export async function getMyOrganizations(): Promise<OrganizationRow[]> {
  return many(supabase.from('organizations').select('*').order('created_at'));
}

/** Creator becomes owner via DB trigger. */
export async function createOrganization(name: string): Promise<OrganizationRow> {
  return one(
    supabase.from('organizations').insert({ name, slug: slugify(name) }).select().single(),
  );
}

// ---- divisions / seasons / teams ----

export async function listDivisions(orgId: string): Promise<DivisionRow[]> {
  return many(
    supabase.from('divisions').select('*').eq('organization_id', orgId).order('sort_order'),
  );
}

export async function createDivision(orgId: string, name: string): Promise<DivisionRow> {
  return one(
    supabase.from('divisions').insert({ organization_id: orgId, name }).select().single(),
  );
}

export async function listSeasons(orgId: string): Promise<SeasonRow[]> {
  return many(
    supabase.from('seasons').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
  );
}

export async function createSeason(orgId: string, name: string): Promise<SeasonRow> {
  return one(supabase.from('seasons').insert({ organization_id: orgId, name }).select().single());
}

export type TeamWithDivision = TeamRow & { divisions: Pick<DivisionRow, 'id' | 'name'> | null };

export async function listTeams(orgId: string): Promise<TeamWithDivision[]> {
  return many(
    supabase
      .from('teams')
      .select('*, divisions(id, name)')
      .eq('organization_id', orgId)
      .order('name'),
  );
}

export async function createTeam(
  orgId: string,
  name: string,
  divisionId?: string,
): Promise<TeamRow> {
  return one(
    supabase
      .from('teams')
      .insert({ organization_id: orgId, name, division_id: divisionId ?? null })
      .select()
      .single(),
  );
}

export async function createTeamSeason(
  orgId: string,
  teamId: string,
  seasonId: string,
): Promise<TeamSeasonRow> {
  return one(
    supabase
      .from('team_seasons')
      .insert({ organization_id: orgId, team_id: teamId, season_id: seasonId })
      .select()
      .single(),
  );
}

export async function listTeamSeasons(orgId: string, seasonId: string): Promise<TeamSeasonRow[]> {
  return many(
    supabase
      .from('team_seasons')
      .select('*')
      .eq('organization_id', orgId)
      .eq('season_id', seasonId),
  );
}

// ---- user ↔ person links ----

export type UserProfileWithPerson = UserProfileRow & { persons: PersonRow | null };

/** My person link in this org, or null when not linked yet. */
export async function getMyProfile(orgId: string): Promise<UserProfileWithPerson | null> {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw new Error('not signed in');
  const rows = await many<UserProfileWithPerson>(
    supabase
      .from('user_profiles')
      .select('*, persons(*)')
      .eq('organization_id', orgId)
      .eq('user_id', userData.user.id),
  );
  return rows[0] ?? null;
}

/** Org members who hold logins — member pickers (DMs, channels, role grants). */
export async function listOrgUserProfiles(orgId: string): Promise<UserProfileWithPerson[]> {
  return many(
    supabase.from('user_profiles').select('*, persons(*)').eq('organization_id', orgId),
  );
}

// ---- people / directory ----

export async function listPersons(orgId: string, search?: string): Promise<PersonRow[]> {
  let q = supabase.from('persons').select('*').eq('organization_id', orgId);
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`first_name.ilike.${s},last_name.ilike.${s}`);
  }
  return many(q.order('last_name').order('first_name').limit(200));
}

export async function getPerson(personId: string): Promise<PersonRow> {
  return one(supabase.from('persons').select('*').eq('id', personId).single());
}

export async function createPerson(
  orgId: string,
  fields: Pick<PersonRow, 'first_name' | 'last_name'> &
    Partial<Pick<PersonRow, 'date_of_birth' | 'email' | 'phone'>>,
): Promise<PersonRow> {
  return one(
    supabase.from('persons').insert({ organization_id: orgId, ...fields }).select().single(),
  );
}

export type GuardianshipWithPersons = GuardianshipRow & {
  guardian: PersonRow | null;
  player: PersonRow | null;
};

export async function listGuardianshipsFor(personId: string): Promise<GuardianshipWithPersons[]> {
  return many(
    supabase
      .from('guardianships')
      .select('*, guardian:persons!guardianships_guardian_person_id_fkey(*), player:persons!guardianships_player_person_id_fkey(*)')
      .or(`guardian_person_id.eq.${personId},player_person_id.eq.${personId}`),
  );
}

export async function createGuardianship(
  orgId: string,
  guardianPersonId: string,
  playerPersonId: string,
  relationship?: string,
): Promise<GuardianshipRow> {
  return one(
    supabase
      .from('guardianships')
      .insert({
        organization_id: orgId,
        guardian_person_id: guardianPersonId,
        player_person_id: playerPersonId,
        relationship: relationship ?? null,
      })
      .select()
      .single(),
  );
}

// ---- roster ----

export type RosterEntry = RosterMembershipRow & { persons: PersonRow | null };

export async function getRoster(teamSeasonId: string): Promise<RosterEntry[]> {
  return many(
    supabase
      .from('roster_memberships')
      .select('*, persons(*)')
      .eq('team_season_id', teamSeasonId)
      .order('jersey_number'),
  );
}

export async function addToRoster(
  orgId: string,
  teamSeasonId: string,
  personId: string,
  role: 'player' | 'coach' | 'scorekeeper' = 'player',
  jerseyNumber?: string,
): Promise<RosterMembershipRow> {
  return one(
    supabase
      .from('roster_memberships')
      .insert({
        organization_id: orgId,
        team_season_id: teamSeasonId,
        person_id: personId,
        role,
        jersey_number: jerseyNumber ?? null,
      })
      .select()
      .single(),
  );
}

// ---- invites ----

export async function createInvite(
  orgId: string,
  invite: {
    email: string;
    role: Exclude<OrgRole, 'owner'>;
    personId?: string;
    teamId?: string;
  },
): Promise<InviteRow> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error('not signed in');
  return one(
    supabase
      .from('invites')
      .insert({
        organization_id: orgId,
        email: invite.email,
        role: invite.role,
        person_id: invite.personId ?? null,
        scope_type: invite.teamId ? 'team' : 'organization',
        team_id: invite.teamId ?? null,
        created_by: userData.user.id,
      })
      .select()
      .single(),
  );
}

export async function listInvites(orgId: string): Promise<InviteRow[]> {
  return many(
    supabase
      .from('invites')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  );
}
