/**
 * @courtside/shared — cross-app domain contract.
 *
 * CONTRACT FILE: frozen during delegation waves; changes land only between waves,
 * PM-authored, alongside the matching Supabase migration.
 */

// ---- Roles & scopes (mirrors org_roles in schema v1) ----

export const ORG_ROLES = [
  'owner',
  'division_admin',
  'coach',
  'scorekeeper',
  'parent',
  'follower',
] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ROLE_SCOPES = ['organization', 'division', 'team'] as const;
export type RoleScope = (typeof ROLE_SCOPES)[number];

// ---- Scheduling ----

export const EVENT_TYPES = ['game', 'practice', 'general'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const RSVP_STATUSES = ['going', 'not_going', 'unanswered'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

// ---- Scorekeeping (append-only game_events log; stats are always derived) ----

export const GAME_EVENT_TYPES = [
  'fg2_made',
  'fg2_missed',
  'fg3_made',
  'fg3_missed',
  'ft_made',
  'ft_missed',
  'rebound_off',
  'rebound_def',
  'assist',
  'steal',
  'block',
  'turnover',
  'foul_personal',
  'foul_technical',
  'timeout',
  'sub_in',
  'sub_out',
  'period_start',
  'period_end',
  'game_final',
] as const;
export type GameEventType = (typeof GAME_EVENT_TYPES)[number];

export const PERIOD_FORMATS = ['quarters', 'halves'] as const;
export type PeriodFormat = (typeof PERIOD_FORMATS)[number];

/** How opponent play is recorded: whole-team score only, or per named opponent player. */
export const OPPONENT_SCORING_MODES = ['team_only', 'player_assignment'] as const;
export type OpponentScoringMode = (typeof OPPONENT_SCORING_MODES)[number];

// ---- People (COPPA invariant: under-13s are person records, never login accounts) ----

export const GUARDIANSHIP_MAX_PER_PLAYER = 5;
export const PLAYER_LOGIN_MIN_AGE = 13;

// ---- Database row types (mirror schema v1) ----

export * from './db';
