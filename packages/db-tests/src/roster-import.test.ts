/**
 * db-tests for BE-4 (CSV roster import).
 *
 * Exercises `importRoster` (apps/mobile/src/lib/data/roster-import.ts)
 * directly against a live Supabase stack, imported by relative path — that
 * file never imports the RN singleton at module scope (see its header
 * comment), so it loads fine here as long as a `client` is always passed
 * explicitly, which every test below does.
 *
 * Same pattern as rls.test.ts / rls-team-archive.test.ts: env-skips cleanly
 * with no database up, owns its own fixture org/users (independent runId).
 */
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseRosterCsv } from '@courtside/shared';

import { importRoster } from '../../../apps/mobile/src/lib/data/roster-import';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const envReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);

if (!envReady) {
  describe.skip(
    'roster import (BE-4) — SKIPPED: set SUPABASE_URL / SUPABASE_ANON_KEY / ' +
      'SUPABASE_SERVICE_ROLE_KEY (see packages/db-tests/README.md)',
    () => {
      it('skipped — no database configured', () => {});
    },
  );
} else {
  runSuite();
}

const CSV_HEADER = [
  'first_name',
  'last_name',
  'date_of_birth',
  'role',
  'jersey_number',
  'guardian1_first_name',
  'guardian1_last_name',
  'guardian1_email',
  'guardian1_phone',
  'guardian1_relationship',
  'guardian2_first_name',
  'guardian2_last_name',
  'guardian2_email',
  'guardian2_phone',
  'guardian2_relationship',
  'media_consent',
] as const;

type CsvFields = Partial<Record<(typeof CSV_HEADER)[number], string>>;

/** One-row CSV text (header + one data row) for a single importRoster call. */
function csvRow(fields: CsvFields): string {
  const row = CSV_HEADER.map((col) => fields[col] ?? '').join(',');
  return `${CSV_HEADER.join(',')}\n${row}\n`;
}

