import type { DivisionRow, OrgRole, OrgRoleRow } from '@courtside/shared';

import type { TeamWithDivision } from '@/lib/data';

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  division_admin: 'Division admin',
  coach: 'Coach',
  scorekeeper: 'Scorekeeper',
  parent: 'Parent',
  follower: 'Follower',
};

/** Human-readable scope, e.g. "Org-wide", "Division: U12", "Team: Warriors". */
export function scopeLabel(
  role: Pick<OrgRoleRow, 'scope_type' | 'division_id' | 'team_id'>,
  divisions: DivisionRow[],
  teams: TeamWithDivision[],
): string {
  if (role.scope_type === 'division') {
    const division = divisions.find((d) => d.id === role.division_id);
    return division ? `Division: ${division.name}` : 'Division';
  }
  if (role.scope_type === 'team') {
    const team = teams.find((t) => t.id === role.team_id);
    return team ? `Team: ${team.name}` : 'Team';
  }
  return 'Org-wide';
}

/** RLS denials should never leak raw Postgres error text; normalize to the safety-rule copy. */
export function friendlyRoleError(e: unknown, fallback: string): string {
  const message = e instanceof Error ? e.message : fallback;
  return /permission|policy|rls|denied|not allowed/i.test(message)
    ? 'Only the organization owner can change roles.'
    : message;
}
