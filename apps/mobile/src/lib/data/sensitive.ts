/**
 * Data-access layer, sensitive person data — CONTRACT FILE (PM-owned,
 * COPPA-critical). persons_sensitive holds medical notes and emergency
 * contacts. RLS restricts it to the person themself, their guardians, and
 * org admins — feature code gets an error or nothing for anyone else, and
 * must degrade gracefully (hide the section) rather than retry.
 *
 * Minor rule (docs/COMPLIANCE.md §2): under-13s are person records managed by
 * adults — they can NEVER hold a login (DB trigger enforces). There is no
 * "create minor account" function anywhere; creating a minor IS createPerson
 * (core.ts) with a date_of_birth, plus a guardianship link.
 */
import type { PersonSensitiveRow } from '@courtside/shared';

import { supabase } from '../supabase';
import { many, one } from './_helpers';

/** Null when no record exists yet (or RLS hides it — treat identically). */
export async function getSensitive(personId: string): Promise<PersonSensitiveRow | null> {
  const rows = await many<PersonSensitiveRow>(
    supabase.from('persons_sensitive').select('*').eq('person_id', personId).limit(1),
  );
  return rows[0] ?? null;
}

export async function upsertSensitive(
  orgId: string,
  personId: string,
  fields: Partial<Pick<PersonSensitiveRow, 'medical_notes' | 'emergency_contact'>>,
): Promise<PersonSensitiveRow> {
  return one(
    supabase
      .from('persons_sensitive')
      .upsert(
        { organization_id: orgId, person_id: personId, ...fields },
        { onConflict: 'person_id' },
      )
      .select()
      .single(),
  );
}
