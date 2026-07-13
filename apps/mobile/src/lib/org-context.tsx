/**
 * Active-organization context — CONTRACT FILE (PM-owned).
 * Feature code consumes useOrg(); the provider is mounted once in the root
 * layout, inside AuthProvider.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OrganizationRow } from '@courtside/shared';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { getMyOrganizations } from './data';

const ACTIVE_ORG_KEY = 'courtside.activeOrgId';

interface OrgContextValue {
  /** Organizations the signed-in user belongs to. */
  orgs: OrganizationRow[];
  /** Currently selected organization (null until orgs load or none exist). */
  activeOrg: OrganizationRow | null;
  /** true while the initial org list is loading */
  loading: boolean;
  setActiveOrg: (org: OrganizationRow) => Promise<void>;
  /** Re-fetch orgs (e.g. after creating one). Returns the fresh list. */
  refreshOrgs: () => Promise<OrganizationRow[]>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [activeOrg, setActive] = useState<OrganizationRow | null>(null);
  // `undefined` = initial load not settled yet; a user id / null = the user
  // the current org list was loaded for. Loading is derived so the effect
  // never has to set state synchronously.
  const [loadedForUser, setLoadedForUser] = useState<string | null | undefined>(undefined);
  const loading = loadedForUser === undefined || loadedForUser !== userId;

  // For external callers (event handlers, e.g. after creating an org). The
  // initial/user-change load below is a separate promise chain because the
  // lint rule forbids effects from synchronously calling state-setting
  // functions like this one.
  const refreshOrgs = useCallback(async (): Promise<OrganizationRow[]> => {
    if (!user) {
      setOrgs([]);
      setActive(null);
      return [];
    }
    const list = await getMyOrganizations();
    setOrgs(list);
    const storedId = await AsyncStorage.getItem(ACTIVE_ORG_KEY);
    const preferred = list.find((o) => o.id === storedId) ?? list[0] ?? null;
    setActive(preferred);
    return list;
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const load = !user
      ? Promise.resolve().then(() => {
          if (cancelled) return;
          setOrgs([]);
          setActive(null);
        })
      : getMyOrganizations().then(async (list) => {
          if (cancelled) return;
          setOrgs(list);
          const storedId = await AsyncStorage.getItem(ACTIVE_ORG_KEY);
          if (cancelled) return;
          setActive(list.find((o) => o.id === storedId) ?? list[0] ?? null);
        });
    load
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadedForUser(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [user, userId]);

  const setActiveOrg = useCallback(async (org: OrganizationRow) => {
    setActive(org);
    await AsyncStorage.setItem(ACTIVE_ORG_KEY, org.id);
  }, []);

  return (
    <OrgContext.Provider value={{ orgs, activeOrg, loading, setActiveOrg, refreshOrgs }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within <OrgProvider>');
  return ctx;
}
