'use client';

import { useEffect, useState } from 'react';
import { getRoster, listSeasons, listTeams, listTeamSeasons } from '@/lib/data';
import type { RosterEntry, TeamWithDivision } from '@/lib/data';
import { useStoredOrg } from '../components/org-storage';
import NoOrg from '../components/NoOrg';

type DivisionGroup = {
  key: string;
  name: string;
  teams: TeamWithDivision[];
};

export default function TeamsPage() {
  const { org, ready } = useStoredOrg();

  const [teams, setTeams] = useState<TeamWithDivision[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterNote, setRosterNote] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        setTeamsLoading(true);
        setTeamsError(null);
        return listTeams(org.id);
      })
      .then((rows) => {
        if (!cancelled) setTeams(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setTeamsError(err instanceof Error ? err.message : 'Failed to load teams.');
      })
      .finally(() => {
        if (!cancelled) setTeamsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [org]);

  async function handleSelectTeam(team: TeamWithDivision) {
    if (!org) return;
    if (selectedTeamId === team.id) {
      setSelectedTeamId(null);
      return;
    }
    setSelectedTeamId(team.id);
    setRoster([]);
    setRosterError(null);
    setRosterNote(null);
    setRosterLoading(true);
    try {
      const seasons = await listSeasons(org.id);
      const newestSeason = seasons[0];
      if (!newestSeason) {
        setRosterNote('No seasons found for this organization.');
        return;
      }
      const teamSeasons = await listTeamSeasons(org.id, newestSeason.id);
      const teamSeason = teamSeasons.find((ts) => ts.team_id === team.id);
      if (!teamSeason) {
        setRosterNote(`No roster for ${team.name} in ${newestSeason.name}.`);
        return;
      }
      const rows = await getRoster(teamSeason.id);
      setRoster(rows);
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : 'Failed to load roster.');
    } finally {
      setRosterLoading(false);
    }
  }

  if (!ready) return <p className="text-secondary">Loading…</p>;
  if (!org) return <NoOrg />;

  const groups = groupByDivision(teams);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Teams</h1>

      {teamsError && <p className="text-sm text-red-600">Couldn&apos;t load teams: {teamsError}</p>}

      {!teamsError && teamsLoading && <p className="text-secondary">Loading…</p>}

      {!teamsError && !teamsLoading && teams.length === 0 && (
        <p className="text-secondary">No teams found.</p>
      )}

      {!teamsError && !teamsLoading && groups.length > 0 && (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-secondary">
                {group.name}
              </h2>
              <ul className="flex flex-col gap-1">
                {group.teams.map((team) => (
                  <li key={team.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectTeam(team)}
                      className={`w-full rounded px-3 py-2 text-left text-sm ${
                        selectedTeamId === team.id ? 'bg-selected' : 'bg-element hover:bg-selected'
                      }`}
                    >
                      {team.name}
                    </button>
                    {selectedTeamId === team.id && (
                      <div className="mt-1 rounded border border-selected p-3">
                        {rosterLoading && <p className="text-sm text-secondary">Loading roster…</p>}
                        {rosterError && (
                          <p className="text-sm text-red-600">
                            Couldn&apos;t load roster: {rosterError}
                          </p>
                        )}
                        {!rosterLoading && !rosterError && rosterNote && (
                          <p className="text-sm text-secondary">{rosterNote}</p>
                        )}
                        {!rosterLoading && !rosterError && !rosterNote && roster.length === 0 && (
                          <p className="text-sm text-secondary">No players on this roster yet.</p>
                        )}
                        {!rosterLoading && !rosterError && roster.length > 0 && (
                          <table className="w-full text-sm">
                            <thead className="text-left text-secondary">
                              <tr>
                                <th className="px-2 py-1 font-medium">#</th>
                                <th className="px-2 py-1 font-medium">Name</th>
                                <th className="px-2 py-1 font-medium">Role</th>
                              </tr>
                            </thead>
                            <tbody>
                              {roster.map((entry) => (
                                <tr key={entry.id} className="border-t border-selected">
                                  <td className="px-2 py-1">{entry.jersey_number ?? '—'}</td>
                                  <td className="px-2 py-1">
                                    {entry.persons
                                      ? `${entry.persons.first_name} ${entry.persons.last_name}`
                                      : 'Unknown person'}
                                  </td>
                                  <td className="px-2 py-1 capitalize">{entry.role}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDivision(teams: TeamWithDivision[]): DivisionGroup[] {
  const map = new Map<string, DivisionGroup>();
  for (const team of teams) {
    const key = team.divisions?.id ?? 'unassigned';
    const name = team.divisions?.name ?? 'Unassigned';
    if (!map.has(key)) map.set(key, { key, name, teams: [] });
    map.get(key)!.teams.push(team);
  }
  return Array.from(map.values());
}
