/**
 * Data-access layer, media consent — CONTRACT FILE (PM-owned, COPPA-critical).
 * docs/COMPLIANCE.md §5: a minor's photos/video render ONLY behind an active
 * consent. Deny by default — no consent row means no media. Consent rows are
 * append-only history; the newest row per player wins (revocation = a newer
 * row with granted=false).
 *
 * Every screen that shows person media MUST resolve it through
 * canRenderMedia / getConsentMap. Do not read media_consents directly.
 */
import { isMinor } from '@courtside/shared';
import type { MediaConsentRow, PersonRow } from '@courtside/shared';

import { supabase } from '../supabase';
import { many, one } from './_helpers';

/** Full history for a player, newest first (guardian/staff visibility per RLS). */
export async function listConsentHistory(playerPersonId: string): Promise<MediaConsentRow[]> {
  return many(
    supabase
      .from('media_consents')
      .select('*')
      .eq('player_person_id', playerPersonId)
      .order('created_at', { ascending: false }),
  );
}

/** Effective consent for one player: newest row's `granted`, or false if none. */
export async function getEffectiveConsent(playerPersonId: string): Promise<boolean> {
  const rows = await many<Pick<MediaConsentRow, 'granted'>>(
    supabase
      .from('media_consents')
      .select('granted')
      .eq('player_person_id', playerPersonId)
      .order('created_at', { ascending: false })
      .limit(1),
  );
  return rows[0]?.granted ?? false;
}

/**
 * Batch effective consent for a set of persons (e.g. a roster screen).
 * Missing person id in the result map ⇒ treat as false.
 */
export async function getConsentMap(
  orgId: string,
  personIds: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (personIds.length === 0) return map;
  const rows = await many<Pick<MediaConsentRow, 'player_person_id' | 'granted' | 'created_at'>>(
    supabase
      .from('media_consents')
      .select('player_person_id, granted, created_at')
      .eq('organization_id', orgId)
      .in('player_person_id', personIds)
      .order('created_at', { ascending: false }),
  );
  for (const row of rows) {
    if (!map.has(row.player_person_id)) map.set(row.player_person_id, row.granted);
  }
  return map;
}

/**
 * THE media gate. Adults render freely; minors render only with effective
 * consent. `consent` comes from getEffectiveConsent/getConsentMap (absent ⇒
 * false). Pure and synchronous so list rows can call it per item.
 */
export function canRenderMedia(
  person: Pick<PersonRow, 'date_of_birth'>,
  consent: boolean | undefined,
): boolean {
  if (!isMinor(person.date_of_birth)) return true;
  return consent === true;
}

/** Grant or revoke (guardians of the player, or admins — RLS enforces). */
export async function setConsent(
  orgId: string,
  playerPersonId: string,
  granted: boolean,
  note?: string,
): Promise<MediaConsentRow> {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw new Error('not signed in');
  return one(
    supabase
      .from('media_consents')
      .insert({
        organization_id: orgId,
        player_person_id: playerPersonId,
        granted_by_user_id: userData.user.id,
        granted,
        note: note ?? null,
      })
      .select()
      .single(),
  );
}
