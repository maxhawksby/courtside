/**
 * RLS policy tests for the SafeSport/MAAPP messaging guardrails and the
 * user_profiles visibility change (see:
 *   supabase/migrations/20260710000001_safesport_messaging.sql
 *   supabase/migrations/20260710000002_user_profiles_visibility.sql
 * ).
 *
 * Same pattern as rls.test.ts: exercises the real Postgres policies/triggers
 * against a running Supabase instance, env-skips cleanly with no database up,
 * and owns its own fixture org/users (independent runId) so it can run
 * alongside rls.test.ts in the same (sequential) vitest process.
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
    'RLS policies (phase 1: SafeSport messaging + user_profiles visibility) — SKIPPED: set ' +
      'SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (see packages/db-tests/README.md)',
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

  describe('RLS policies (phase 1: SafeSport messaging + user_profiles visibility)', () => {
    let serviceClient: SupabaseClient;
    let anonClient: SupabaseClient;

    let ownerUser: FixtureUser;
    let coachUser: FixtureUser;
    let parentUser: FixtureUser;
    let unrelatedParentUser: FixtureUser;
    let followerUser: FixtureUser;
    let minorUser: FixtureUser;

    let ownerClient: SupabaseClient;
    let coachClient: SupabaseClient;
    let parentClient: SupabaseClient;
    let unrelatedParentClient: SupabaseClient;
    let followerClient: SupabaseClient;

    let orgId: string;
    let teamSeasonId: string;
    let eventId: string;

    let ownerPersonId: string;
    let coachPersonId: string;
    let parentPersonId: string;
    let unrelatedParentPersonId: string;
    let followerPersonId: string;
    let minorPersonId: string;

    // Populated by test 3, reused by tests 4/6/7 (composition + tombstone +
    // "not a member" checks all need the same coach+minor+parent channel).
    let staffMinorChannelId: string;
    let staffMinorMessageId: string;

    async function createFixtureUser(label: string): Promise<FixtureUser> {
      const email = `db-tests-p1-${label}-${runId}@example.com`;
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
      coachUser = await createFixtureUser('coach');
      parentUser = await createFixtureUser('parent');
      unrelatedParentUser = await createFixtureUser('unrelated-parent');
      followerUser = await createFixtureUser('follower');
      minorUser = await createFixtureUser('minor');

      // ---- organization ----
      const { data: org, error: orgErr } = await serviceClient
        .from('organizations')
        .insert({ name: `DB Tests Org P1 ${runId}`, slug: `db-tests-p1-${runId}` })
        .select()
        .single();
      if (orgErr || !org) throw new Error(`failed to create fixture org: ${orgErr?.message}`);
      orgId = org.id;

      const { error: rolesErr } = await serviceClient.from('org_roles').insert([
        { organization_id: orgId, user_id: ownerUser.id, role: 'owner', scope_type: 'organization' },
        { organization_id: orgId, user_id: coachUser.id, role: 'coach', scope_type: 'organization' },
        { organization_id: orgId, user_id: parentUser.id, role: 'parent', scope_type: 'organization' },
        { organization_id: orgId, user_id: unrelatedParentUser.id, role: 'parent', scope_type: 'organization' },
        { organization_id: orgId, user_id: followerUser.id, role: 'follower', scope_type: 'organization' },
        // minor: no org_roles row needed — SafeSport "is minor" is derived from
        // user_profiles + persons.date_of_birth only.
      ]);
      if (rolesErr) throw new Error(`failed to seed org_roles: ${rolesErr.message}`);

      // ---- division / season / team / team_season ----
      const { data: division, error: divErr } = await serviceClient
        .from('divisions')
        .insert({ organization_id: orgId, name: 'U14' })
        .select()
        .single();
      if (divErr || !division) throw new Error(`failed to create fixture division: ${divErr?.message}`);

      const { data: season, error: seasonErr } = await serviceClient
        .from('seasons')
        .insert({ organization_id: orgId, name: 'Winter 2026' })
        .select()
        .single();
      if (seasonErr || !season) throw new Error(`failed to create fixture season: ${seasonErr?.message}`);

      const { data: team, error: teamErr } = await serviceClient
        .from('teams')
        .insert({ organization_id: orgId, division_id: division.id, name: 'Comets' })
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
      // Minor's DOB: exactly 15 years before today (UTC), so app.is_minor_person
      // (< 18) is true and the COPPA min-login-age trigger (>= 13) allows the
      // user_profiles link below.
      const now = new Date();
      const minorDob = new Date(Date.UTC(now.getUTCFullYear() - 15, now.getUTCMonth(), now.getUTCDate()))
        .toISOString()
        .slice(0, 10);

      const { data: persons, error: personsErr } = await serviceClient
        .from('persons')
        .insert([
          { organization_id: orgId, first_name: 'Owner', last_name: 'FixtureP1', date_of_birth: '1980-01-01' },
          { organization_id: orgId, first_name: 'Coach', last_name: 'FixtureP1', date_of_birth: '1978-11-20' },
          { organization_id: orgId, first_name: 'Parent', last_name: 'FixtureP1', date_of_birth: '1985-04-12' },
          {
            organization_id: orgId,
            first_name: 'UnrelatedParent',
            last_name: 'FixtureP1',
            date_of_birth: '1986-05-13',
          },
          { organization_id: orgId, first_name: 'Follower', last_name: 'FixtureP1', date_of_birth: '1990-02-02' },
          { organization_id: orgId, first_name: 'Minor', last_name: 'FixtureP1', date_of_birth: minorDob },
        ])
        .select();
      if (personsErr || !persons || persons.length !== 6) {
        throw new Error(`failed to create fixture persons: ${personsErr?.message}`);
      }
      const byName = (first: string) => persons.find((p) => p.first_name === first)!.id as string;
      ownerPersonId = byName('Owner');
      coachPersonId = byName('Coach');
      parentPersonId = byName('Parent');
      unrelatedParentPersonId = byName('UnrelatedParent');
      followerPersonId = byName('Follower');
      minorPersonId = byName('Minor');

      // ---- user_profiles (all fixture users, including the minor: 15 >= 13) ----
      const { error: profilesErr } = await serviceClient.from('user_profiles').insert([
        { user_id: ownerUser.id, person_id: ownerPersonId, organization_id: orgId },
        { user_id: coachUser.id, person_id: coachPersonId, organization_id: orgId },
        { user_id: parentUser.id, person_id: parentPersonId, organization_id: orgId },
        { user_id: unrelatedParentUser.id, person_id: unrelatedParentPersonId, organization_id: orgId },
        { user_id: followerUser.id, person_id: followerPersonId, organization_id: orgId },
        { user_id: minorUser.id, person_id: minorPersonId, organization_id: orgId },
      ]);
      if (profilesErr) throw new Error(`failed to create fixture user_profiles: ${profilesErr.message}`);

      // ---- guardianship: parent -> minor (NOT unrelatedParent) ----
      const { error: guardErr } = await serviceClient.from('guardianships').insert({
        organization_id: orgId,
        guardian_person_id: parentPersonId,
        player_person_id: minorPersonId,
        relationship: 'parent',
      });
      if (guardErr) throw new Error(`failed to create fixture guardianship: ${guardErr.message}`);

      // ---- roster: minor rostered as player ----
      const { error: rosterErr } = await serviceClient.from('roster_memberships').insert({
        organization_id: orgId,
        team_season_id: teamSeasonId,
        person_id: minorPersonId,
        role: 'player',
        jersey_number: '7',
      });
      if (rosterErr) throw new Error(`failed to create fixture roster_membership: ${rosterErr.message}`);

      // ---- one event on the team_season ----
      const { data: event, error: eventErr } = await serviceClient
        .from('events')
        .insert({
          organization_id: orgId,
          team_season_id: teamSeasonId,
          type: 'practice',
          title: 'Comets Practice',
          starts_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (eventErr || !event) throw new Error(`failed to create fixture event: ${eventErr?.message}`);
      eventId = event.id;

      // ---- per-role signed-in clients ----
      ownerClient = await signIn(ownerUser.email);
      coachClient = await signIn(coachUser.email);
      parentClient = await signIn(parentUser.email);
      unrelatedParentClient = await signIn(unrelatedParentUser.email);
      followerClient = await signIn(followerUser.email);
    });

    afterAll(async () => {
      if (!serviceClient) return;
      // Cascades through every child table (org_roles, persons, channels,
      // messages, media_consents, rsvps, ...).
      if (orgId) {
        await serviceClient.from('organizations').delete().eq('id', orgId);
      }
      const userIds = [ownerUser, coachUser, parentUser, unrelatedParentUser, followerUser, minorUser]
        .filter(Boolean)
        .map((u) => u.id);
      for (const id of userIds) {
        await serviceClient.auth.admin.deleteUser(id);
      }
    });

    // 1. anon: no read access to channels, messages, or events.
    it('anon client cannot read channels, messages, or events', async () => {
      for (const table of ['channels', 'messages', 'events'] as const) {
        const { data, error } = await anonClient.from(table).select('id').eq('organization_id', orgId);
        if (error) {
          expect(error).toBeTruthy();
        } else {
          expect(data ?? []).toHaveLength(0);
        }
      }
    });

    // 2. SafeSport composition: coach + minor only (no second adult) fails.
    it('create_channel_with_members fails for coach + minor with no second adult', async () => {
      const { data, error } = await coachClient.rpc('create_channel_with_members', {
        p_org: orgId,
        p_name: 'Coach + Minor (should fail)',
        p_member_user_ids: [minorUser.id],
      });
      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message ?? '').toMatch(/safesport/i);
    });

    // 3. SafeSport composition: coach + minor + parent (guardian) succeeds,
    // and the parent (guardian, channel member) can then read the channel and
    // its messages.
    it('create_channel_with_members succeeds for coach + minor + parent, and the parent can read it', async () => {
      const { data: channel, error: rpcErr } = await coachClient.rpc('create_channel_with_members', {
        p_org: orgId,
        p_name: 'Coach + Minor + Parent',
        p_member_user_ids: [minorUser.id, parentUser.id],
      });
      expect(rpcErr).toBeNull();
      expect(channel).toBeTruthy();
      staffMinorChannelId = (channel as { id: string }).id;

      // Seed a message (as the coach, a member of the non-read-only channel).
      const { data: message, error: msgErr } = await coachClient
        .from('messages')
        .insert({
          organization_id: orgId,
          channel_id: staffMinorChannelId,
          sender_user_id: coachUser.id,
          body: 'Practice moved to 6pm.',
        })
        .select()
        .single();
      expect(msgErr).toBeNull();
      expect(message).toBeTruthy();
      staffMinorMessageId = (message as { id: string }).id;

      const { data: channelRead, error: channelReadErr } = await parentClient
        .from('channels')
        .select('id')
        .eq('id', staffMinorChannelId);
      expect(channelReadErr).toBeNull();
      expect(channelRead ?? []).toHaveLength(1);

      const { data: messagesRead, error: messagesReadErr } = await parentClient
        .from('messages')
        .select('id')
        .eq('channel_id', staffMinorChannelId);
      expect(messagesReadErr).toBeNull();
      expect((messagesRead ?? []).map((m) => m.id)).toContain(staffMinorMessageId);
    });

    // 4. Composition trigger also guards departures: removing the parent
    // (the only second adult) from the coach+minor+parent channel must fail.
    it('removing the parent from the coach+minor channel fails the composition trigger', async () => {
      const { error } = await parentClient
        .from('channel_members')
        .delete()
        .eq('channel_id', staffMinorChannelId)
        .eq('user_id', parentUser.id);
      expect(error).not.toBeNull();
      expect(error?.message ?? '').toMatch(/safesport/i);

      // Confirm the row is still there (the delete was rolled back).
      const { data: stillMember } = await serviceClient
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', staffMinorChannelId)
        .eq('user_id', parentUser.id);
      expect(stillMember ?? []).toHaveLength(1);
    });

    // 5. DM between two adults, no minor: composition rule doesn't apply, both
    // members can insert and read messages.
    it('parent can open a DM with coach and both can insert and read messages', async () => {
      const { data: dm, error: rpcErr } = await parentClient.rpc('create_channel_with_members', {
        p_org: orgId,
        p_name: 'Parent + Coach DM',
        p_member_user_ids: [coachUser.id],
      });
      expect(rpcErr).toBeNull();
      const dmChannelId = (dm as { id: string }).id;

      const { error: parentInsertErr } = await parentClient.from('messages').insert({
        organization_id: orgId,
        channel_id: dmChannelId,
        sender_user_id: parentUser.id,
        body: 'Hi coach!',
      });
      expect(parentInsertErr).toBeNull();

      const { error: coachInsertErr } = await coachClient.from('messages').insert({
        organization_id: orgId,
        channel_id: dmChannelId,
        sender_user_id: coachUser.id,
        body: 'Hi there!',
      });
      expect(coachInsertErr).toBeNull();

      const { data: coachRead, error: coachReadErr } = await coachClient
        .from('messages')
        .select('id')
        .eq('channel_id', dmChannelId);
      expect(coachReadErr).toBeNull();
      expect(coachRead ?? []).toHaveLength(2);

      const { data: parentRead, error: parentReadErr } = await parentClient
        .from('messages')
        .select('id')
        .eq('channel_id', dmChannelId);
      expect(parentReadErr).toBeNull();
      expect(parentRead ?? []).toHaveLength(2);
    });

    // 6. Hard delete stays forbidden; soft delete (deleted_at) works and the
    // row remains readable as a tombstone.
    it('hard DELETE on a message fails; the sender can soft-delete it and the tombstone remains readable', async () => {
      // No DELETE grant for `authenticated` at all (revoked in schema v1) —
      // even the message's own sender/channel-owner cannot hard-delete.
      const { error: ownerDeleteErr } = await coachClient
        .from('messages')
        .delete()
        .eq('id', staffMinorMessageId);
      expect(ownerDeleteErr).not.toBeNull();

      // Even the fully-privileged service-role client is blocked, by the
      // "belt and braces" trigger.
      const { error: serviceDeleteErr } = await serviceClient.from('messages').delete().eq('id', staffMinorMessageId);
      expect(serviceDeleteErr).not.toBeNull();
      expect(serviceDeleteErr?.message ?? '').toMatch(/soft-delete/i);

      // Sender soft-deletes via update.
      const { error: softDeleteErr } = await coachClient
        .from('messages')
        .update({ deleted_at: new Date().toISOString(), deleted_by: coachUser.id })
        .eq('id', staffMinorMessageId);
      expect(softDeleteErr).toBeNull();

      // Tombstone: row still exists and is still readable by a channel member.
      const { data: tombstone, error: tombstoneErr } = await parentClient
        .from('messages')
        .select('id, deleted_at')
        .eq('id', staffMinorMessageId)
        .single();
      expect(tombstoneErr).toBeNull();
      expect(tombstone?.deleted_at).not.toBeNull();
    });

    // 7. Non-member cannot read messages in the coach+minor+parent channel.
    it('unrelatedParent (not a member) cannot read messages in the coach+minor+parent channel', async () => {
      const { data, error } = await unrelatedParentClient
        .from('messages')
        .select('id')
        .eq('channel_id', staffMinorChannelId);
      if (error) {
        expect(error).toBeTruthy();
      } else {
        expect(data ?? []).toHaveLength(0);
      }
    });

    // 8. persons_sensitive: guardian-only read/write for the child's row.
    it("parent can upsert and read the minor's persons_sensitive row; unrelatedParent and follower get nothing", async () => {
      const { error: upsertErr } = await parentClient
        .from('persons_sensitive')
        .upsert(
          { person_id: minorPersonId, organization_id: orgId, medical_notes: 'allergic to bee stings' },
          { onConflict: 'person_id' },
        );
      expect(upsertErr).toBeNull();

      const { data: parentRead, error: parentReadErr } = await parentClient
        .from('persons_sensitive')
        .select('person_id, medical_notes')
        .eq('person_id', minorPersonId);
      expect(parentReadErr).toBeNull();
      expect(parentRead ?? []).toHaveLength(1);
      expect(parentRead?.[0]?.medical_notes).toBe('allergic to bee stings');

      const { data: unrelatedRead, error: unrelatedReadErr } = await unrelatedParentClient
        .from('persons_sensitive')
        .select('person_id')
        .eq('person_id', minorPersonId);
      expect(unrelatedReadErr).toBeNull();
      expect(unrelatedRead ?? []).toHaveLength(0);

      const { data: followerRead, error: followerReadErr } = await followerClient
        .from('persons_sensitive')
        .select('person_id')
        .eq('person_id', minorPersonId);
      expect(followerReadErr).toBeNull();
      expect(followerRead ?? []).toHaveLength(0);
    });

    // 9. media_consents: guardian inserts, unrelated parent cannot, team staff
    // (coach) can read.
    it("parent can grant media consent for their child; unrelatedParent cannot; coach can read the child's consents", async () => {
      const { error: parentInsertErr } = await parentClient.from('media_consents').insert({
        organization_id: orgId,
        player_person_id: minorPersonId,
        granted_by_user_id: parentUser.id,
        granted: true,
        note: 'season photos ok',
      });
      expect(parentInsertErr).toBeNull();

      const { error: unrelatedInsertErr } = await unrelatedParentClient.from('media_consents').insert({
        organization_id: orgId,
        player_person_id: minorPersonId,
        granted_by_user_id: unrelatedParentUser.id,
        granted: true,
      });
      expect(unrelatedInsertErr).not.toBeNull();

      const { data: coachRead, error: coachReadErr } = await coachClient
        .from('media_consents')
        .select('id')
        .eq('player_person_id', minorPersonId);
      expect(coachReadErr).toBeNull();
      expect((coachRead ?? []).length).toBeGreaterThanOrEqual(1);
    });

    // 10. rsvps: guardian sets it, unrelated parent cannot, team staff can too.
    it('parent can RSVP for their child; unrelatedParent cannot; coach (team staff) can too', async () => {
      const { error: parentRsvpErr } = await parentClient
        .from('rsvps')
        .upsert(
          { organization_id: orgId, event_id: eventId, person_id: minorPersonId, status: 'going', responded_by: parentUser.id },
          { onConflict: 'event_id,person_id' },
        );
      expect(parentRsvpErr).toBeNull();

      const { error: unrelatedRsvpErr } = await unrelatedParentClient
        .from('rsvps')
        .upsert(
          {
            organization_id: orgId,
            event_id: eventId,
            person_id: minorPersonId,
            status: 'not_going',
            responded_by: unrelatedParentUser.id,
          },
          { onConflict: 'event_id,person_id' },
        );
      expect(unrelatedRsvpErr).not.toBeNull();

      const { error: coachRsvpErr } = await coachClient
        .from('rsvps')
        .upsert(
          { organization_id: orgId, event_id: eventId, person_id: minorPersonId, status: 'going', responded_by: coachUser.id },
          { onConflict: 'event_id,person_id' },
        );
      expect(coachRsvpErr).toBeNull();
    });

    // 11. events: team staff (coach) can create; parent cannot.
    it('coach can create an event on their team_season; parent cannot', async () => {
      const { error: coachEventErr } = await coachClient.from('events').insert({
        organization_id: orgId,
        team_season_id: teamSeasonId,
        type: 'practice',
        title: 'Extra shooting practice',
        starts_at: new Date().toISOString(),
      });
      expect(coachEventErr).toBeNull();

      const { error: parentEventErr } = await parentClient.from('events').insert({
        organization_id: orgId,
        team_season_id: teamSeasonId,
        type: 'practice',
        title: 'Parent-created practice (should fail)',
        starts_at: new Date().toISOString(),
      });
      expect(parentEventErr).not.toBeNull();
    });

    // 12. org_roles: only the owner grants roles; a parent cannot self-elevate.
    it('parent cannot grant org roles; owner can grant parentUser a role and parent sees it', async () => {
      const { error: selfGrantErr } = await parentClient.from('org_roles').insert({
        organization_id: orgId,
        user_id: parentUser.id,
        role: 'scorekeeper',
        scope_type: 'organization',
      });
      expect(selfGrantErr).not.toBeNull();

      const { error: grantOthersErr } = await parentClient.from('org_roles').insert({
        organization_id: orgId,
        user_id: unrelatedParentUser.id,
        role: 'scorekeeper',
        scope_type: 'organization',
      });
      expect(grantOthersErr).not.toBeNull();

      const { error: ownerGrantErr } = await ownerClient.from('org_roles').insert({
        organization_id: orgId,
        user_id: parentUser.id,
        role: 'scorekeeper',
        scope_type: 'organization',
      });
      expect(ownerGrantErr).toBeNull();

      const { data: parentRoles, error: parentRolesErr } = await parentClient
        .from('org_roles')
        .select('role')
        .eq('user_id', parentUser.id);
      expect(parentRolesErr).toBeNull();
      expect((parentRoles ?? []).map((r) => r.role)).toEqual(expect.arrayContaining(['parent', 'scorekeeper']));
    });
  });
}
