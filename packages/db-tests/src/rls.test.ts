/**
 * RLS policy tests for schema v1 (supabase/migrations/20260709000001_schema_v1.sql).
 *
 * These exercise the *real* Postgres policies and triggers against a running
 * Supabase instance — see ../README.md for how to point this at one. If the
 * required env vars are missing, the whole suite is skipped (not failed) so
 * this package is safe to run with no database up (e.g. before `supabase start`).
 */
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const envReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);

if (!envReady) {
  describe.skip(
    'RLS policies (schema v1) — SKIPPED: set SUPABASE_URL / SUPABASE_ANON_KEY / ' +
      'SUPABASE_SERVICE_ROLE_KEY (see packages/db-tests/README.md)',
    () => {
      it('skipped — no database configured', () => {});
    },
  );
} else {
  runSuite();
}

function runSuite(): void {
  const url = SUPABASE_URL as string;
  const anonKey = SUPABASE_ANON_KEY as string;
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY as string;

  // Unique per run so re-running against a database that still has a prior
  // (e.g. crashed) fixture run does not collide on unique constraints.
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

  describe('RLS policies (schema v1)', () => {
    let serviceClient: SupabaseClient;
    let anonClient: SupabaseClient;

    let ownerUser: FixtureUser;
    let parentUser: FixtureUser;
    let coachUser: FixtureUser;
    let followerUser: FixtureUser;
    // Extra auth users created inside individual tests (e.g. test 10), tracked
    // here so afterAll can delete them alongside the core fixture users.
    const extraUserIds: string[] = [];

    let orgId: string;
    let teamSeasonId: string;

    let ownerPersonId: string;
    let parentPersonId: string;
    let childPlayerId: string;
    let unrelatedPlayerId: string;
    let coachPersonId: string;

    let gameId: string;
    let messageId: string;

    let ownerClient: SupabaseClient;
    let parentClient: SupabaseClient;
    let coachClient: SupabaseClient;
    let followerClient: SupabaseClient;

    async function createFixtureUser(label: string): Promise<FixtureUser> {
      const email = `db-tests-${label}-${runId}@example.com`;
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
      anonClient = freshClient(anonKey);

      // ---- auth users ----
      ownerUser = await createFixtureUser('owner');
      parentUser = await createFixtureUser('parent');
      coachUser = await createFixtureUser('coach');
      followerUser = await createFixtureUser('follower');

      // ---- organization ----
      // Inserted via the service-role client, which has no auth.uid(), so the
      // "grant owner on org insert" trigger no-ops — org_roles are seeded
      // explicitly below instead.
      const { data: org, error: orgErr } = await serviceClient
        .from('organizations')
        .insert({ name: `DB Tests Org ${runId}`, slug: `db-tests-${runId}` })
        .select()
        .single();
      if (orgErr || !org) throw new Error(`failed to create fixture org: ${orgErr?.message}`);
      orgId = org.id;

      const { error: rolesErr } = await serviceClient.from('org_roles').insert([
        { organization_id: orgId, user_id: ownerUser.id, role: 'owner', scope_type: 'organization' },
        { organization_id: orgId, user_id: parentUser.id, role: 'parent', scope_type: 'organization' },
        { organization_id: orgId, user_id: coachUser.id, role: 'coach', scope_type: 'organization' },
        { organization_id: orgId, user_id: followerUser.id, role: 'follower', scope_type: 'organization' },
      ]);
      if (rolesErr) throw new Error(`failed to seed org_roles: ${rolesErr.message}`);

      // ---- divisions / season / team / team_season ----
      const { data: division, error: divErr } = await serviceClient
        .from('divisions')
        .insert({ organization_id: orgId, name: 'U12' })
        .select()
        .single();
      if (divErr || !division) throw new Error(`failed to create fixture division: ${divErr?.message}`);

      const { data: season, error: seasonErr } = await serviceClient
        .from('seasons')
        .insert({ organization_id: orgId, name: 'Fall 2026' })
        .select()
        .single();
      if (seasonErr || !season) throw new Error(`failed to create fixture season: ${seasonErr?.message}`);

      const { data: team, error: teamErr } = await serviceClient
        .from('teams')
        .insert({ organization_id: orgId, division_id: division.id, name: 'Hawks' })
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

      // ---- persons ----
      const { data: persons, error: personsErr } = await serviceClient
        .from('persons')
        .insert([
          { organization_id: orgId, first_name: 'Owner', last_name: 'Fixture', date_of_birth: '1980-01-01' },
          { organization_id: orgId, first_name: 'Parent', last_name: 'Fixture', date_of_birth: '1985-04-12' },
          { organization_id: orgId, first_name: 'Child', last_name: 'Player', date_of_birth: '2014-06-01' },
          { organization_id: orgId, first_name: 'Unrelated', last_name: 'Player', date_of_birth: '2013-09-10' },
          { organization_id: orgId, first_name: 'Coach', last_name: 'Fixture', date_of_birth: '1978-11-20' },
        ])
        .select();
      if (personsErr || !persons || persons.length !== 5) {
        throw new Error(`failed to create fixture persons: ${personsErr?.message}`);
      }
      const byName = (first: string) => persons.find((p) => p.first_name === first)!.id as string;
      ownerPersonId = byName('Owner');
      parentPersonId = byName('Parent');
      childPlayerId = byName('Child');
      unrelatedPlayerId = byName('Unrelated');
      coachPersonId = byName('Coach');

      // ---- persons_sensitive (child + unrelated, used by test 4/6) ----
      const { error: sensitiveErr } = await serviceClient.from('persons_sensitive').insert([
        { person_id: childPlayerId, organization_id: orgId, medical_notes: 'none on file' },
        { person_id: unrelatedPlayerId, organization_id: orgId, medical_notes: 'none on file' },
      ]);
      if (sensitiveErr) throw new Error(`failed to create fixture persons_sensitive: ${sensitiveErr.message}`);

      // ---- user_profiles (adults only) ----
      const { error: profilesErr } = await serviceClient.from('user_profiles').insert([
        { user_id: ownerUser.id, person_id: ownerPersonId, organization_id: orgId },
        { user_id: parentUser.id, person_id: parentPersonId, organization_id: orgId },
        { user_id: coachUser.id, person_id: coachPersonId, organization_id: orgId },
      ]);
      if (profilesErr) throw new Error(`failed to create fixture user_profiles: ${profilesErr.message}`);

      // ---- guardianship: parent -> child ----
      const { error: guardErr } = await serviceClient.from('guardianships').insert({
        organization_id: orgId,
        guardian_person_id: parentPersonId,
        player_person_id: childPlayerId,
        relationship: 'parent',
      });
      if (guardErr) throw new Error(`failed to create fixture guardianship: ${guardErr.message}`);

      // ---- roster: child-player + coach on the team ----
      const { error: rosterErr } = await serviceClient.from('roster_memberships').insert([
        { organization_id: orgId, team_season_id: teamSeasonId, person_id: childPlayerId, role: 'player', jersey_number: '4' },
        { organization_id: orgId, team_season_id: teamSeasonId, person_id: coachPersonId, role: 'coach' },
      ]);
      if (rosterErr) throw new Error(`failed to create fixture roster_memberships: ${rosterErr.message}`);

      // ---- one event + game ----
      const { data: event, error: eventErr } = await serviceClient
        .from('events')
        .insert({
          organization_id: orgId,
          team_season_id: teamSeasonId,
          type: 'game',
          title: 'Hawks vs Rivals',
          starts_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (eventErr || !event) throw new Error(`failed to create fixture event: ${eventErr?.message}`);

      const { data: game, error: gameErr } = await serviceClient
        .from('games')
        .insert({
          organization_id: orgId,
          event_id: event.id,
          team_season_id: teamSeasonId,
          opponent_name: 'Rivals',
        })
        .select()
        .single();
      if (gameErr || !game) throw new Error(`failed to create fixture game: ${gameErr?.message}`);
      gameId = game.id;

      // ---- one channel with owner + parent members, and one message ----
      const { data: channel, error: channelErr } = await serviceClient
        .from('channels')
        .insert({ organization_id: orgId, team_season_id: teamSeasonId, name: 'Team Chat' })
        .select()
        .single();
      if (channelErr || !channel) throw new Error(`failed to create fixture channel: ${channelErr?.message}`);

      const { error: membersErr } = await serviceClient.from('channel_members').insert([
        { channel_id: channel.id, user_id: ownerUser.id, organization_id: orgId },
        { channel_id: channel.id, user_id: parentUser.id, organization_id: orgId },
      ]);
      if (membersErr) throw new Error(`failed to create fixture channel_members: ${membersErr.message}`);

      const { data: message, error: messageErr } = await serviceClient
        .from('messages')
        .insert({
          organization_id: orgId,
          channel_id: channel.id,
          sender_user_id: ownerUser.id,
          body: 'Welcome to the team chat!',
        })
        .select()
        .single();
      if (messageErr || !message) throw new Error(`failed to create fixture message: ${messageErr?.message}`);
      messageId = message.id;

      // ---- per-role signed-in clients ----
      ownerClient = await signIn(ownerUser.email);
      parentClient = await signIn(parentUser.email);
      coachClient = await signIn(coachUser.email);
      followerClient = await signIn(followerUser.email);
    });

    afterAll(async () => {
      if (!serviceClient) return;
      // Cascades through every child table (org_roles, persons, teams, events,
      // games, game_events, channels, messages, ...).
      if (orgId) {
        await serviceClient.from('organizations').delete().eq('id', orgId);
      }
      const userIds = [ownerUser, parentUser, coachUser, followerUser]
        .filter(Boolean)
        .map((u) => u.id)
        .concat(extraUserIds);
      for (const id of userIds) {
        await serviceClient.auth.admin.deleteUser(id);
      }
    });

    // 1. anonymous
    it('anonymous client cannot read persons', async () => {
      const { data, error } = await anonClient.from('persons').select('id').eq('organization_id', orgId);
      if (error) {
        expect(error).toBeTruthy();
      } else {
        expect(data ?? []).toHaveLength(0);
      }
    });

    // 2. owner
    it('owner sees all persons in the org', async () => {
      const { data, error } = await ownerClient.from('persons').select('id').eq('organization_id', orgId);
      expect(error).toBeNull();
      const ids = (data ?? []).map((p) => p.id);
      expect(ids).toEqual(
        expect.arrayContaining([ownerPersonId, parentPersonId, childPlayerId, unrelatedPlayerId, coachPersonId]),
      );
      expect(ids).toHaveLength(5);
    });

    // 3. parent
    it('parent sees self and the linked child, but not an unrelated player', async () => {
      const { data, error } = await parentClient.from('persons').select('id').eq('organization_id', orgId);
      expect(error).toBeNull();
      const ids = (data ?? []).map((p) => p.id);
      expect(ids).toEqual(expect.arrayContaining([parentPersonId, childPlayerId]));
      expect(ids).not.toContain(unrelatedPlayerId);
    });

    // 4. parent + persons_sensitive
    it("parent can read the linked child's sensitive record but not an unrelated player's", async () => {
      const child = await parentClient.from('persons_sensitive').select('person_id').eq('person_id', childPlayerId);
      expect(child.error).toBeNull();
      expect(child.data ?? []).toHaveLength(1);

      const unrelated = await parentClient
        .from('persons_sensitive')
        .select('person_id')
        .eq('person_id', unrelatedPlayerId);
      expect(unrelated.error).toBeNull();
      expect(unrelated.data ?? []).toHaveLength(0);
    });

    // 5. coach
    it('coach sees the rostered child-player', async () => {
      const { data, error } = await coachClient.from('persons').select('id').eq('id', childPlayerId);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(1);
    });

    // 6. follower + persons_sensitive
    it('follower gets zero persons_sensitive rows', async () => {
      const { data, error } = await followerClient
        .from('persons_sensitive')
        .select('person_id')
        .eq('organization_id', orgId);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    // 7. parent cannot insert game_events
    it('parent cannot insert a game_event', async () => {
      const { error } = await parentClient.from('game_events').insert({
        organization_id: orgId,
        game_id: gameId,
        client_uuid: randomUUID(),
        device_id: 'db-tests-device',
        client_seq: 1,
        event_type: 'ft_made',
        period: 1,
      });
      expect(error).not.toBeNull();
    });

    // 8. coach can insert game_events
    it('coach can insert a game_event for the fixture game', async () => {
      const { error } = await coachClient.from('game_events').insert({
        organization_id: orgId,
        game_id: gameId,
        client_uuid: randomUUID(),
        device_id: 'db-tests-device',
        client_seq: 2,
        event_type: 'ft_made',
        period: 1,
      });
      expect(error).toBeNull();
    });

    // 9. hard DELETE on messages is forbidden by trigger.
    //
    // There is no DELETE policy on public.messages at all, so an RLS-bound
    // client's DELETE (e.g. the owner's) is filtered to zero matching rows by
    // RLS itself and returns success with 0 rows affected — it never reaches
    // the trigger. The only way to actually exercise the "belt and braces"
    // trigger (and prove hard deletes are forbidden for *any* actor, not just
    // ones RLS already blocks) is a client that bypasses RLS entirely: the
    // service-role key, standing in here for "even as owner" / even the most
    // privileged actor.
    it('hard DELETE on messages is forbidden even for a fully-privileged actor (trigger)', async () => {
      const { error } = await serviceClient.from('messages').delete().eq('id', messageId);
      expect(error).not.toBeNull();
      expect(error?.message ?? '').toMatch(/soft-delete/i);
    });

    // 10. COPPA trigger: under-13 person cannot be linked to a login.
    it('user_profiles insert linking a person under 13 fails the COPPA trigger', async () => {
      // followerUser has no user_profiles row yet; link it to the under-13
      // child-player person, which the trigger must reject regardless of who
      // is performing the insert.
      const { error } = await serviceClient.from('user_profiles').insert({
        user_id: followerUser.id,
        person_id: childPlayerId,
        organization_id: orgId,
      });
      expect(error).not.toBeNull();
      expect(error?.message ?? '').toMatch(/13/);
    });

    // 11. guardianship cap trigger: 6th guardian for the same player is rejected.
    it('a 6th guardianship for the same player is rejected by the cap trigger', async () => {
      const guardianIds: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        const { data, error } = await serviceClient
          .from('persons')
          .insert({
            organization_id: orgId,
            first_name: `CapGuardian${i}`,
            last_name: 'Fixture',
            date_of_birth: '1980-01-01',
          })
          .select()
          .single();
        if (error || !data) throw new Error(`failed to create cap-test guardian ${i}: ${error?.message}`);
        guardianIds.push(data.id);
      }

      for (const guardianId of guardianIds) {
        const { error } = await serviceClient.from('guardianships').insert({
          organization_id: orgId,
          guardian_person_id: guardianId,
          player_person_id: unrelatedPlayerId,
        });
        expect(error).toBeNull();
      }

      const { data: sixthGuardian, error: sixthGuardianErr } = await serviceClient
        .from('persons')
        .insert({
          organization_id: orgId,
          first_name: 'CapGuardian5',
          last_name: 'Fixture',
          date_of_birth: '1980-01-01',
        })
        .select()
        .single();
      if (sixthGuardianErr || !sixthGuardian) {
        throw new Error(`failed to create 6th cap-test guardian: ${sixthGuardianErr?.message}`);
      }

      const { error } = await serviceClient.from('guardianships').insert({
        organization_id: orgId,
        guardian_person_id: sixthGuardian.id,
        player_person_id: unrelatedPlayerId,
      });
      expect(error).not.toBeNull();
      expect(error?.message ?? '').toMatch(/cap/i);
    });
  });
}
