-- ============================================================================
-- SafeSport/MAAPP messaging guardrails — CONTRACT FILE: PM-authored.
-- docs/COMPLIANCE.md §3. Enforced in the database so no client build can
-- construct an unguarded staff↔minor thread:
--   * A channel containing a staff member and a minor must contain at least
--     two adults (guardian or second adult). Kills 1:1 coach↔minor DMs and
--     coach+minors-only groups, at commit time, regardless of insert order.
--   * Members may create direct-message channels (team_season_id is null);
--     team channels remain staff/admin-created (schema v1 policies).
--   * messages.out_of_hours: client-computed 8pm–8am local flag on sends,
--     kept for the exportable communication log.
-- Under-13s can never appear in any channel: they cannot hold logins at all
-- (schema v1 user_profiles trigger), so "minor" here is the 13–17 range.
-- ============================================================================

alter table public.messages add column out_of_hours boolean not null default false;

-- ----------------------------------------------------------------------------
-- Helpers (security definer like the schema v1 app.* family)
-- ----------------------------------------------------------------------------

-- Minor = DOB known and under 18. Unknown DOB ⇒ not a minor: person records
-- for players are DOB-required at the product layer; adults often lack DOB.
create or replace function app.is_minor_person(p_person uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.persons p
    where p.id = p_person
      and p.date_of_birth is not null
      and p.date_of_birth > (current_date - interval '18 years')
  );
$$;

create or replace function app.user_is_minor(p_user uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.user_profiles up
    where up.user_id = p_user and app.is_minor_person(up.person_id)
  );
$$;

-- Staff for MAAPP purposes: any authority role, at any scope, in the org.
create or replace function app.user_is_staff(p_user uuid, p_org uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.org_roles r
    where r.user_id = p_user
      and r.organization_id = p_org
      and r.role in ('owner','division_admin','coach','scorekeeper')
  );
$$;

create or replace function app.user_in_org(p_user uuid, p_org uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.org_roles r
    where r.user_id = p_user and r.organization_id = p_org
  ) or exists (
    select 1 from public.user_profiles up
    where up.user_id = p_user and up.organization_id = p_org
  );
$$;

-- ----------------------------------------------------------------------------
-- Composition rule, enforced at transaction commit
-- ----------------------------------------------------------------------------

create or replace function app.assert_channel_composition(p_channel uuid)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_org    uuid;
  v_minors int;
  v_staff  int;
  v_adults int;
begin
  select organization_id into v_org from public.channels where id = p_channel;
  if v_org is null then
    return; -- channel deleted in the same transaction (cascade)
  end if;

  select
    count(*) filter (where app.user_is_minor(cm.user_id)),
    count(*) filter (where app.user_is_staff(cm.user_id, v_org)),
    count(*) filter (where not app.user_is_minor(cm.user_id))
  into v_minors, v_staff, v_adults
  from public.channel_members cm
  where cm.channel_id = p_channel;

  if v_minors > 0 and v_staff > 0 and v_adults < 2 then
    raise exception
      'SafeSport: a channel with a staff member and a minor needs at least two adults on it';
  end if;
end;
$$;

create or replace function app.channel_members_safesport_check()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  perform app.assert_channel_composition(coalesce(new.channel_id, old.channel_id));
  return null;
end;
$$;

-- Deferred: validates the final composition of the transaction, so the
-- create-channel RPC can insert channel + members in any order — and a later
-- DELETE that would leave a minor alone with staff fails too.
create constraint trigger channel_members_safesport
  after insert or update or delete on public.channel_members
  deferrable initially deferred
  for each row execute function app.channel_members_safesport_check();

-- ----------------------------------------------------------------------------
-- Direct messages: any org member may open one and manage its membership.
-- The composition trigger above is what keeps minors safe in these; RLS keeps
-- them org-scoped. Team channels are untouched (schema v1 staff-only writes).
-- ----------------------------------------------------------------------------

create policy channels_insert_dm on public.channels for insert
  with check (
    team_season_id is null
    and is_all_hands = false
    and created_by = auth.uid()
    and app.is_org_member(organization_id)
  );

create policy channel_members_dm_manage on public.channel_members for all
  using (
    exists (
      select 1 from public.channels c
      where c.id = channel_members.channel_id
        and c.team_season_id is null
        and c.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.channels c
      where c.id = channel_members.channel_id
        and c.team_season_id is null
        and c.created_by = auth.uid()
    )
    and app.user_in_org(user_id, organization_id)
  );

-- Anyone may leave a channel themselves (the trigger blocks a departure that
-- would strand a minor alone with staff).
create policy channel_members_leave on public.channel_members for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Atomic channel creation — the only client path (lib/data/messaging.ts).
-- SECURITY INVOKER: every insert inside still passes the caller's RLS.
-- ----------------------------------------------------------------------------

create or replace function public.create_channel_with_members(
  p_org uuid,
  p_name text,
  p_member_user_ids uuid[],
  p_team_season uuid default null,
  p_is_read_only boolean default false
) returns public.channels
language plpgsql security invoker
set search_path = public, pg_temp as $$
declare
  v_id     uuid := gen_random_uuid();
  v_uid    uuid := auth.uid();
  v_member uuid;
  v_row    public.channels;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  insert into public.channels
    (id, organization_id, team_season_id, name, is_all_hands, is_read_only, created_by)
  values
    (v_id, p_org, p_team_season, p_name, false, p_is_read_only, v_uid);

  insert into public.channel_members (channel_id, user_id, organization_id)
  values (v_id, v_uid, p_org);

  foreach v_member in array coalesce(p_member_user_ids, '{}') loop
    if v_member <> v_uid then
      insert into public.channel_members (channel_id, user_id, organization_id)
      values (v_id, v_member, p_org);
    end if;
  end loop;

  select * into v_row from public.channels where id = v_id;
  return v_row;
end;
$$;
