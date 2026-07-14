/**
 * Data-access layer, CSV roster import (BE-4) — CONTRACT FILE (PM-owned).
 * Bulk-imports `parseRosterCsv` rows into an org: persons, guardianships,
 * roster_memberships, optional media_consents — idempotently, with a
 * per-row/per-entity outcome so a partial import (e.g. RLS denies one
 * guardianship) is visible instead of silently dropped or a hard failure.
 *
 * Dedup/idempotency has two layers:
 *   - persons has no unique constraint (schema v1: the dedup index is
 *     advisory, merge tooling comes later), so idempotency is a
 *     find-before-insert check against org + lower(name) + dob.
 *   - guardianships and roster_memberships DO have unique constraints; a
 *     duplicate-key insert on re-run is treated as `matched`, same as a
 *     pre-existing row found on the initial select.
 *   - media_consents is append-only by design (COMPLIANCE.md §5 — full
 *     revocable history), so idempotency compares against the *effective*
 *     (newest) consent instead of relying on a constraint: a re-run that
 *     asks for the same grant/revoke writes nothing new.
 *
 * Every write here is RLS-gated exactly like the rest of the app — this
 * module makes zero elevated calls. In practice that means a coach (who can
 * create persons and roster_memberships but NOT guardianships or
 * media_consents — schema v1 keeps those admin-only) importing a roster
 * with guardian/consent columns gets `created` on the player and roster slot
 * but `error` on the guardian link and consent row. That is intentional,
 * surfaced per-row rather than failing the whole import.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PersonRow, RosterCsvRow, RosterRowRole } from '@courtside/shared';

export type ImportEntityOutcome = 'created' | 'matched' | 'skipped' | 'error';

export interface ImportPersonOutcome {
  outcome: ImportEntityOutcome;
  personId?: string;
  error?: string;
}

export interface ImportGuardianOutcome {
  outcome: ImportEntityOutcome;
  personId?: string;
  guardianshipId?: string;
  error?: string;
}

export interface ImportMembershipOutcome {
  outcome: ImportEntityOutcome;
  membershipId?: string;
  error?: string;
}

export interface ImportConsentOutcome {
  outcome: ImportEntityOutcome;
  error?: string;
}

export interface RosterImportRowResult {
  line: number;
  person: ImportPersonOutcome;
  guardians: ImportGuardianOutcome[];
  membership: ImportMembershipOutcome;
  consent: ImportConsentOutcome;
}

export interface ImportRosterResult {
  rows: RosterImportRowResult[];
}

export interface ImportRosterOptions {
  /**
   * Supabase client to act as. Defaults to the app singleton, loaded lazily
   * (dynamic import) so this module has no top-level dependency on
   * '../supabase' — that file throws at import time without
   * EXPO_PUBLIC_SUPABASE_* env vars and pulls in RN-only modules
   * (AsyncStorage, the URL polyfill), which makes it unimportable from a
   * plain Node test process. Passing `client` explicitly (as db-tests does,
   * one per fixture role) sidesteps all of that.
   */
  client?: SupabaseClient;
}

const DUPLICATE_KEY = '23505';

function isDuplicateKeyError(error: { code?: string } | null): boolean {
  return error?.code === DUPLICATE_KEY;
}

async function findExistingPerson(
  client: SupabaseClient,
  orgId: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string | null,
): Promise<PersonRow | null> {
  let query = client
    .from('persons')
    .select('*')
    .eq('organization_id', orgId)
    .ilike('first_name', firstName)
    .ilike('last_name', lastName);
  query = dateOfBirth ? query.eq('date_of_birth', dateOfBirth) : query.is('date_of_birth', null);

  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  return (data?.[0] as PersonRow | undefined) ?? null;
}

async function findOrCreatePerson(
  client: SupabaseClient,
  orgId: string,
  fields: {
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    custom_fields?: Record<string, string>;
  },
): Promise<{ outcome: ImportEntityOutcome; person?: PersonRow; error?: string }> {
  const existing = await findExistingPerson(
    client,
    orgId,
    fields.first_name,
    fields.last_name,
    fields.date_of_birth,
  );
  if (existing) return { outcome: 'matched', person: existing };

  const { data, error } = await client
    .from('persons')
    .insert({
      organization_id: orgId,
      first_name: fields.first_name,
      last_name: fields.last_name,
      date_of_birth: fields.date_of_birth,
      custom_fields: fields.custom_fields ?? {},
    })
    .select()
    .single();
  if (error) return { outcome: 'error', error: error.message };
  return { outcome: 'created', person: data as PersonRow };
}

async function findOrCreateGuardianship(
  client: SupabaseClient,
  orgId: string,
  guardianPersonId: string,
  playerPersonId: string,
  relationship: string | null,
): Promise<{ outcome: ImportEntityOutcome; guardianshipId?: string; error?: string }> {
  const { data: existing, error: selectError } = await client
    .from('guardianships')
    .select('id')
    .eq('guardian_person_id', guardianPersonId)
    .eq('player_person_id', playerPersonId)
    .limit(1);
  if (selectError) return { outcome: 'error', error: selectError.message };
  if (existing && existing.length > 0) {
    return { outcome: 'matched', guardianshipId: (existing[0] as { id: string }).id };
  }

  const { data, error } = await client
    .from('guardianships')
    .insert({
      organization_id: orgId,
      guardian_person_id: guardianPersonId,
      player_person_id: playerPersonId,
      relationship,
    })
    .select()
    .single();
  if (error) {
    if (isDuplicateKeyError(error)) {
      const { data: raceWinner } = await client
        .from('guardianships')
        .select('id')
        .eq('guardian_person_id', guardianPersonId)
        .eq('player_person_id', playerPersonId)
        .limit(1);
      if (raceWinner && raceWinner.length > 0) {
        return { outcome: 'matched', guardianshipId: (raceWinner[0] as { id: string }).id };
      }
    }
    return { outcome: 'error', error: error.message };
  }
  return { outcome: 'created', guardianshipId: (data as { id: string }).id };
}

