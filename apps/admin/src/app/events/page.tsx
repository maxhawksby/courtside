'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EventRow } from '@courtside/shared';
import { listEvents, listSeasons, listTeams, listTeamSeasons } from '@/lib/data';
import type { TeamWithDivision } from '@/lib/data';
import { useStoredOrg } from '../components/org-storage';
import NoOrg from '../components/NoOrg';

const ALL_TEAMS = 'all';

export default function EventsPage() {
  const { org, ready } = useStoredOrg();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [teams, setTeams] = useState<TeamWithDivision[]>([]);
  const [teamSeasonToTeam, setTeamSeasonToTeam] = useState<Map<string, string>>(new Map());
  const [filterTeamId, setFilterTeamId] = useState<string>(ALL_TEAMS);

  useEffect(() => {
    if (!org) return;
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        setEventsLoading(true);
        setEventsError(null);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        return Promise.all([
          listEvents(org.id, { from: startOfToday.toISOString() }),
          listTeams(org.id),
          listSeasons(org.id),
        ]);
      })
      .then(async ([eventRows, teamRows, seasonRows]) => {
        if (cancelled) return;
        setEvents(eventRows);
        setTeams(teamRows);

        // Map each team_season back to its team so the team filter (which
        // lists teams, per lib/data) can filter events by team_season_id.
        const newestSeason = seasonRows[0];
        if (newestSeason) {
          const teamSeasons = await listTeamSeasons(org.id, newestSeason.id);
          if (cancelled) return;
          setTeamSeasonToTeam(new Map(teamSeasons.map((ts) => [ts.id, ts.team_id])));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setEventsError(err instanceof Error ? err.message : 'Failed to load events.');
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org]);

  const filteredEvents = useMemo(() => {
    if (filterTeamId === ALL_TEAMS) return events;
    return events.filter((event) => {
      if (!event.team_season_id) return false;
      return teamSeasonToTeam.get(event.team_season_id) === filterTeamId;
    });
  }, [events, filterTeamId, teamSeasonToTeam]);

  if (!ready) return <p className="text-secondary">Loading…</p>;
  if (!org) return <NoOrg />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Events</h1>
        <select
          value={filterTeamId}
          onChange={(e) => setFilterTeamId(e.target.value)}
          className="rounded border border-selected bg-element px-3 py-1.5 text-sm"
        >
          <option value={ALL_TEAMS}>All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {eventsError && <p className="text-sm text-danger">Couldn&apos;t load events: {eventsError}</p>}

      {!eventsError && eventsLoading && <p className="text-secondary">Loading…</p>}

      {!eventsError && !eventsLoading && filteredEvents.length === 0 && (
        <p className="text-secondary">No upcoming events.</p>
      )}

      {!eventsError && !eventsLoading && filteredEvents.length > 0 && (
        <div className="overflow-x-auto rounded border border-selected">
          <table className="w-full text-sm">
            <thead className="bg-element text-left text-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">Date / time</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-t border-selected">
                  <td className="px-3 py-2">{formatDateTime(event.starts_at)}</td>
                  <td className="px-3 py-2 capitalize">{event.type}</td>
                  <td className="px-3 py-2">{event.title ?? '—'}</td>
                  <td className="px-3 py-2">{event.location ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
