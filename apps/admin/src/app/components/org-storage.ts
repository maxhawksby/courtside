/**
 * Client-side persistence for the admin's selected organization.
 *
 * Not part of the frozen `lib/data` contract — this only remembers which
 * organization (id + display name) was chosen from `getMyOrganizations()`
 * so pages don't need to refetch the org list on every navigation.
 */
'use client';

import { useEffect, useState } from 'react';

export type StoredOrg = {
  id: string;
  name: string;
};

const STORAGE_KEY = 'courtside_admin_org';

export function getStoredOrg(): StoredOrg | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredOrg>;
    if (typeof parsed?.id !== 'string' || typeof parsed?.name !== 'string') return null;
    return { id: parsed.id, name: parsed.name };
  } catch {
    return null;
  }
}

export function setStoredOrg(org: StoredOrg): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
}

export function clearStoredOrg(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Reads the stored org on mount (client-only, so `ready` starts false to
 * avoid a hydration mismatch with the server-rendered pass).
 */
export function useStoredOrg(): { org: StoredOrg | null; ready: boolean } {
  const [org, setOrg] = useState<StoredOrg | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Deferred a tick so this doesn't read localStorage until after hydration.
    Promise.resolve().then(() => {
      setOrg(getStoredOrg());
      setReady(true);
    });
  }, []);

  return { org, ready };
}
