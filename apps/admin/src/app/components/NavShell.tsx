'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { signOut } from '@/lib/supabase';
import { clearStoredOrg, useStoredOrg } from './org-storage';

const NAV_LINKS = [
  { href: '/directory', label: 'Directory' },
  { href: '/teams', label: 'Teams' },
  { href: '/events', label: 'Events' },
];

/**
 * Global chrome: left nav + org name + sign-out. Hidden on "/" (sign-in and
 * org picker own that screen). On other routes it renders even before an
 * org is chosen so sign-out is always reachable; data pages handle the
 * "no org" case themselves.
 */
export default function NavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { org, ready } = useStoredOrg();
  const [signingOut, setSigningOut] = useState(false);

  if (pathname === '/') {
    return <>{children}</>;
  }

  if (!ready) {
    return <>{children}</>;
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      clearStoredOrg();
      setSigningOut(false);
      router.push('/');
    }
  }

  return (
    <div className="flex flex-1">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-selected bg-element">
        <div>
          <div className="border-b border-selected px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-secondary">Organization</p>
            <p className="truncate font-medium">{org?.name ?? 'No organization selected'}</p>
          </div>
          <nav className="flex flex-col py-2">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 text-sm ${
                    active ? 'bg-selected font-medium' : 'hover:bg-selected'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-selected p-4">
          <Link href="/" className="text-xs text-secondary hover:underline">
            Switch organization
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded bg-background px-3 py-2 text-left text-sm hover:bg-selected disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
