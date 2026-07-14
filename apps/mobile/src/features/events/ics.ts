/**
 * RFC 5545 (iCalendar) export. Pure module — no filesystem/network I/O; see
 * `share-ics.ts` for the side-effecting write + share-sheet flow.
 */
import type { EventRow } from '@courtside/shared';

import { EVENT_TYPE_LABELS, formatTime } from './format';

const FOLD_LIMIT_OCTETS = 75;
const FALLBACK_DURATION_MS = 60 * 60 * 1000; // 1h, used when ends_at is null.

function utf8Length(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code <= 0x7f) return 1;
  if (code <= 0x7ff) return 2;
  if (code <= 0xffff) return 3;
  return 4;
}

/** RFC 5545 §3.1 line folding, by octet count (not character count). */
function foldLine(line: string): string {
  const chars = Array.from(line);
  let totalBytes = 0;
  for (const ch of chars) totalBytes += utf8Length(ch);
  if (totalBytes <= FOLD_LIMIT_OCTETS) return line;

  const rows: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = FOLD_LIMIT_OCTETS;
  for (const ch of chars) {
    const chBytes = utf8Length(ch);
    if (currentBytes + chBytes > limit) {
      rows.push(current);
      current = '';
      currentBytes = 0;
      limit = FOLD_LIMIT_OCTETS - 1; // continuation lines carry a leading space (1 octet).
    }
    current += ch;
    currentBytes += chBytes;
  }
  if (current) rows.push(current);

  return rows.map((row, i) => (i === 0 ? row : ` ${row}`)).join('\r\n');
}

/** RFC 5545 §3.3.11 TEXT escaping. Backslash first, then the rest. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Builds an RFC 5545 VCALENDAR string for `events`. Deterministic given `now`. */
export function buildIcs(events: EventRow[], calendarName: string, now: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//R&G Hoops//Schedule Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    const start = new Date(event.starts_at);
    const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + FALLBACK_DURATION_MS);
    const summary = event.title?.trim() || EVENT_TYPE_LABELS[event.type];

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@randghoops`);
    lines.push(`DTSTAMP:${toIcsUtc(now.toISOString())}`);
    lines.push(`DTSTART:${toIcsUtc(event.starts_at)}`);
    lines.push(`DTEND:${toIcsUtc(end.toISOString())}`);
    lines.push(`SUMMARY:${escapeText(summary)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);

    const descriptionParts: string[] = [];
    if (event.arrival_at) descriptionParts.push(`Arrive by ${formatTime(event.arrival_at)}`);
    if (event.notes) descriptionParts.push(event.notes);
    if (descriptionParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeText(descriptionParts.join('\n'))}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}
