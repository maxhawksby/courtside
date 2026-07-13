/**
 * RLS policy tests for the team archive contract (BE-1, see:
 *   supabase/migrations/20260713000001_team_archive.sql
 * ).
 *
 * Teams are archived, never deleted: teams_write is split into
 * teams_insert/teams_update and no delete policy exists, so hard delete is
 * default-denied for every role. Archiving must leave the team's channels and
 * message history readable (SafeSport audit trail).
 *
 * Same pattern as rls.test.ts / rls-phase1.test.ts: exercises the real
 * Postgres policies against a running Supabase instance, env-skips cleanly
 * with no database up, and owns its own fixture org/users (independent runId)
 * so it can run alongside the other suites in the same (sequential) vitest
 * process.
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
    'RLS policies (team archive) — SKIPPED: set SUPABASE_URL / SUPABASE_ANON_KEY / ' +
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

  describe('RLS policies (team archive)', () => {
    let serviceClient: SupabaseClient;

    let ownerUser: FixtureUser;
    let parentUser: FixtureUser;

    let ownerClient: SupabaseClient;
    let parentClient: SupabaseClient;

    let orgId: string;
    let teamId: string;
    let channelId: string;
    let messageId: string;

    async function createFixtureUser(label: string): Promise<FixtureUser> {
      const email = `db-tests-arch-${label}-${runId}@example.com`;
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

    async function archivedAtOf(id: string): Promise<string | null> {
      const { data, error } = await serviceClient
        .from('teams')
        .select('archived_at')
        .eq('id', id)
        .single();
      if (error || !data) throw new Error(`failed to read team ${id}: ${error?.message}`);
      return data.archived_at as string | null;
    }

    beforeAll(async () => {
      serviceClient = freshClient(serviceRoleKey);

      ownerUser = await createFixtureUser('owner');
      parentUser = await createFixtureUser('parent');

      const { data: org, error: orgErr } = await serviceClient
        .from('organizations')
        .insert({ name: `DB Tests Org Archive ${runId}`, slug: `db-tests-arch-${runId}` })
        .select()
        .single();
      if (orgErr || !org) throw new Error(`failed to create fixture org: ${orgErr?.message}`);
      orgId = org.id;

      const { error: rolesErr } = await serviceClient.from('org_roles').insert([
        { organization_id: orgId, user_id: ownerUser.id, role: 'owner', scope_type: 'organization' },
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
        .insert({ organization_id: orgId, name: `Archive Me ${runId}` })
        .select()
        .single();
      if (teamErr || !team) throw new Error(`failed to create fixture team: ${teamErr?.message}`);
      teamId = team.id;

      const { data: teamSeason, error: tsErr } = await serviceClient
        .from('team_seasons')
        .insert({ organization_id: orgId, team_id: teamId, season_id: season.id })
        .select()
        .single();
      if (tsErr || !teamSeason) throw new Error(`failed to create fixture team_season: ${tsErr?.message}`);

      // Team channel (staff/admin-created in production; service role here)
      // with the parent as a member, plus one message from the parent —
      // the audit trail that must survive archiving.
      const { data: channel, error: chErr } = await serviceClient
        .from('channels')
        .insert({
          organization_id: orgId,
          team_season_id: teamSeason.id,
          name: 'Team Chat',
          created_by: ownerUser.id,
        })
        .select()
        .single();
      if (chErr || !channel) throw new Error(`failed to create fixture channel: ${chErr?.message}`);
      channelId = channel.id;

      const { error: cmErr } = await serviceClient.from('channel_members').insert([
        { channel_id: channelId, user_id: ownerUser.id, organization_id: orgId },
        { channel_id: channelId, user_id: parentUser.id, organization_id: orgId },
      ]);
      if (cmErr) throw new Error(`failed to seed channel_members: ${cmErr.message}`);

      ownerClient = await signIn(ownerUser.email);
      parentClient = await signIn(parentUser.email);

      const { data: message, error: msgErr } = await parentClient
        .from('messages')
        .insert({
          organization_id: orgId,
          channel_id: channelId,
          sender_user_id: parentUser.id,
          body: 'See everyone at practice!',
        })
        .select()
        .single();
      if (msgErr || !message) throw new Error(`failed to seed fixture message: ${msgErr?.message}`);
      messageId = message.id;
    });

    afterAll(async () => {
      if (!serviceClient) return;
      if (orgId) {
        await serviceClient.from('organizations').delete().eq('id', orgId);
      }
      for (const user of [ownerUser, parentUser].filter(Boolean)) {
        await serviceClient.auth.admin.deleteUser(user.id);
      }
    });

    // 1. Owner archives and unarchives; RETURNING confirms the row was hit
    // (the data layer's archiveTeam/unarchiveTeam rely on that contract).
    it('owner can archive and unarchive a team', async () => {
      const { data: archived, error: archiveErr } = await ownerClient
        .from('teams')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', teamId)
        .select('id');
      expect(archiveErr).toBeNull();
      expect(archived).toHaveLength(1);
      expect(await archivedAtOf(teamId)).not.toBeNull();

      const { data: unarchived, error: unarchiveErr } = await ownerClient
        .from('teams')
        .update({ archived_at: null })
        .eq('id', teamId)
        .select('id');
      expect(unarchiveErr).toBeNull();
      expect(unarchived).toHaveLength(1);
      expect(await archivedAtOf(teamId)).toBeNull();
    });

    // 2. Parent role cannot archive: RLS filters the update silently
    // (no error, zero rows), and the team stays unarchived.
    it('parent cannot archive a team (update silently filtered)', async () => {
      const { data, error } = await parentClient
        .from('teams')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', teamId)
        .select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await archivedAtOf(teamId)).toBeNull();
    });

    // 3. No delete policy exists: hard delete is default-denied for everyone,
    // including the owner (silently — no error, zero rows).
    it('hard delete is denied even for the owner (zero rows affected)', async () => {
      const { data, error } = await ownerClient
        .from('teams')
        .delete()
        .eq('id', teamId)
        .select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: stillThere } = await serviceClient.from('teams').select('id').eq('id', teamId);
      expect(stillThere).toHaveLength(1);
    });

    // 4. The SafeSport audit trail survives: after the owner archives the
    // team, a prior channel member still reads the channel and its messages
    // under the existing (untouched) messaging policies.
    it("an archived team's channel messages remain readable by a prior member", async () => {
      const { data: archived, error: archiveErr } = await ownerClient
        .from('teams')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', teamId)
        .select('id');
      expect(archiveErr).toBeNull();
      expect(archived).toHaveLength(1);

      const { data: channelRead, error: channelReadErr } = await parentClient
        .from('channels')
        .select('id')
        .eq('id', channelId);
      expect(channelReadErr).toBeNull();
      expect(channelRead ?? []).toHaveLength(1);

      const { data: messagesRead, error: messagesReadErr } = await parentClient
        .from('messages')
        .select('id, body')
        .eq('channel_id', channelId);
      expect(messagesReadErr).toBeNull();
      expect((messagesRead ?? []).map((m) => m.id)).toContain(messageId);
    });
  });
}