function runSuite(): void {
  const url = SUPABASE_URL as string;
  const anonKey = SUPABASE_ANON_KEY as string;
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY as string;

  const runId = randomUUID().replace(/-/g, '').slice(0, 8);
  const FIXTURE_PASSWORD = 'Courtside-DbTests-Fixture-1!';

  function freshClient(key: string): SupabaseClient {
    return createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }

  interface FixtureUser {
    id: string;
    email: string;
  }

  describe('roster import (BE-4)', () => {
    let serviceClient: SupabaseClient;

    let staffUser: FixtureUser; // division_admin — can write persons, guardianships, roster_memberships, media_consents
    let parentUser: FixtureUser; // cannot write any of the above

    let staffClient: SupabaseClient;
    let parentClient: SupabaseClient;

    let orgId: string;
    let teamSeasonId: string;

    async function createFixtureUser(label: string): Promise<FixtureUser> {
      const email = `db-tests-import-${label}-${runId}@example.com`;
      const { data, error } = await serviceClient.auth.admin.createUser({
        email,
        password: FIXTURE_PASSWORD,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(`failed to create fixture user "${label}": ${error?.message ?? 'no user returned'}`);
      }
      return { id: data.user.id, email };
    }

    async function signIn(email: string): Promise<SupabaseClient> {
      const client = freshClient(anonKey);
      const { error } = await client.auth.signInWithPassword({ email, password: FIXTURE_PASSWORD });
      if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
      return client;
    }

    beforeAll(async () => {
      serviceClient = freshClient(serviceRoleKey);

      staffUser = await createFixtureUser('staff');
      parentUser = await createFixtureUser('parent');

      const { data: org, error: orgErr } = await serviceClient
        .from('organizations')
        .insert({ name: `DB Tests Org Import ${runId}`, slug: `db-tests-import-${runId}` })
        .select()
        .single();
      if (orgErr || !org) throw new Error(`failed to create fixture org: ${orgErr?.message}`);
      orgId = org.id;

      const { error: rolesErr } = await serviceClient.from('org_roles').insert([
        { organization_id: orgId, user_id: staffUser.id, role: 'division_admin', scope_type: 'organization' },
        { organization_id: orgId, user_id: parentUser.id, role: 'parent', scope_type: 'organization' },
      ]);
      if (rolesErr) throw new Error(`failed to seed org_roles: ${rolesErr.message}`);

      const { data: season, error: seasonErr } = await serviceClient
        .from('seasons')
        .insert({ organization_id: orgId, name: 'Winter 2026' })
        .select()
        .single();
      if (seasonErr || !season) throw new Error(`failed to create fixture season: ${seasonErr?.message}`);

      const { data: team, error: teamErr } = await serviceClient
        .from('teams')
        .insert({ organization_id: orgId, name: `Roster Import Team ${runId}` })
        .select()
        .single();
      if (teamErr || !team) throw new Error(`failed to create fixture team: ${teamErr?.message}`);

      const { data: teamSeason, error: tsErr } = await serviceClient
        .from('team_seasons')
        .insert({ organization_id: orgId, team_id: team.id, season_id: season.id })
        .select()
        .single();
      if (tsErr || !teamSeason) throw new Error(`failed to create fixture team_season: ${tsErr?.message}`);
      teamSeasonId = teamSeason.id;

      staffClient = await signIn(staffUser.email);
      parentClient = await signIn(parentUser.email);
    });

    afterAll(async () => {
      if (!serviceClient) return;
      if (orgId) {
        await serviceClient.from('organizations').delete().eq('id', orgId);
      }
      for (const user of [staffUser, parentUser].filter(Boolean)) {
        await serviceClient.auth.admin.deleteUser(user.id);
      }
    });

    // 1. Staff (division_admin) can import a full row: person, guardian,
    // membership, and consent all get created and are actually persisted.
    it('staff can import a roster row (person, guardian, membership, consent all created)', async () => {
      const { rows, errors } = parseRosterCsv(
        csvRow({
          first_name: 'Iris',
          last_name: `Carter-${runId}`,
          date_of_birth: '2015-05-05',
          role: 'player',
          jersey_number: '10',
          guardian1_first_name: 'Mona',
          guardian1_last_name: `Carter-${runId}`,
          guardian1_email: 'mona@example.com',
          guardian1_relationship: 'mother',
          media_consent: 'true',
        }),
      );
      expect(errors).toEqual([]);

      const result = await importRoster(orgId, teamSeasonId, rows, { client: staffClient });
      expect(result.rows).toHaveLength(1);
      const r = result.rows[0]!;

      expect(r.person.outcome).toBe('created');
      expect(r.person.personId).toBeTruthy();
      expect(r.guardians).toHaveLength(1);
      expect(r.guardians[0]!.outcome).toBe('created');
      expect(r.membership.outcome).toBe('created');
      expect(r.consent.outcome).toBe('created');

      const { data: person } = await serviceClient
        .from('persons')
        .select('*')
        .eq('id', r.person.personId!)
        .single();
      expect(person?.first_name).toBe('Iris');

      const { data: guardianship } = await serviceClient
        .from('guardianships')
        .select('*')
        .eq('id', r.guardians[0]!.guardianshipId!)
        .single();
      expect(guardianship?.player_person_id).toBe(r.person.personId);

      const { data: membership } = await serviceClient
        .from('roster_memberships')
        .select('*')
        .eq('id', r.membership.membershipId!)
        .single();
      expect(membership?.role).toBe('player');
      expect(membership?.jersey_number).toBe('10');

      const { data: consents } = await serviceClient
        .from('media_consents')
        .select('*')
        .eq('player_person_id', r.person.personId!);
      expect(consents).toHaveLength(1);
      expect(consents?.[0]?.granted).toBe(true);
    });

    // 2. Parent role is blocked at every write: person insert is denied by
    // RLS (persons_insert requires owner/division_admin/coach), which
    // cascades to guardian/membership/consent as "error", and nothing lands
    // in the database.
    it('a parent-role user cannot import (RLS denies the person insert, cascades)', async () => {
      const lastName = `Bennett-${runId}`;
      const { rows, errors } = parseRosterCsv(
        csvRow({
          first_name: 'Leo',
          last_name: lastName,
          date_of_birth: '2016-01-01',
          role: 'player',
          guardian1_first_name: 'Nora',
          guardian1_last_name: lastName,
          media_consent: 'true',
        }),
      );
      expect(errors).toEqual([]);

      const result = await importRoster(orgId, teamSeasonId, rows, { client: parentClient });
      const r = result.rows[0]!;

      expect(r.person.outcome).toBe('error');
      expect(r.person.error).toBeTruthy();
      expect(r.guardians[0]!.outcome).toBe('error');
      expect(r.membership.outcome).toBe('error');
      expect(r.consent.outcome).toBe('error');

      const { data: leaked } = await serviceClient
        .from('persons')
        .select('id')
        .eq('organization_id', orgId)
        .eq('last_name', lastName);
      expect(leaked ?? []).toHaveLength(0);
    });

    // 3. Re-running the same CSV row is idempotent: the second run matches
    // existing rows instead of duplicating them. A changed media_consent
    // value on a third run still writes (append-only history), proving
    // idempotency is value-aware, not a blanket skip.
    it('re-running the same CSV row is idempotent (matches, does not duplicate)', async () => {
      const lastName = `Shah-${runId}`;
      const csv = csvRow({
        first_name: 'Priya',
        last_name: lastName,
        date_of_birth: '2013-03-03',
        role: 'player',
        jersey_number: '21',
        guardian1_first_name: 'Anil',
        guardian1_last_name: lastName,
        guardian1_relationship: 'father',
        media_consent: 'false',
      });

      const first = await importRoster(orgId, teamSeasonId, parseRosterCsv(csv).rows, { client: staffClient });
      const r1 = first.rows[0]!;
      expect(r1.person.outcome).toBe('created');
      expect(r1.guardians[0]!.outcome).toBe('created');
      expect(r1.membership.outcome).toBe('created');
      expect(r1.consent.outcome).toBe('created');

      const second = await importRoster(orgId, teamSeasonId, parseRosterCsv(csv).rows, { client: staffClient });
      const r2 = second.rows[0]!;
      expect(r2.person.outcome).toBe('matched');
      expect(r2.person.personId).toBe(r1.person.personId);
      expect(r2.guardians[0]!.outcome).toBe('matched');
      expect(r2.guardians[0]!.guardianshipId).toBe(r1.guardians[0]!.guardianshipId);
      expect(r2.membership.outcome).toBe('matched');
      expect(r2.membership.membershipId).toBe(r1.membership.membershipId);
      expect(r2.consent.outcome).toBe('matched');

      const { data: personRows } = await serviceClient
        .from('persons')
        .select('id')
        .eq('organization_id', orgId)
        .eq('last_name', lastName)
        .eq('first_name', 'Priya');
      expect(personRows).toHaveLength(1);
      const { data: guardianshipRows } = await serviceClient
        .from('guardianships')
        .select('id')
        .eq('player_person_id', r1.person.personId!);
      expect(guardianshipRows).toHaveLength(1);
      const { data: membershipRows } = await serviceClient
        .from('roster_memberships')
        .select('id')
        .eq('team_season_id', teamSeasonId)
        .eq('person_id', r1.person.personId!);
      expect(membershipRows).toHaveLength(1);
      const { data: consentRows } = await serviceClient
        .from('media_consents')
        .select('granted')
        .eq('player_person_id', r1.person.personId!);
      expect(consentRows).toHaveLength(1);

      // A genuine consent change (revoke -> grant) is not a no-op re-run:
      // append-only history gets a new row, everything else still matches.
      const changed = csvRow({
        first_name: 'Priya',
        last_name: lastName,
        date_of_birth: '2013-03-03',
        role: 'player',
        jersey_number: '21',
        guardian1_first_name: 'Anil',
        guardian1_last_name: lastName,
        guardian1_relationship: 'father',
        media_consent: 'true',
      });
      const third = await importRoster(orgId, teamSeasonId, parseRosterCsv(changed).rows, { client: staffClient });
      const r3 = third.rows[0]!;
      expect(r3.person.outcome).toBe('matched');
      expect(r3.consent.outcome).toBe('created');

      const { data: consentRowsAfter } = await serviceClient
        .from('media_consents')
        .select('granted')
        .eq('player_person_id', r1.person.personId!)
        .order('created_at', { ascending: false });
      expect(consentRowsAfter).toHaveLength(2);
      expect(consentRowsAfter?.[0]?.granted).toBe(true);
    });

    // 4. The guardianship cap trigger still fires through the import path:
    // a player who already has 5 guardians gets a 6th link rejected with
    // "error", while the (independent) person match and membership write
    // still succeed.
    it('guardianship cap is enforced through import (6th guardian errors; membership still succeeds)', async () => {
      const lastName = `CapTest-${runId}`;
      const { data: player, error: playerErr } = await serviceClient
        .from('persons')
        .insert({
          organization_id: orgId,
          first_name: 'Devon',
          last_name: lastName,
          date_of_birth: '2012-07-07',
        })
        .select()
        .single();
      if (playerErr || !player) throw new Error(`failed to seed fixture player: ${playerErr?.message}`);

      for (let i = 0; i < 5; i++) {
        const { data: guardian, error: guardianErr } = await serviceClient
          .from('persons')
          .insert({
            organization_id: orgId,
            first_name: `ExistingGuardian${i}`,
            last_name: lastName,
          })
          .select()
          .single();
        if (guardianErr || !guardian) throw new Error(`failed to seed guardian ${i}: ${guardianErr?.message}`);

        const { error: linkErr } = await serviceClient.from('guardianships').insert({
          organization_id: orgId,
          guardian_person_id: guardian.id,
          player_person_id: player.id,
        });
        if (linkErr) throw new Error(`failed to seed guardianship ${i}: ${linkErr.message}`);
      }

      const { rows, errors } = parseRosterCsv(
        csvRow({
          first_name: 'Devon',
          last_name: lastName,
          date_of_birth: '2012-07-07',
          role: 'player',
          guardian1_first_name: 'GuardianSix',
          guardian1_last_name: lastName,
        }),
      );
      expect(errors).toEqual([]);

      const result = await importRoster(orgId, teamSeasonId, rows, { client: staffClient });
      const r = result.rows[0]!;

      expect(r.person.outcome).toBe('matched');
      expect(r.person.personId).toBe(player.id);
      expect(r.guardians[0]!.outcome).toBe('error');
      expect(r.guardians[0]!.error).toMatch(/guardianship cap/i);
      expect(r.membership.outcome).toBe('created');

      const { data: guardianships } = await serviceClient
        .from('guardianships')
        .select('id')
        .eq('player_person_id', player.id);
      expect(guardianships).toHaveLength(5);
    });

    // 5. Guardian columns on a non-player row must never create a real
    // guardianship (fix for the review-blocking finding: this was reachable
    // even by a staff/division_admin actor before the parser rejected it —
    // proving the guard is in parseRosterCsv, not incidental to RLS).
    it('guardian columns on a non-player row are rejected before any write, even for a privileged actor', async () => {
      const lastName = `CoachGuardian-${runId}`;
      const csv = csvRow({
        first_name: 'Pat',
        last_name: lastName,
        role: 'coach',
        guardian2_first_name: 'Sly',
        guardian2_last_name: lastName,
      });

      const { rows, errors } = parseRosterCsv(csv);
      expect(rows).toEqual([]);
      expect(errors).toEqual([
        { line: 2, message: 'guardian2_* columns are only allowed on player rows' },
      ]);

      const result = await importRoster(orgId, teamSeasonId, rows, { client: staffClient });
      expect(result.rows).toEqual([]);

      const { data: coachPersons } = await serviceClient
        .from('persons')
        .select('id')
        .eq('organization_id', orgId)
        .eq('last_name', lastName);
      expect(coachPersons ?? []).toHaveLength(0);
      const { data: guardianPersons } = await serviceClient
        .from('persons')
        .select('id')
        .eq('organization_id', orgId)
        .eq('first_name', 'Sly');
      expect(guardianPersons ?? []).toHaveLength(0);
    });
  });
}
