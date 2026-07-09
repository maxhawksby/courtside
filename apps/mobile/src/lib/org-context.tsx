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
  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [activeOrg, setActive] = useState<OrganizationRow | null>(null);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    refreshOrgs()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshOrgs]);

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
