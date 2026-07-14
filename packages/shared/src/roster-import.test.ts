import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseRosterCsv } from './roster-import';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

describe('parseRosterCsv', () => {
  it('parses a valid fixture byte-exactly', () => {
    const { rows, errors } = parseRosterCsv(fixture('roster-valid.csv'));

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        line: 2,
        first_name: 'Ava',
        last_name: 'Johnson',
        date_of_birth: '2015-04-02',
        role: 'player',
        jersey_number: '7',
        guardians: [
          {
            first_name: 'Maria',
            last_name: 'Johnson',
            email: 'maria@example.com',
            phone: '555-0101',
            relationship: 'mother',
          },
        ],
        media_consent: true,
        custom_fields: { t_shirt_size: 'YM' },
      },
      {
        line: 3,
        first_name: 'Ben',
        last_name: 'Lee',
        date_of_birth: '2014-11-19',
        role: 'player',
        jersey_number: null,
        guardians: [
          {
            first_name: 'David',
            last_name: 'Lee',
            email: 'david@example.com',
            phone: '555-0202',
            relationship: 'father',
          },
          {
            first_name: 'Grace',
            last_name: 'Lee',
            email: 'grace@example.com',
            phone: '555-0203',
            relationship: 'mother',
          },
        ],
        media_consent: null,
        custom_fields: { t_shirt_size: 'YL' },
      },
      {
        line: 4,
        first_name: 'Coach',
        last_name: 'Smith',
        date_of_birth: null,
        role: 'coach',
        jersey_number: null,
        guardians: [],
        media_consent: null,
        custom_fields: { t_shirt_size: '' },
      },
      {
        line: 5,
        first_name: 'Sam',
        last_name: 'Park',
        date_of_birth: null,
        role: 'scorekeeper',
        jersey_number: null,
        guardians: [],
        media_consent: null,
        custom_fields: { t_shirt_size: '' },
      },
    ]);
  });

  it('rejects a malformed fixture with per-line, human-readable errors', () => {
    const { rows, errors } = parseRosterCsv(fixture('roster-malformed.csv'));

    // Every row in the malformed fixture has exactly one problem, so none
    // of them qualify as a valid row.
    expect(rows).toEqual([]);
    expect(errors).toEqual([
      { line: 2, message: 'first_name and last_name are required' },
      { line: 3, message: 'date_of_birth is required for players' },
      { line: 4, message: 'role "manager" is not one of player, coach, scorekeeper' },
      {
        line: 5,
        message: 'guardian1_first_name and guardian1_last_name are required for player rows',
      },
      { line: 6, message: 'date_of_birth "02/15/2015" is not a valid YYYY-MM-DD date' },
      { line: 7, message: 'guardian2 requires both a first and last name' },
      { line: 8, message: 'media_consent: unrecognized value "maybe" (expected true/false)' },
    ]);
  });

  it('defaults a blank role to player', () => {
    const { rows, errors } = parseRosterCsv(
      'first_name,last_name,date_of_birth,guardian1_first_name,guardian1_last_name\n' +
        'Kai,Nguyen,2016-02-02,Sue,Nguyen\n',
    );
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe('player');
  });

  it('rejects an unrecognized role', () => {
    const { rows, errors } = parseRosterCsv(
      'first_name,last_name,date_of_birth,role,guardian1_first_name,guardian1_last_name\n' +
        'Jo,Blake,2015-01-01,manager,Sam,Blake\n',
    );
    expect(rows).toEqual([]);
    expect(errors).toEqual([
      { line: 2, message: 'role "manager" is not one of player, coach, scorekeeper' },
    ]);
  });

  it('normalizes role casing before validation', () => {
    const { rows, errors } = parseRosterCsv(
      'first_name,last_name,date_of_birth,role,guardian1_first_name,guardian1_last_name\n' +
        'Gia,Ross,2015-01-01,Player,Mo,Ross\n',
    );
    expect(errors).toEqual([]);
    expect(rows[0]?.role).toBe('player');
  });

  it('rejects guardian columns on a non-player row instead of silently linking them', () => {
    const { rows, errors } = parseRosterCsv(
      'first_name,last_name,role,guardian2_first_name,guardian2_last_name\n' +
        'Pat,Coachman,coach,Sly,Coachman\n',
    );
    expect(rows).toEqual([]);
    expect(errors).toEqual([
      { line: 2, message: 'guardian2_* columns are only allowed on player rows' },
    ]);
  });

  it('rejects calendar-rollover dates (Feb 30, and Feb 29 in a non-leap year)', () => {
    const { rows, errors } = parseRosterCsv(
      'first_name,last_name,date_of_birth,role,guardian1_first_name,guardian1_last_name\n' +
        'A,Rollover,2016-02-30,player,G,Rollover\n' +
        'B,Rollover,2015-02-29,player,G,Rollover\n',
    );
    expect(rows).toEqual([]);
    expect(errors).toEqual([
      { line: 2, message: 'date_of_birth "2016-02-30" is not a valid YYYY-MM-DD date' },
      { line: 3, message: 'date_of_birth "2015-02-29" is not a valid YYYY-MM-DD date' },
    ]);
  });

  it('accepts a genuine leap day', () => {
    const { rows, errors } = parseRosterCsv(
      'first_name,last_name,date_of_birth,role,guardian1_first_name,guardian1_last_name\n' +
        'C,Leap,2016-02-29,player,G,Leap\n',
    );
    expect(errors).toEqual([]);
    expect(rows[0]?.date_of_birth).toBe('2016-02-29');
  });

  it('gives a human-readable error for an empty file instead of raw papaparse text', () => {
    const { rows, errors } = parseRosterCsv('');
    expect(rows).toEqual([]);
    expect(errors).toEqual([{ line: 1, message: 'the CSV file is empty' }]);
  });
});