async function findOrCreateMembership(
  client: SupabaseClient,
  orgId: string,
  teamSeasonId: string,
  personId: string,
  role: RosterRowRole,
  jerseyNumber: string | null,
): Promise<{ outcome: ImportEntityOutcome; membershipId?: string; error?: string }> {
  const { data: existing, error: selectError } = await client
    .from('roster_memberships')
    .select('id')
    .eq('team_season_id', teamSeasonId)
    .eq('person_id', personId)
    .limit(1);
  if (selectError) return { outcome: 'error', error: selectError.message };
  if (existing && existing.length > 0) {
    return { outcome: 'matched', membershipId: (existing[0] as { id: string }).id };
  }

  const { data, error } = await client
    .from('roster_memberships')
    .insert({
      organization_id: orgId,
      team_season_id: teamSeasonId,
      person_id: personId,
      role,
      jersey_number: jerseyNumber,
    })
    .select()
    .single();
  if (error) {
    if (isDuplicateKeyError(error)) {
      const { data: raceWinner } = await client
        .from('roster_memberships')
        .select('id')
        .eq('team_season_id', teamSeasonId)
        .eq('person_id', personId)
        .limit(1);
      if (raceWinner && raceWinner.length > 0) {
        return { outcome: 'matched', membershipId: (raceWinner[0] as { id: string }).id };
      }
    }
    return { outcome: 'error', error: error.message };
  }
  return { outcome: 'created', membershipId: (data as { id: string }).id };
}

/** Compares against the effective (newest) consent row — see file header. */
async function writeConsentIfChanged(
  client: SupabaseClient,
  orgId: string,
  playerPersonId: string,
  granted: boolean,
): Promise<ImportConsentOutcome> {
  const { data: existing, error: selectError } = await client
    .from('media_consents')
    .select('granted')
    .eq('player_person_id', playerPersonId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (selectError) return { outcome: 'error', error: selectError.message };
  if (existing && existing.length > 0 && (existing[0] as { granted: boolean }).granted === granted) {
    return { outcome: 'matched' };
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return { outcome: 'error', error: 'not signed in' };

  const { error } = await client.from('media_consents').insert({
    organization_id: orgId,
    player_person_id: playerPersonId,
    granted_by_user_id: userData.user.id,
    granted,
  });
  if (error) return { outcome: 'error', error: error.message };
  return { outcome: 'created' };
}

/**
 * Import parsed roster rows (from `parseRosterCsv`) into an org/team-season.
 * Safe to re-run on the same CSV: unchanged rows come back `matched`, not
 * duplicated. Every sub-entity (person, each guardian, membership, consent)
 * reports its own outcome — a permission error on one doesn't abort the row.
 */
export async function importRoster(
  orgId: string,
  teamSeasonId: string,
  rows: RosterCsvRow[],
  opts: ImportRosterOptions = {},
): Promise<ImportRosterResult> {
  const client = opts.client ?? (await import('../supabase')).supabase;
  const results: RosterImportRowResult[] = [];

  for (const row of rows) {
    const personResult = await findOrCreatePerson(client, orgId, {
      first_name: row.first_name,
      last_name: row.last_name,
      date_of_birth: row.date_of_birth,
      custom_fields: row.custom_fields,
    });

    if (personResult.outcome === 'error' || !personResult.person) {
      const cascadeError = 'skipped: person import failed';
      results.push({
        line: row.line,
        person: { outcome: 'error', error: personResult.error },
        guardians: row.guardians.map(() => ({ outcome: 'error' as const, error: cascadeError })),
        membership: { outcome: 'error', error: cascadeError },
        consent: { outcome: 'error', error: cascadeError },
      });
      continue;
    }

    const personId = personResult.person.id;

    // Guardian links are player-only (see parseRosterCsv — a non-player row
    // with guardian data is rejected before it ever gets here). Guarding
    // again here means a future parser change can't silently turn into a
    // guardianship against a coach/scorekeeper's person record.
    const guardianResults: ImportGuardianOutcome[] = [];
    if (row.role === 'player') {
      for (const guardian of row.guardians) {
        const guardianPersonResult = await findOrCreatePerson(client, orgId, {
          first_name: guardian.first_name,
          last_name: guardian.last_name,
          date_of_birth: null,
        });
        if (guardianPersonResult.outcome === 'error' || !guardianPersonResult.person) {
          guardianResults.push({ outcome: 'error', error: guardianPersonResult.error });
          continue;
        }
        const link = await findOrCreateGuardianship(
          client,
          orgId,
          guardianPersonResult.person.id,
          personId,
          guardian.relationship,
        );
        guardianResults.push({
          outcome: link.outcome,
          personId: guardianPersonResult.person.id,
          guardianshipId: link.guardianshipId,
          error: link.error,
        });
      }
    }

    const membershipResult = await findOrCreateMembership(
      client,
      orgId,
      teamSeasonId,
      personId,
      row.role,
      row.jersey_number,
    );

    const consentResult: ImportConsentOutcome =
      row.media_consent === null
        ? { outcome: 'skipped' }
        : await writeConsentIfChanged(client, orgId, personId, row.media_consent);

    results.push({
      line: row.line,
      person: { outcome: personResult.outcome, personId },
      guardians: guardianResults,
      membership: {
        outcome: membershipResult.outcome,
        membershipId: membershipResult.membershipId,
        error: membershipResult.error,
      },
      consent: consentResult,
    });
  }

  return { rows: results };
}
