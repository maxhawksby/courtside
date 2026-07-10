'use client';

import { useEffect, useState } from 'react';
import type { PersonRow } from '@courtside/shared';
import { ageFromDateOfBirth, isMinor } from '@courtside/shared';
import { listPersons } from '@/lib/data';
import { useStoredOrg } from '../components/org-storage';
import NoOrg from '../components/NoOrg';

export default function DirectoryPage() {
  const { org, ready } = useStoredOrg();

  const [search, setSearch] = useState('');
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    // Small debounce so each keystroke doesn't fire its own query.
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      listPersons(org.id, search)
        .then((rows) => {
          if (!cancelled) setPersons(rows);
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the directory.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [org, search]);

  if (!ready) return <p className="text-secondary">Loading…</p>;
  if (!org) return <NoOrg />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Directory</h1>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-64 rounded border border-selected bg-element px-3 py-1.5 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">Couldn&apos;t load the directory: {error}</p>}

      {!error && loading && <p className="text-secondary">Loading…</p>}

      {!error && !loading && persons.length === 0 && (
        <p className="text-secondary">No people found.</p>
      )}

      {!error && !loading && persons.length > 0 && (
        <>
          <div className="overflow-x-auto rounded border border-selected">
            <table className="w-full text-sm">
              <thead className="bg-element text-left text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Age</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody>
                {persons.map((person) => {
                  const age = ageFromDateOfBirth(person.date_of_birth);
                  return (
                    <tr key={person.id} className="border-t border-selected">
                      <td className="px-3 py-2">
                        {person.first_name} {person.last_name}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          {age ?? '—'}
                          {isMinor(person.date_of_birth) && (
                            <span className="rounded-full bg-selected px-2 py-0.5 text-xs text-secondary">
                              minor
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">{person.email ?? '—'}</td>
                      <td className="px-3 py-2">{person.phone ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-secondary">
            {persons.length} {persons.length === 1 ? 'person' : 'people'}
          </p>
        </>
      )}
    </div>
  );
}
