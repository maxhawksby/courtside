-- ============================================================================
-- Fix: creating an organization fails with "new row violates row-level
-- security policy for table organizations" (42501).
-- CONTRACT FILE: PM-authored (RLS).
--
-- Root cause: the client inserts with RETURNING (PostgREST
-- return=representation). Postgres enforces the table's SELECT policies on
-- rows returned by INSERT ... RETURNING, and it does so at insert time —
-- BEFORE the after-insert trigger (organizations_grant_owner) has granted the
-- creator their owner role. org_select requires app.is_org_member(id), which
-- is false at that instant, so the whole insert is rejected. Bootstrap
-- chicken-and-egg unique to organizations: every other table's creator
-- already holds a role that satisfies its SELECT policy.
--
-- Fix: an RPC that inserts WITHOUT returning, then selects the row as a
-- second statement — by which point the trigger has run and the caller is
-- the org's owner. SECURITY INVOKER on purpose: the insert still passes
-- through org_insert RLS (authenticated-only), and the final select through
-- org_select. No privilege escalation; same pattern as
-- create_channel_with_members.
-- ============================================================================

create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations
language plpgsql security invoker
set search_path = public, pg_temp as $$
declare
  v_id  uuid := gen_random_uuid();
  v_row public.organizations;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  insert into public.organizations (id, name, slug) values (v_id, p_name, p_slug);

  -- organizations_grant_owner (after-row trigger) has fired by now, so the
  -- caller passes org_select for this row.
  select * into v_row from public.organizations where id = v_id;
  return v_row;
end;
$$;
