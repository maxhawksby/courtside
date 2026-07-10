/**
 * Admin data-access layer — CONTRACT FILE (PM-owned, read-heavy).
 * Mirrors the mobile contract's shapes (apps/mobile/src/lib/data) so both
 * apps present the same picture. Feature pages call these; they never query
 * supabase directly. RLS applies to the signed-in admin like anyone else.
 */
import type {
  DivisionRow,
  EventRow,
  HouseholdMemberRow,
  HouseholdRow,
  OrganizationRow,
  PersonRow,
  RosterMembershipRow,
  SeasonRow,
  TeamRow,
  TeamSeasonRow,
} from '@courtside/shared';

import { supabase } from './supabase';

async function many<T>(q: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMyOrganizations(): Promise<OrganizationRow[]> {
  return many(supabase.from('organizations').select('*').order('created_at'));
}

export async function listPersons(orgId: string, search?: string): Promise<PersonRow[]> {
  let q = supabase.from('persons').select('*').eq('organization_id', orgId);
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`first_name.ilike.${s},last_name.ilike.${s}`);
  }
  return many(q.order('last_name').order('first_name').limit(500));
}

export type TeamWithDivision = TeamRow & { divisions: Pick<DivisionRow, 'id' | 'name'> | null };

export async function listTeams(orgId: string): Promise<TeamWithDivision[]> {
  return many(
    supabase.from('teams').select('*, divisions(id, name)').eq('organization_id', orgId).order('name'),
  );
}

export async function listSeasons(orgId: string): Promise<SeasonRow[]> {
  return many(
    supabase
      .from('seasons')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  );
}

export async function listTeamSeasons(orgId: string, seasonId: string): Promise<TeamSeasonRow[]> {
  return many(
    supabase.from('team_seasons').select('*').eq('organization_id', orgId).eq('season_id', seasonId),
  );
}

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

export async function listEvents(
  orgId: string,
  filters: { teamSeasonId?: string; from?: string; to?: string } = {},
): Promise<EventRow[]> {
  let q = supabase.from('events').select('*').eq('organization_id', orgId);
  if (filters.teamSeasonId) q = q.eq('team_season_id', filters.teamSeasonId);
  if (filters.from) q = q.gte('starts_at', filters.from);
  if (filters.to) q = q.lt('starts_at', filters.to);
  return many(q.order('starts_at').limit(500));
}

export type HouseholdWithMembers = HouseholdRow & {
  household_members: (HouseholdMemberRow & { persons: PersonRow | null })[];
};

export async function listHouseholds(orgId: string): Promise<HouseholdWithMembers[]> {
  return many(
    supabase
      .from('households')
      .select('*, household_members(*, persons(*))')
      .eq('organization_id', orgId)
      .order('name'),
  );
}
