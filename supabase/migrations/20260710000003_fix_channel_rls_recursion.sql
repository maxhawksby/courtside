-- ============================================================================
-- Fix: infinite RLS recursion between channels / channel_members / messages.
-- CONTRACT FILE: PM-authored (RLS).
--
-- schema v1's channels_select and channel_members_select referenced each
-- other's tables via plain EXISTS subqueries. Policy subqueries run under the
-- caller's row security, so Postgres detects a policy cycle (42P17) for any
-- non-admin read of channels — which also breaks messages (its policies
-- subquery channel_members). Caught by the Phase-1 RLS matrix (test suite);
-- invisible to service-role access.
--
-- Fix: all cross-references between these three tables go through
-- security-definer helpers (same pattern as app.is_org_member), used
-- uniformly so no policy ever evaluates another of the trio's policies.
-- ============================================================================

create or replace function app.is_channel_member(p_channel uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.channel_members cm
    where cm.channel_id = p_channel and cm.user_id = auth.uid()
  );
$$;

-- Staff of the channel's team (channels with no team_season yield false).
create or replace function app.is_channel_staff(p_channel uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.channels c
    where c.id = p_channel
      and c.team_season_id is not null
      and app.is_team_staff(c.team_season_id)
  );
$$;

create or replace function app.is_dm_creator(p_channel uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.channels c
    where c.id = p_channel
      and c.team_season_id is null
      and c.created_by = auth.uid()
  );
$$;

-- Missing channel reads as read-only: fail closed for inserts.
create or replace function app.channel_is_read_only(p_channel uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select coalesce(
    (select c.is_read_only from public.channels c where c.id = p_channel),
    true
  );
$$;

-- ---- channels ----

drop policy channels_select on public.channels;
create policy channels_select on public.channels for select
  using (
    app.is_channel_member(id)
    or app.has_org_role(organization_id, array['owner','division_admin'])
  );

-- ---- channel_members ----

drop policy channel_members_select on public.channel_members;
create policy channel_members_select on public.channel_members for select
  using (
    user_id = auth.uid()
    or app.has_org_role(organization_id, array['owner','division_admin'])
    or app.is_channel_staff(channel_id)
    or (app.is_dm_creator(channel_id) or (app.is_channel_member(channel_id)))
  );

drop policy channel_members_write on public.channel_members;
create policy channel_members_write on public.channel_members for all
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or app.is_channel_staff(channel_id)
  )
  with check (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or app.is_channel_staff(channel_id)
  );

drop policy channel_members_dm_manage on public.channel_members;
create policy channel_members_dm_manage on public.channel_members for all
  using (app.is_dm_creator(channel_id))
  with check (
    app.is_dm_creator(channel_id)
    and app.user_in_org(user_id, organization_id)
  );

-- channel_members_self_update and channel_members_leave reference only their
-- own row (user_id = auth.uid()) — no cycle, unchanged.

-- ---- messages ----

drop policy messages_select on public.messages;
create policy messages_select on public.messages for select
  using (
    app.is_channel_member(channel_id)
    or app.has_org_role(organization_id, array['owner','division_admin'])
  );

drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (
    sender_user_id = auth.uid()
    and app.is_channel_member(channel_id)
    and (
      not app.channel_is_read_only(channel_id)
      or app.has_org_role(organization_id, array['owner','division_admin'])
      or app.is_channel_staff(channel_id)
    )
  );

drop policy messages_update on public.messages;
create policy messages_update on public.messages for update
  using (
    sender_user_id = auth.uid()
    or app.has_org_role(organization_id, array['owner','division_admin'])
    or app.is_channel_staff(channel_id)
  );
