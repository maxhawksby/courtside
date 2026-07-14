/**
 * Roster CSV parsing — CONTRACT FILE (PM-owned). Pure: no I/O, no Supabase.
 * Turns a raw CSV string into typed, validated rows the data layer can act
 * on (apps/mobile/src/lib/data/roster-import.ts does the actual writes).
 *
 * A row with any validation problem is dropped from `rows` entirely and its
 * problems are reported in `errors` instead — callers never see a partially
 * valid row, so downstream import code doesn't need to re-check invariants
 * this module already enforced.
 *
 * Line numbers assume no blank lines and no fields containing embedded
 * newlines (true for spreadsheet-exported rosters, the only source in
 * practice): header is line 1, so data row `index` (0-based) is line
 * `index + 2`.
 */
import Papa from 'papaparse';

export const ROSTER_ROW_ROLES = ['player', 'coach', 'scorekeeper'] as const;
export type RosterRowRole = (typeof ROSTER_ROW_ROLES)[number];

const KNOWN_COLUMNS = [
  'first_name',
  'last_name',
  'date_of_birth',
  'role',
  'jersey_number',
  'guardian1_first_name',
  'guardian1_last_name',
  'guardian1_email',
  'guardian1_phone',
  'guardian1_relationship',
  'guardian2_first_name',
  'guardian2_last_name',
  'guardian2_email',
  'guardian2_phone',
  'guardian2_relationship',
  'media_consent',
] as const;
const KNOWN_COLUMN_SET: ReadonlySet<string> = new Set(KNOWN_COLUMNS);

export interface RosterCsvGuardian {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
}

export interface RosterCsvRow {
  /** 1-indexed source line (header = line 1). */
  line: number;
  first_name: string;
  last_name: string;
  /** YYYY-MM-DD, or null (only possible when role !== 'player'). */
  date_of_birth: string | null;
  role: RosterRowRole;
  jersey_number: string | null;
  /** 0-2 entries, guardian1 first when both present. */
  guardians: RosterCsvGuardian[];
  /** null = column absent/blank — caller writes no media_consents row. */
  media_consent: boolean | null;
  /** Unmapped CSV columns, verbatim — sink for persons.custom_fields. */
  custom_fields: Record<string, string>;
}

export interface RosterCsvError {
  line: number;
  message: string;
}

export interface ParseRosterCsvResult {
  rows: RosterCsvRow[];
  errors: RosterCsvError[];
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Strict YYYY-MM-DD check. `new Date(...)` alone is not enough: JS silently
 * rolls over invalid calendar dates (2016-02-30 becomes 2016-03-01), so this
 * round-trips the parsed components back through Date.UTC and rejects
 * anything that didn't come back unchanged — catches bad days-in-month
 * (Feb 30) and non-leap-year Feb 29 alike.
 */
function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

const TRUTHY = new Set(['true', 'yes', 'y', '1']);
const FALSY = new Set(['false', 'no', 'n', '0']);

function parseConsent(value: string | undefined, line: number, errors: RosterCsvError[]): boolean | null {
  const raw = (value ?? '').trim();
  if (raw === '') return null;
  const lower = raw.toLowerCase();
  if (TRUTHY.has(lower)) return true;
  if (FALSY.has(lower)) return false;
  errors.push({ line, message: `media_consent: unrecognized value "${raw}" (expected true/false)` });
  return null;
}

const GUARDIAN_FIELD_SUFFIXES = ['first_name', 'last_name', 'email', 'phone', 'relationship'] as const;

function hasAnyGuardianField(record: Record<string, string>, prefix: 'guardian1' | 'guardian2'): boolean {
  return GUARDIAN_FIELD_SUFFIXES.some((suffix) => blankToNull(record[`${prefix}_${suffix}`]) !== null);
}

function parseGuardian(
  record: Record<string, string>,
  prefix: 'guardian1' | 'guardian2',
  line: number,
  required: boolean,
  errors: RosterCsvError[],
): RosterCsvGuardian | null {
  const first_name = blankToNull(record[`${prefix}_first_name`]);
  const last_name = blankToNull(record[`${prefix}_last_name`]);
  const email = blankToNull(record[`${prefix}_email`]);
  const phone = blankToNull(record[`${prefix}_phone`]);
  const relationship = blankToNull(record[`${prefix}_relationship`]);

  const anyField = first_name || last_name || email || phone || relationship;
  if (!anyField) {
    if (required) {
      errors.push({
        line,
        message: `${prefix}_first_name and ${prefix}_last_name are required for player rows`,
      });
    }
    return null;
  }
  if (!first_name || !last_name) {
    errors.push({ line, message: `${prefix} requires both a first and last name` });
    return null;
  }
  return { first_name, last_name, email, phone, relationship };
}

export function parseRosterCsv(text: string): ParseRosterCsvResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const errors: RosterCsvError[] = [];
  const rows: RosterCsvRow[] = [];

