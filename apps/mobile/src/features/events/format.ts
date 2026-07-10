import type { EventType } from '@courtside/shared';

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  game: 'Game',
  practice: 'Practice',
  general: 'General',
};

/** Stable key for grouping events by local calendar day. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** e.g. "Monday, July 15" */
export function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** e.g. "6:30 PM" */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** e.g. "Wed, Jul 15, 6:30 PM" — used for full date+time display in a detail view. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
