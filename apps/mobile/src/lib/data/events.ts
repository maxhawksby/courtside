/**
 * Data-access layer, scheduling — CONTRACT FILE (PM-owned).
 * Events + RSVPs. RLS: org members read; team staff/admins write events;
 * RSVP writes limited to self, guardians of the person, staff, admins.
 * "unanswered" is the absence of an rsvps row, never a stored status.
 */
import type { EventRow, EventType, PersonRow, RsvpRow } from '@courtside/shared';

import { supabase } from '../supabase';
import { many, one } from './_helpers';

export interface EventFilters {
  teamSeasonId?: string;
  /** ISO timestamp inclusive lower bound on starts_at. */
  from?: string;
  /** ISO timestamp exclusive upper bound on starts_at. */
  to?: string;
  type?: EventType;
}

export async function listEvents(orgId: string, filters: EventFilters = {}): Promise<EventRow[]> {
  let q = supabase.from('events').select('*').eq('organization_id', orgId);
  if (filters.teamSeasonId) q = q.eq('team_season_id', filters.teamSeasonId);
  if (filters.from) q = q.gte('starts_at', filters.from);
  if (filters.to) q = q.lt('starts_at', filters.to);
  if (filters.type) q = q.eq('type', filters.type);
  return many(q.order('starts_at').limit(500));
}

export async function getEvent(eventId: string): Promise<EventRow> {
  return one(supabase.from('events').select('*').eq('id', eventId).single());
}

export interface EventFields {
  type: EventType;
  starts_at: string;
  team_season_id?: string | null;
  title?: string | null;
  arrival_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  notes?: string | null;
}

export async function createEvent(orgId: string, fields: EventFields): Promise<EventRow> {
  const { data: userData } = await supabase.auth.getUser();
  return one(
    supabase
      .from('events')
      .insert({ organization_id: orgId, created_by: userData.user?.id ?? null, ...fields })
      .select()
      .single(),
  );
}

export async function updateEvent(
  eventId: string,
  fields: Partial<EventFields>,
): Promise<EventRow> {
  return one(supabase.from('events').update(fields).eq('id', eventId).select().single());
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw new Error(error.message);
}

export type RsvpWithPerson = RsvpRow & { persons: PersonRow | null };

export async function listRsvps(eventId: string): Promise<RsvpWithPerson[]> {
  return many(supabase.from('rsvps').select('*, persons(*)').eq('event_id', eventId));
}

/**
 * Answer for a person (self, or a player you're guardian of — RLS enforces).
 * Upserts on (event_id, person_id); "unanswered" is expressed by deleting.
 */
export async function setRsvp(
  orgId: string,
  eventId: string,
  personId: string,
  status: 'going' | 'not_going',
): Promise<RsvpRow> {
  const { data: userData } = await supabase.auth.getUser();
  return one(
    supabase
      .from('rsvps')
      .upsert(
        {
          organization_id: orgId,
          event_id: eventId,
          person_id: personId,
          status,
          responded_by: userData.user?.id ?? null,
        },
        { onConflict: 'event_id,person_id' },
      )
      .select()
      .single(),
  );
}

export async function clearRsvp(eventId: string, personId: string): Promise<void> {
  const { error } = await supabase
    .from('rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('person_id', personId);
  if (error) throw new Error(error.message);
}