  const papaErrorLines = new Set<number>();
  for (const err of parsed.errors) {
    // File-level errors (no `row`, e.g. an empty file) aren't tied to any
    // data row, so they don't mark one as structurally malformed — and get
    // a message a non-engineer can act on instead of papaparse's internal
    // wording.
    if (err.row == null) {
      const message = err.code === 'UndetectableDelimiter' ? 'the CSV file is empty' : err.message;
      errors.push({ line: 1, message });
      continue;
    }
    const line = err.row + 2;
    papaErrorLines.add(line);
    errors.push({ line, message: err.message });
  }

  parsed.data.forEach((record, index) => {
    const line = index + 2;
    if (papaErrorLines.has(line)) return; // row is structurally malformed; skip field validation

    const rowErrors: RosterCsvError[] = [];

    const first_name = blankToNull(record.first_name);
    const last_name = blankToNull(record.last_name);
    if (!first_name || !last_name) {
      rowErrors.push({ line, message: 'first_name and last_name are required' });
    }

    const roleRaw = blankToNull(record.role);
    const roleNormalized = roleRaw ? roleRaw.toLowerCase() : null;
    let role: RosterRowRole = 'player';
    if (roleNormalized) {
      if (!(ROSTER_ROW_ROLES as readonly string[]).includes(roleNormalized)) {
        rowErrors.push({
          line,
          message: `role "${roleRaw}" is not one of ${ROSTER_ROW_ROLES.join(', ')}`,
        });
      } else {
        role = roleNormalized as RosterRowRole;
      }
    }

    const dobRaw = blankToNull(record.date_of_birth);
    let date_of_birth: string | null = null;
    if (dobRaw) {
      if (!isValidIsoDate(dobRaw)) {
        rowErrors.push({ line, message: `date_of_birth "${dobRaw}" is not a valid YYYY-MM-DD date` });
      } else {
        date_of_birth = dobRaw;
      }
    } else if (role === 'player') {
      rowErrors.push({ line, message: 'date_of_birth is required for players' });
    }

    // Guardian columns model a guardian->player relationship (COPPA/SafeSport
    // adjacent — see COMPLIANCE.md §2-3): allowing them on a coach/scorekeeper
    // row would create a real guardianships link against that staff member's
    // own person record, granting guardian-level visibility it was never
    // meant to have. Reject outright rather than silently ignoring the data.
    let guardians: RosterCsvGuardian[] = [];
    if (role !== 'player') {
      if (hasAnyGuardianField(record, 'guardian1')) {
        rowErrors.push({ line, message: 'guardian1_* columns are only allowed on player rows' });
      }
      if (hasAnyGuardianField(record, 'guardian2')) {
        rowErrors.push({ line, message: 'guardian2_* columns are only allowed on player rows' });
      }
    } else {
      const guardian1 = parseGuardian(record, 'guardian1', line, true, rowErrors);
      const guardian2 = parseGuardian(record, 'guardian2', line, false, rowErrors);
      guardians = [guardian1, guardian2].filter((g): g is RosterCsvGuardian => g != null);
    }

    const media_consent = parseConsent(record.media_consent, line, rowErrors);

    errors.push(...rowErrors);
    if (rowErrors.length > 0) return;

    const custom_fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key !== '' && !KNOWN_COLUMN_SET.has(key)) {
        custom_fields[key] = (value ?? '').trim();
      }
    }

    rows.push({
      line,
      first_name: first_name as string,
      last_name: last_name as string,
      date_of_birth,
      role,
      jersey_number: blankToNull(record.jersey_number),
      guardians,
      media_consent,
      custom_fields,
    });
  });

  return { rows, errors };
}
