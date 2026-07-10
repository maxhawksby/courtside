'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import type { OrganizationRow } from '@courtside/shared';
import { devSignIn, supabase } from '@/lib/supabase';
import { getMyOrganizations } from '@/lib/data';
import { setStoredOrg } from './components/org-storage';

type Status = 'checking' | 'signed-out' | 'signed-in';

export default function Home() {
  const [status, setStatus] = useState<Status>('checking');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  // Session presence only — the one allowed exception to "all data via lib/data".
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStatus(data.session ? 'signed-in' : 'signed-out');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'signed-in') return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setOrgsLoading(true);
        setOrgsError(null);
        return getMyOrganizations();
      })
      .then((rows) => {
        if (!cancelled) setOrgs(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setOrgsError(err instanceof Error ? err.message : 'Failed to load organizations.');
      })
      .finally(() => {
        if (!cancelled) setOrgsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setSignInError(null);
    setSigningIn(true);
    try {
      await devSignIn(email, password);
      setStatus('signed-in');
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  }

  function chooseOrg(org: OrganizationRow) {
    setStoredOrg({ id: org.id, name: org.name });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold">Courtside Admin</h1>

        {status === 'checking' && <p className="text-secondary">Loading…</p>}

        {status === 'signed-out' && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wide text-secondary">Development sign-in</p>
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border border-selected bg-element px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border border-selected bg-element px-3 py-2 text-sm"
              />
            </label>
            {signInError && <p className="text-sm text-red-600">{signInError}</p>}
            <button
              type="submit"
              disabled={signingIn}
              className="mt-2 rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {signingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {status === 'signed-in' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-secondary">Choose an organization to continue.</p>

            {orgsLoading && <p className="text-secondary">Loading organizations…</p>}

            {orgsError && (
              <p className="text-sm text-red-600">Couldn&apos;t load organizations: {orgsError}</p>
            )}

            {!orgsLoading && !orgsError && orgs.length === 0 && (
              <p className="text-secondary">No organizations found for this account.</p>
            )}

            {!orgsLoading && !orgsError && orgs.length > 0 && (
              <ul className="flex flex-col gap-2">
                {orgs.map((org) => (
                  <li key={org.id}>
                    <Link
                      href="/directory"
                      onClick={() => chooseOrg(org)}
                      className="block rounded border border-selected bg-element px-3 py-2 text-sm hover:bg-selected"
                    >
                      {org.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
