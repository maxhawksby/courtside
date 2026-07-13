/**
 * Hand-written row types mirroring supabase/migrations/20260709000001_schema_v1.sql.
 * CONTRACT FILE. Replace with `supabase gen types` output once a database is
 * linked; until then, keep 1:1 with the migration (PM updates both together).
 */

import type {
  EventType,
  GameEventType,
  OpponentScoringMode,
  OrgRole,
  PeriodFormat,
  RoleScope,
  RsvpStatus,
} from './index';

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  branding: Record<string, unknown>;
  created_at: string;
}

export interface DivisionRow {
  id: string;
  organization_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface SeasonRow {
  id: string;
  organization_id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}

export interface TeamRow {
  id: string;
  organization_id: string;
  division_id: string | null;
  name: string;
  created_at: string;
  archived_at: string | null;
}

export interface TeamSeasonRow {
  id: string;
  organization_id: string;
  team_id: string;
  season_id: string;
  created_at: string;
}

export interface PersonRow {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  photo_path: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PersonSensitiveRow {
  person_id: string;
  organization_id: string;
  medical_notes: string | null;
  emergency_contact: Record<string, unknown> | null;
  updated_at: string;
}

export interface HouseholdRow {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface HouseholdMemberRow {
  household_id: string;
  person_id: string;
  organization_id: string;
  is_owner: boolean;
}

export interface GuardianshipRow {
  id: string;
  organization_id: string;
  guardian_person_id: string;
  player_person_id: string;
  relationship: string | null;
  created_at: string;
}

export interface UserProfileRow {
  user_id: string;
  person_id: string;
  organization_id: string;
  created_at: string;
}

export interface OrgRoleRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  scope_type: RoleScope;
  division_id: string | null;
  team_id: string | null;
  created_at: string;
}

export interface InviteRow {
  id: string;
  organization_id: string;
  email: string;
  person_id: string | null;
  role: Exclude<OrgRole, 'owner'>;
  scope_type: RoleScope;
  division_id: string | null;
  team_id: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_by: string;
  created_at: string;
}

export interface RosterMembershipRow {
  id: string;
  organization_id: string;
  team_season_id: string;
  person_id: string;
  role: 'player' | 'coach' | 'scorekeeper';
  jersey_number: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  organization_id: string;
  team_season_id: string | null;
  type: EventType;
  title: string | null;
  starts_at: string;
  arrival_at: string | null;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  recurrence: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RsvpRow {
  id: string;
  organization_id: string;
  event_id: string;
  person_id: string;
  status: RsvpStatus;
  responded_by: string | null;
  updated_at: string;
}

export interface GameRow {
  id: string;
  organization_id: string;
  event_id: string;
  team_season_id: string;
  opponent_name: string;
  is_home: boolean;
  period_format: PeriodFormat;
  opponent_scoring_mode: OpponentScoringMode;
  status: 'scheduled' | 'live' | 'final';
  scorekeeper_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameEventRow {
  id: string;
  organization_id: string;
  game_id: string;
  client_uuid: string;
  device_id: string;
  client_seq: number;
  event_type: GameEventType;
  period: number;
  clock_seconds: number | null;
  person_id: string | null;
  opponent_player: string | null;
  payload: Record<string, unknown>;
  voided_at: string | null;
  voided_by: string | null;
  created_at: string;
}

export interface ChannelRow {
  id: string;
  organization_id: string;
  team_season_id: string | null;
  name: string;
  is_all_hands: boolean;
  is_read_only: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ChannelMemberRow {
  channel_id: string;
  user_id: string;
  organization_id: string;
  muted: boolean;
  last_read_at: string | null;
}

export interface MessageRow {
  id: string;
  organization_id: string;
  channel_id: string;
  sender_user_id: string;
  body: string | null;
  media_paths: string[];
  /** SafeSport audit flag: sent 8pm–8am sender-local (see shared isOutOfHours). */
  out_of_hours: boolean;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface MediaConsentRow {
  id: string;
  organization_id: string;
  player_person_id: string;
  granted_by_user_id: string;
  granted: boolean;
  note: string | null;
  created_at: string;
}
