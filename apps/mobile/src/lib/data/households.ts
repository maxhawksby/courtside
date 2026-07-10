/**
 * Data-access layer, households — CONTRACT FILE (PM-owned).
 * A household groups person records (a family). Pure grouping — guardianship,
 * not household membership, is what grants access to a child's data.
 */
import type { HouseholdMemberRow, HouseholdRow, PersonRow } from '@courtside/shared';

import { supabase } from '../supabase';
import { many, one } from './_helpers';

export type HouseholdWithMembers = HouseholdRow & {
  household_members: (HouseholdMemberRow & { persons: PersonRow | null })[];
};

export async function listHouseholds(orgId: string): Promise<HouseholdWithMembers[]> {
  return many(
    supabase
      .from('households')
      .select('*, household_members(*, persons(*))')
      .eq('organization_id', orgId)
      .order('name'),
  );
}

export async function getHousehold(householdId: string): Promise<HouseholdWithMembers> {
  return one(
    supabase
      .from('households')
      .select('*, household_members(*, persons(*))')
      .eq('id', householdId)
      .single(),
  );
}

export async function createHousehold(orgId: string, name: string): Promise<HouseholdRow> {
  return one(
    supabase.from('households').insert({ organization_id: orgId, name }).select().single(),
  );
}

export async function addHouseholdMember(
  orgId: string,
  householdId: string,
  personId: string,
  isOwner = false,
): Promise<HouseholdMemberRow> {
  return one(
    supabase
      .from('household_members')
      .insert({
        organization_id: orgId,
        household_id: householdId,
        person_id: personId,
        is_owner: isOwner,
      })
      .select()
      .single(),
  );
}

export async function removeHouseholdMember(householdId: string, personId: string): Promise<void> {
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('person_id', personId);
  if (error) throw new Error(error.message);
}
