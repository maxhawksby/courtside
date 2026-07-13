/**
 * Row types, aliased over the generated DB types. CONTRACT FILE.
 *
 * db.generated.ts (output of `supabase gen types`) is the source of truth for
 * column presence and nullability; regenerate it after any migration —
 * scripts/check-db-types.sh fails the build on drift. Text columns constrained
 * by CHECK (role, status, type, ...) generate as plain `string` and jsonb
 * generates as `Json`, so the aliases below re-narrow those columns to the
 * curated app-level unions/shapes. Every exported name keeps exactly the shape
 * it had as a hand-written interface — zero import churn for consumers.
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
import type { Database, Tables } from './db.generated';

/**
 * A generated Row with named columns re-narrowed. The Overrides constraint
 * rejects keys that are not real columns, so a renamed/dropped column breaks
 * the alias here instead of silently widening downstream.
 */
type Narrowed<
  TableName extends keyof Database['public']['Tables'],
  Overrides extends { [K in keyof Tables<TableName>]?: unknown },
> = Omit<Tables<TableName>, keyof Overrides> & Overrides;

export type OrganizationRow = Narrowed<'organizations', { branding: Record<string, unknown> }>;

export type DivisionRow = Tables<'divisions'>;

export type SeasonRow = Tables<'seasons'>;

export type TeamRow = Tables<'teams'>;

export type TeamSeasonRow = Tables<'team_seasons'>;

export type PersonRow = Narrowed<'persons', { custom_fields: Record<string, unknown> }>;

export type PersonSensitiveRow = Narrowed<
  'persons_sensitive',
  { emergency_contact: Record<string, unknown> | null }
>;

export type HouseholdRow = Tables<'households'>;

export type HouseholdMemberRow = Tables<'household_members'>;

export type GuardianshipRow = Tables<'guardianships'>;

export type UserProfileRow = Tables<'user_profiles'>;

export type OrgRoleRow = Narrowed<'org_roles', { role: OrgRole; scope_type: RoleScope }>;

export type InviteRow = Narrowed<
  'invites',
  { role: Exclude<OrgRole, 'owner'>; scope_type: RoleScope }
>;

export type RosterMembershipRow = Narrowed<
  'roster_memberships',
  { role: 'player' | 'coach' | 'scorekeeper' }
>;

export type EventRow = Narrowed<
  'events',
  { type: EventType; recurrence: Record<string, unknown> | null }
>;

export type RsvpRow = Narrowed<'rsvps', { status: RsvpStatus }>;

export type GameRow = Narrowed<
  'games',
  {
    period_format: PeriodFormat;
    opponent_scoring_mode: OpponentScoringMode;
    status: 'scheduled' | 'live' | 'final';
  }
>;

export type GameEventRow = Narrowed<
  'game_events',
  { event_type: GameEventType; payload: Record<string, unknown> }
>;

export type ChannelRow = Tables<'channels'>;

export type ChannelMemberRow = Tables<'channel_members'>;

// messages.out_of_hours is the SafeSport audit flag: sent 8pm–8am sender-local
// (see shared isOutOfHours).
export type MessageRow = Tables<'messages'>;

export type MediaConsentRow = Tables<'media_consents'>;
