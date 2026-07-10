/**
 * Data-access layer, scoped roles — CONTRACT FILE (PM-owned, auth-critical).
 * org_roles writes are owner-only in the database (schema v1, intentionally
 * conservative; division_admin grant scoping is a Phase-1 review item). This
 * module adds no escalation path: grants/revokes go straight to the table and
 * RLS decides. Display joins resolve user → person name via user_profiles.
 */
import type { OrgRole, OrgRoleRow, PersonRow, RoleScope, UserProfileRow } from '@courtside/shared';

import { supabase } from '../supabase';
import { many, one } from './_helpers';

export type OrgRoleWithPerson = OrgRoleRow & {
  user_profiles: (UserProfileRow & { persons: PersonRow | null }) | null;
};

/** All role grants in the org (admins) or your own (everyone else) — RLS decides. */
export async function listOrgRoles(orgId: string): Promise<OrgRoleWithPerson[]> {
  return many(
    supabase
      .from('org_roles')
      .select('*, user_profiles!org_roles_user_id_fkey(*, persons(*))')
      .eq('organization_id', orgId)
      .order('created_at'),
  );
}

export async function listMyRoles(orgId: string): Promise<OrgRoleRow[]> {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw new Error('not signed in');
  return many(
    supabase
      .from('org_roles')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', userData.user.id),
  );
}

export interface RoleGrant {
  userId: string;
  role: OrgRole;
  scopeType: RoleScope;
  divisionId?: string;
  teamId?: string;
}

/** Owner-only (RLS). Scope columns must match scopeType. */
export async function grantRole(orgId: string, grant: RoleGrant): Promise<OrgRoleRow> {
  return one(
    supabase
      .from('org_roles')
      .insert({
        organization_id: orgId,
        user_id: grant.userId,
        role: grant.role,
        scope_type: grant.scopeType,
        division_id: grant.scopeType === 'division' ? (grant.divisionId ?? null) : null,
        team_id: grant.scopeType === 'team' ? (grant.teamId ?? null) : null,
      })
      .select()
      .single(),
  );
}

/** Owner-only (RLS). */
export async function revokeRole(roleId: string): Promise<void> {
  const { error } = await supabase.from('org_roles').delete().eq('id', roleId);
  if (error) throw new Error(error.message);
}
