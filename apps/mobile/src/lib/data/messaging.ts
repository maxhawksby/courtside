/**
 * Data-access layer, messaging — CONTRACT FILE (PM-owned, SafeSport-critical).
 * docs/COMPLIANCE.md §3. The guardrails have two layers:
 *   * Database (migration 20260710000001): a channel containing staff and a
 *     minor must hold ≥2 adults — enforced by a deferred trigger no client
 *     can bypass. Channel creation goes through one atomic RPC.
 *   * This module (the only path feature code may use): opening a DM with a
 *     minor automatically adds the minor's guardians; if no guardian holds a
 *     login yet, creation fails with a friendly error instead of a DB error.
 * Messages are soft-delete only; no hard-delete function exists here and the
 * DB forbids DELETE outright. Out-of-hours sends are flagged for the audit log.
 */
import { isMinor, isOutOfHours } from '@courtside/shared';
import type {
  ChannelMemberRow,
  ChannelRow,
  MessageRow,
  PersonRow,
  UserProfileRow,
} from '@courtside/shared';

import { supabase } from '../supabase';
import { many, one } from './_helpers';

async function myUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('not signed in');
  return data.user.id;
}

// ---- channels ----

export async function listChannels(orgId: string): Promise<ChannelRow[]> {
  return many(
    supabase
      .from('channels')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  );
}

export type ChannelMemberWithPerson = ChannelMemberRow & {
  user_profiles: (UserProfileRow & { persons: PersonRow | null }) | null;
};

export async function listChannelMembers(channelId: string): Promise<ChannelMemberWithPerson[]> {
  return many(
    supabase
      .from('channel_members')
      .select('*, user_profiles!channel_members_user_id_fkey(*, persons(*))')
      .eq('channel_id', channelId),
  );
}

/**
 * Create a team channel (staff/admin only — RLS rejects others).
 * Members are user ids; the creator is always included.
 */
export async function createTeamChannel(
  orgId: string,
  teamSeasonId: string,
  name: string,
  memberUserIds: string[],
  isReadOnly = false,
): Promise<ChannelRow> {
  return one(
    supabase
      .rpc('create_channel_with_members', {
        p_org: orgId,
        p_name: name,
        p_member_user_ids: memberUserIds,
        p_team_season: teamSeasonId,
        p_is_read_only: isReadOnly,
      })
      .single(),
  );
}

/** Thrown when a DM with a minor can't satisfy guardian visibility. */
export class MinorRequiresGuardianError extends Error {
  constructor() {
    super(
      'Direct messages with a player under 18 automatically include a parent or guardian. ' +
        'This player has no guardian on the app yet — invite one first.',
    );
    this.name = 'MinorRequiresGuardianError';
  }
}

/**
 * Open a direct-message channel with another org member — THE only DM path.
 * If the other user is a minor (13–17; under-13s can't have logins at all),
 * every guardian of theirs who holds a login is added to the thread. No
 * guardian on the app → MinorRequiresGuardianError before anything is created.
 * The DB trigger re-checks composition at commit regardless.
 */
export async function openDirectMessage(
  orgId: string,
  otherUserId: string,
  name: string,
): Promise<ChannelRow> {
  const members = new Set<string>([otherUserId]);

  const profile = await many<UserProfileRow & { persons: PersonRow | null }>(
    supabase
      .from('user_profiles')
      .select('*, persons(*)')
      .eq('user_id', otherUserId)
      .eq('organization_id', orgId),
  );
  const otherPerson = profile[0]?.persons ?? null;

  if (otherPerson && isMinor(otherPerson.date_of_birth)) {
    const guardians = await many<{ guardian_person_id: string }>(
      supabase
        .from('guardianships')
        .select('guardian_person_id')
        .eq('player_person_id', otherPerson.id),
    );
    const guardianUserIds =
      guardians.length === 0
        ? []
        : await many<{ user_id: string }>(
            supabase
              .from('user_profiles')
              .select('user_id')
              .eq('organization_id', orgId)
              .in(
                'person_id',
                guardians.map((g) => g.guardian_person_id),
              ),
          );
    if (guardianUserIds.length === 0) throw new MinorRequiresGuardianError();
    for (const g of guardianUserIds) members.add(g.user_id);
  }

  return one(
    supabase
      .rpc('create_channel_with_members', {
        p_org: orgId,
        p_name: name,
        p_member_user_ids: [...members],
        p_team_season: null,
        p_is_read_only: false,
      })
      .single(),
  );
}

// ---- messages ----

export async function listMessages(
  channelId: string,
  opts: { before?: string; limit?: number } = {},
): Promise<MessageRow[]> {
  let q = supabase.from('messages').select('*').eq('channel_id', channelId);
  if (opts.before) q = q.lt('created_at', opts.before);
  return many(q.order('created_at', { ascending: false }).limit(opts.limit ?? 50));
}

export async function sendMessage(
  orgId: string,
  channelId: string,
  body: string,
  mediaPaths: string[] = [],
): Promise<MessageRow> {
  const uid = await myUserId();
  return one(
    supabase
      .from('messages')
      .insert({
        organization_id: orgId,
        channel_id: channelId,
        sender_user_id: uid,
        body,
        media_paths: mediaPaths,
        out_of_hours: isOutOfHours(),
      })
      .select()
      .single(),
  );
}

/**
 * Soft delete — the only removal messaging offers. Leaves a tombstone row
 * (deleted_at/deleted_by); the audit copy survives export. UI renders
 * "message deleted" for rows with deleted_at set.
 */
export async function softDeleteMessage(messageId: string): Promise<MessageRow> {
  const uid = await myUserId();
  return one(
    supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString(), deleted_by: uid, body: null, media_paths: [] })
      .eq('id', messageId)
      .select()
      .single(),
  );
}

// ---- member state (self) ----

export async function markChannelRead(channelId: string): Promise<void> {
  const uid = await myUserId();
  const { error } = await supabase
    .from('channel_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('channel_id', channelId)
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
}

export async function setChannelMuted(channelId: string, muted: boolean): Promise<void> {
  const uid = await myUserId();
  const { error } = await supabase
    .from('channel_members')
    .update({ muted })
    .eq('channel_id', channelId)
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
}
