/**
 * Supabase browser client — CONTRACT FILE (PM-owned).
 * Admin console v1 is client-rendered read views behind a signed-in session.
 * Real role-gated auth (owner/division_admin only) is wired post-wave by the
 * PM; until then devSignIn gives a session against the local stack.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config: copy apps/admin/.env.example to .env.local ' +
      'and set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(url, anonKey);

/** Dev-only session helper. Replaced by real admin auth post-wave (PM). */
export async function devSignIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
