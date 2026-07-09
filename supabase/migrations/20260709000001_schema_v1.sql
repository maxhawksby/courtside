-- ============================================================================
-- courtside schema v1 — organizations, people, teams, scheduling, messaging,
-- scorekeeping. CONTRACT FILE: PM-authored; RLS changes require PM review.
--
-- Invariants encoded here (see docs/ARCHITECTURE.md, docs/COMPLIANCE.md):
--   * organization_id on every table; every policy scopes by it (tenant-ready).
--   * persons are persistent; logins (auth.users) are optional and adult/13+.
--   * game_events is an append-only log; stats are always derived, never stored.
--   * messages are soft-delete only (deleted_at); no hard DELETE grant.
--   * media consent gates child media (media_consents).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Helper schema: security-definer functions used inside RLS policies.
-- Definer = table owner, so these bypass RLS and cannot recurse.
-- ----------------------------------------------------------------------------
create schema if not exists app;

-- ============================================================================
-- TABLES
-- ============================================================================

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  branding    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table public.divisions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.seasons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  starts_on       date,
  ends_on         date,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.teams (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  division_id     uuid references public.divisions(id) on delete set null,
  name            text not null,
  created_at      timestamptz not null default now()
);

create table public.team_seasons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id         uuid not null references public.teams(id) on delete cascade,
  season_id       uuid not null references public.seasons(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (team_id, season_id)
);

-- Persistent person records: one row per human, forever. No login required.
create table public.persons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name      text not null,
  last_name       text not null,
  date_of_birth   date,
  email           text,
  phone           text,
  photo_path      text,
  custom_fields   jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- duplicate detection support (merge tooling comes later)
create index persons_dedup_idx on public.persons (organization_id, lower(first_name), lower(last_name), date_of_birth);

-- Sensitive person data split out so RLS can be strictly narrower.
create table public.persons_sensitive (
  person_id         uuid primary key references public.persons(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  medical_notes     text,
  emergency_contact jsonb,
  updated_at        timestamptz not null default now()
);

create table public.households (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now()
);

create table public.household_members (
  household_id    uuid not null references public.households(id) on delete cascade,
  person_id       uuid not null references public.persons(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  is_owner        boolean not null default false,
  primary key (household_id, person_id)
);

-- guardian ↔ player, many-to-many, capped (trigger below)
create table public.guardianships (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  guardian_person_id uuid not null references public.persons(id) on delete cascade,
  player_person_id   uuid not null references public.persons(id) on delete cascade,
  relationship       text,
  created_at         timestamptz not null default now(),
  unique (guardian_person_id, player_person_id),
  check (guardian_person_id <> player_person_id)
);

-- Link between an auth account and a person. Adults and players 13+ only
-- (trigger enforces the age invariant).
create table public.user_profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  person_id       uuid not null unique references public.persons(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table public.org_roles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('owner','division_admin','coach','scorekeeper','parent','follower')),
  scope_type      text not null default 'organization' check (scope_type in ('organization','division','team')),
  division_id     uuid references public.divisions(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete cascade,
  created_at      timestamptz not null default now(),
  check (scope_type <> 'division' or division_id is not null),
  check (scope_type <> 'team' or team_id is not null),
  unique (organization_id, user_id, role, scope_type, division_id, team_id)
);

create table public.invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  person_id       uuid references public.persons(id) on delete cascade,
  role            text not null check (role in ('division_admin','coach','scorekeeper','parent','follower')),
  scope_type      text not null default 'organization' check (scope_type in ('organization','division','team')),
  division_id     uuid references public.divisions(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete cascade,
  token           uuid not null unique default gen_random_uuid(),
  expires_at      timestamptz not null default now() + interval '14 days',
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users(id),
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now()
);

create table public.roster_memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_season_id  uuid not null references public.team_seasons(id) on delete cascade,
  person_id       uuid not null references public.persons(id) on delete cascade,
  role            text not null default 'player' check (role in ('player','coach','scorekeeper')),
  jersey_number   text,
  created_at      timestamptz not null default now(),
  unique (team_season_id, person_id)
);

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_season_id  uuid references public.team_seasons(id) on delete cascade,
  type            text not null check (type in ('game','practice','general')),
  title           text,
  starts_at       timestamptz not null,
  arrival_at      timestamptz,
  ends_at         timestamptz,
  location        text,
  notes           text,
  recurrence      jsonb,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.rsvps (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id        uuid not null references public.events(id) on delete cascade,
  person_id       uuid not null references public.persons(id) on delete cascade,
  status          text not null check (status in ('going','not_going')),
  responded_by    uuid references auth.users(id),
  updated_at      timestamptz not null default now(),
  unique (event_id, person_id)
);

create table public.games (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  event_id              uuid not null unique references public.events(id) on delete cascade,
  team_season_id        uuid not null references public.team_seasons(id) on delete cascade,
  opponent_name         text not null default 'Opponent',
  is_home               boolean not null default true,
  period_format         text not null default 'quarters' check (period_format in ('quarters','halves')),
  opponent_scoring_mode text not null default 'team_only' check (opponent_scoring_mode in ('team_only','player_assignment')),
  status                text not null default 'scheduled' check (status in ('scheduled','live','final')),
  scorekeeper_user_id   uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Append-only play log. Stats are DERIVED from this — never stored.
-- Corrections: void the event (voided_at) and insert a replacement.
-- Idempotent sync: client_uuid is globally unique per event; (game_id, device_id,
-- client_seq) is the per-device ordering key.
create table public.game_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  game_id         uuid not null references public.games(id) on delete cascade,
  client_uuid     uuid not null unique,
  device_id       text not null,
  client_seq      bigint not null,
  event_type      text not null check (event_type in (
    'fg2_made','fg2_missed','fg3_made','fg3_missed','ft_made','ft_missed',
    'rebound_off','rebound_def','assist','steal','block','turnover',
    'foul_personal','foul_technical','timeout','sub_in','sub_out',
    'period_start','period_end','game_final')),
  period          int not null default 1,
  clock_seconds   int,
  person_id       uuid references public.persons(id) on delete set null,
  opponent_player text,
  payload         jsonb not null default '{}',
  voided_at       timestamptz,
  voided_by       uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  unique (game_id, device_id, client_seq)
);
create index game_events_game_idx on public.game_events (game_id, created_at);

create table public.channels (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_season_id  uuid references public.team_seasons(id) on delete cascade,
  name            text not null,
  is_all_hands    boolean not null default false,
  is_read_only    boolean not null default false,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create table public.channel_members (
  channel_id      uuid not null references public.channels(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  muted           boolean not null default false,
  last_read_at    timestamptz,
  primary key (channel_id, user_id)
);

-- Soft-delete only: deleted messages keep their row (tombstone in UI, audit
-- intact). No DELETE policy exists on this table by design (SafeSport MAAPP).
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id      uuid not null references public.channels(id) on delete cascade,
  sender_user_id  uuid not null references auth.users(id),
  body            text,
  media_paths     text[] not null default '{}',
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid references auth.users(id)
);
create index messages_channel_idx on public.messages (channel_id, created_at);

-- Per-child, revocable. No consent row with granted=true → the child's media
-- must not render anywhere (enforced app-side + reviewed; see COMPLIANCE.md).
create table public.media_consents (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  player_person_id   uuid not null references public.persons(id) on delete cascade,
  granted_by_user_id uuid not null references auth.users(id),
  granted            boolean not null,
  note               text,
  created_at         timestamptz not null default now()
);
create index media_consents_player_idx on public.media_consents (player_person_id, created_at desc);

-- ============================================================================
-- HELPER FUNCTIONS (security definer: bypass RLS, no recursion)
-- ============================================================================

create or replace function app.has_org_role(p_org uuid, p_roles text[])
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.org_roles r
    where r.organization_id = p_org
      and r.user_id = auth.uid()
      and r.role = any (p_roles)
  );
$$;

create or replace function app.is_org_member(p_org uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.org_roles r
    where r.organization_id = p_org and r.user_id = auth.uid()
  );
$$;

-- Staff (coach/scorekeeper role) for the team behind a team_season — whether
-- granted team-scoped, division-scoped, or org-wide.
create or replace function app.is_team_staff(p_team_season uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.team_seasons ts
    join public.teams t on t.id = ts.team_id
    join public.org_roles r on r.organization_id = ts.organization_id
      and r.user_id = auth.uid()
      and r.role in ('owner','division_admin','coach','scorekeeper')
    where ts.id = p_team_season
      and (
        r.scope_type = 'organization'
        or (r.scope_type = 'division' and r.division_id = t.division_id)
        or (r.scope_type = 'team' and r.team_id = t.id)
      )
  );
$$;

-- Current user's person record (if linked).
create or replace function app.my_person_id()
returns uuid language sql stable security definer
set search_path = public, pg_temp as $$
  select person_id from public.user_profiles where user_id = auth.uid();
$$;

-- Is the current user a guardian of this person?
create or replace function app.is_guardian_of(p_person uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.guardianships g
    where g.player_person_id = p_person
      and g.guardian_person_id = app.my_person_id()
  );
$$;

-- Can the current user see this person in the directory?
-- owner/division_admin: all · coach/scorekeeper: own rostered people + their
-- guardians · anyone: self · parent: their linked players.
create or replace function app.can_see_person(p_person uuid, p_org uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select
    app.has_org_role(p_org, array['owner','division_admin'])
    or p_person = app.my_person_id()
    or app.is_guardian_of(p_person)
    -- staff see people rostered on their teams
    or exists (
      select 1 from public.roster_memberships rm
      where rm.person_id = p_person and app.is_team_staff(rm.team_season_id)
    )
    -- staff see guardians of people rostered on their teams
    or exists (
      select 1
      from public.guardianships g
      join public.roster_memberships rm on rm.person_id = g.player_person_id
      where g.guardian_person_id = p_person
        and app.is_team_staff(rm.team_season_id)
    )
    -- parents see staff & players of teams their kids are rostered on
    or exists (
      select 1
      from public.roster_memberships rm_kid
      join public.guardianships g on g.player_person_id = rm_kid.person_id
      join public.roster_memberships rm_other on rm_other.team_season_id = rm_kid.team_season_id
      where g.guardian_person_id = app.my_person_id()
        and rm_other.person_id = p_person
    );
$$;

-- Does the current user follow/participate in this team_season (any role)?
create or replace function app.in_team_season(p_team_season uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select
    app.is_team_staff(p_team_season)
    or exists (  -- self rostered (player 13+)
      select 1 from public.roster_memberships rm
      where rm.team_season_id = p_team_season and rm.person_id = app.my_person_id()
    )
    or exists (  -- guardian of a rostered player
      select 1 from public.roster_memberships rm
      join public.guardianships g on g.player_person_id = rm.person_id
      where rm.team_season_id = p_team_season
        and g.guardian_person_id = app.my_person_id()
    );
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create or replace function app.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger persons_updated_at before update on public.persons
  for each row execute function app.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function app.set_updated_at();
create trigger games_updated_at before update on public.games
  for each row execute function app.set_updated_at();

-- Whoever creates an organization becomes its owner.
create or replace function app.grant_owner_on_org_insert()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null then
    insert into public.org_roles (organization_id, user_id, role, scope_type)
    values (new.id, auth.uid(), 'owner', 'organization');
  end if;
  return new;
end $$;

create trigger organizations_grant_owner after insert on public.organizations
  for each row execute function app.grant_owner_on_org_insert();

-- Guardianship cap (GUARDIANSHIP_MAX_PER_PLAYER in @courtside/shared).
create or replace function app.enforce_guardianship_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.guardianships
      where player_person_id = new.player_person_id) >= 5 then
    raise exception 'guardianship cap reached for player %', new.player_person_id;
  end if;
  return new;
end $$;

create trigger guardianships_cap before insert on public.guardianships
  for each row execute function app.enforce_guardianship_cap();

-- COPPA invariant: a person under 13 can never be linked to a login.
create or replace function app.enforce_login_min_age()
returns trigger language plpgsql as $$
declare v_dob date;
begin
  select date_of_birth into v_dob from public.persons where id = new.person_id;
  if v_dob is not null and v_dob > (current_date - interval '13 years') then
    raise exception 'persons under 13 cannot hold login accounts (COPPA)';
  end if;
  return new;
end $$;

create trigger user_profiles_min_age before insert or update on public.user_profiles
  for each row execute function app.enforce_login_min_age();

-- Messages: hard deletes are forbidden at trigger level too (belt & braces).
create or replace function app.forbid_message_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'messages are soft-delete only (set deleted_at)';
end $$;

create trigger messages_no_delete before delete on public.messages
  for each row execute function app.forbid_message_delete();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.organizations      enable row level security;
alter table public.divisions          enable row level security;
alter table public.seasons            enable row level security;
alter table public.teams              enable row level security;
alter table public.team_seasons       enable row level security;
alter table public.persons            enable row level security;
alter table public.persons_sensitive  enable row level security;
alter table public.households         enable row level security;
alter table public.household_members  enable row level security;
alter table public.guardianships      enable row level security;
alter table public.user_profiles      enable row level security;
alter table public.org_roles          enable row level security;
alter table public.invites            enable row level security;
alter table public.roster_memberships enable row level security;
alter table public.events             enable row level security;
alter table public.rsvps              enable row level security;
alter table public.games              enable row level security;
alter table public.game_events        enable row level security;
alter table public.channels           enable row level security;
alter table public.channel_members    enable row level security;
alter table public.messages           enable row level security;
alter table public.media_consents     enable row level security;

-- organizations: members read; any authenticated user may create (becomes owner
-- via trigger); only owners update. No delete policy (no org deletion in v1).
create policy org_select on public.organizations for select
  using (app.is_org_member(id));
create policy org_insert on public.organizations for insert
  to authenticated with check (true);
create policy org_update on public.organizations for update
  using (app.has_org_role(id, array['owner']));

-- divisions / seasons / teams / team_seasons: members read; owner+division_admin write.
create policy divisions_select on public.divisions for select
  using (app.is_org_member(organization_id));
create policy divisions_write on public.divisions for all
  using (app.has_org_role(organization_id, array['owner','division_admin']))
  with check (app.has_org_role(organization_id, array['owner','division_admin']));

create policy seasons_select on public.seasons for select
  using (app.is_org_member(organization_id));
create policy seasons_write on public.seasons for all
  using (app.has_org_role(organization_id, array['owner','division_admin']))
  with check (app.has_org_role(organization_id, array['owner','division_admin']));

create policy teams_select on public.teams for select
  using (app.is_org_member(organization_id));
create policy teams_write on public.teams for all
  using (app.has_org_role(organization_id, array['owner','division_admin']))
  with check (app.has_org_role(organization_id, array['owner','division_admin']));

create policy team_seasons_select on public.team_seasons for select
  using (app.is_org_member(organization_id));
create policy team_seasons_write on public.team_seasons for all
  using (app.has_org_role(organization_id, array['owner','division_admin']))
  with check (app.has_org_role(organization_id, array['owner','division_admin']));

-- persons: directory visibility via app.can_see_person; admins + team staff
-- create; admins, staff (for their rostered people), self, and guardians update.
create policy persons_select on public.persons for select
  using (app.can_see_person(id, organization_id));
create policy persons_insert on public.persons for insert
  with check (app.has_org_role(organization_id, array['owner','division_admin','coach']));
create policy persons_update on public.persons for update
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or id = app.my_person_id()
    or app.is_guardian_of(id)
    or exists (
      select 1 from public.roster_memberships rm
      where rm.person_id = persons.id and app.is_team_staff(rm.team_season_id)
    )
  );

-- persons_sensitive: STRICTLY narrower — admins, guardians, self, and coaches
-- of a team the person is rostered on. Followers/other parents never.
create policy persons_sensitive_select on public.persons_sensitive for select
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or person_id = app.my_person_id()
    or app.is_guardian_of(person_id)
    or exists (
      select 1 from public.roster_memberships rm
      where rm.person_id = persons_sensitive.person_id
        and app.is_team_staff(rm.team_season_id)
    )
  );
create policy persons_sensitive_write on public.persons_sensitive for all
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or person_id = app.my_person_id()
    or app.is_guardian_of(person_id)
  )
  with check (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or person_id = app.my_person_id()
    or app.is_guardian_of(person_id)
  );

-- households & members: admins all; members of the household see their own.
create policy households_select on public.households for select
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id and hm.person_id = app.my_person_id()
    )
  );
create policy households_write on public.households for all
  using (app.has_org_role(organization_id, array['owner','division_admin']))
  with check (app.has_org_role(organization_id, array['owner','division_admin']));

create policy household_members_select on public.household_members for select
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or exists (
      select 1 from public.household_members hm2
      where hm2.household_id = household_members.household_id
        and hm2.person_id = app.my_person_id()
    )
  );
create policy household_members_write on public.household_members for all
  using (app.has_org_role(organization_id, array['owner','division_admin']))
  with check (app.has_org_role(organization_id, array['owner','division_admin']));

-- guardianships: admins all; guardians see their own links; staff see links for
-- their rostered players. Writes: admins only in v1 (invite acceptance runs
-- through an edge function with service role).
create policy guardianships_select on public.guardianships for select
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or guardian_person_id = app.my_person_id()
    or exists (
      select 1 from public.roster_memberships rm
      where rm.person_id = guardianships.player_person_id
        and app.is_team_staff(rm.team_season_id)
    )
  );
create policy guardianships_write on public.guardianships for all
  using (app.has_org_role(organization_id, array['owner','division_admin']))
  with check (app.has_org_role(organization_id, array['owner','division_admin']));

-- user_profiles: self read/insert own link; admins read org's links.
create policy user_profiles_select on public.user_profiles for select
  using (user_id = auth.uid() or app.has_org_role(organization_id, array['owner','division_admin']));
create policy user_profiles_insert on public.user_profiles for insert
  with check (user_id = auth.uid());

-- org_roles: users see own roles; admins see all; owner manages (v1: owner only —
-- division_admin role grants come with finer scoping in Phase 1 review).
create policy org_roles_select on public.org_roles for select
  using (user_id = auth.uid() or app.has_org_role(organization_id, array['owner','division_admin']));
create policy org_roles_write on public.org_roles for all
  using (app.has_org_role(organization_id, array['owner']))
  with check (app.has_org_role(organization_id, array['owner']));

-- invites: staff-and-up create for their scope; creators + admins see them.
create policy invites_select on public.invites for select
  using (
    created_by = auth.uid()
    or app.has_org_role(organization_id, array['owner','division_admin'])
  );
create policy invites_insert on public.invites for insert
  with check (
    created_by = auth.uid()
    and (
      app.has_org_role(organization_id, array['owner','division_admin'])
      or (app.has_org_role(organization_id, array['coach']) and role in ('parent','follower','scorekeeper'))
    )
  );
create policy invites_update on public.invites for update
  using (app.has_org_role(organization_id, array['owner','division_admin']));

-- roster_memberships: team participants + org members with reason to know read
-- (v1: org members read; refine with follower privacy in Phase 1); staff write.
create policy roster_select on public.roster_memberships for select
  using (app.is_org_member(organization_id));
create policy roster_write on public.roster_memberships for all
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or app.is_team_staff(team_season_id)
  )
  with check (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or app.is_team_staff(team_season_id)
  );

-- events: org-wide events visible to members; team events to that team's circle
-- + followers (v1: org members; follower-vs-private split lands with team privacy
-- settings). Staff of the team (or admins) write.
create policy events_select on public.events for select
  using (app.is_org_member(organization_id));
create policy events_write on public.events for all
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or (team_season_id is not null and app.is_team_staff(team_season_id))
  )
  with check (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or (team_season_id is not null and app.is_team_staff(team_season_id))
  );

-- rsvps: visible to the team circle via the event; a guardian/self/staff answers.
create policy rsvps_select on public.rsvps for select
  using (
    exists (
      select 1 from public.events e
      where e.id = rsvps.event_id
        and (
          e.team_season_id is null and app.is_org_member(e.organization_id)
          or e.team_season_id is not null and app.in_team_season(e.team_season_id)
        )
    )
  );
create policy rsvps_write on public.rsvps for all
  using (
    person_id = app.my_person_id()
    or app.is_guardian_of(person_id)
    or app.has_org_role(organization_id, array['owner','division_admin'])
    or exists (
      select 1 from public.events e
      where e.id = rsvps.event_id
        and e.team_season_id is not null
        and app.is_team_staff(e.team_season_id)
    )
  )
  with check (
    person_id = app.my_person_id()
    or app.is_guardian_of(person_id)
    or app.has_org_role(organization_id, array['owner','division_admin'])
    or exists (
      select 1 from public.events e
      where e.id = rsvps.event_id
        and e.team_season_id is not null
        and app.is_team_staff(e.team_season_id)
    )
  );

-- games: readable like events (live following is a feature); staff manage.
create policy games_select on public.games for select
  using (app.is_org_member(organization_id));
create policy games_write on public.games for all
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or app.is_team_staff(team_season_id)
  )
  with check (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or app.is_team_staff(team_season_id)
  );

-- game_events: org members read (live play-by-play). INSERT by team staff /
-- designated scorekeeper. UPDATE restricted to voiding/attribution by staff;
-- no DELETE policy — the log is append-only.
create policy game_events_select on public.game_events for select
  using (app.is_org_member(organization_id));
create policy game_events_insert on public.game_events for insert
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_events.game_id
        and (
          g.scorekeeper_user_id = auth.uid()
          or app.is_team_staff(g.team_season_id)
        )
    )
  );
create policy game_events_update on public.game_events for update
  using (
    exists (
      select 1 from public.games g
      where g.id = game_events.game_id
        and (
          g.scorekeeper_user_id = auth.uid()
          or app.is_team_staff(g.team_season_id)
        )
    )
  );

-- channels: members of the channel read; team staff + admins create/manage.
create policy channels_select on public.channels for select
  using (
    exists (
      select 1 from public.channel_members cm
      where cm.channel_id = channels.id and cm.user_id = auth.uid()
    )
    or app.has_org_role(organization_id, array['owner','division_admin'])
  );
create policy channels_write on public.channels for all
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or (team_season_id is not null and app.is_team_staff(team_season_id))
  )
  with check (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or (team_season_id is not null and app.is_team_staff(team_season_id))
  );

create policy channel_members_select on public.channel_members for select
  using (
    user_id = auth.uid()
    or app.has_org_role(organization_id, array['owner','division_admin'])
    or exists (
      select 1 from public.channels c
      where c.id = channel_members.channel_id
        and c.team_season_id is not null
        and app.is_team_staff(c.team_season_id)
    )
  );
create policy channel_members_write on public.channel_members for all
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or exists (
      select 1 from public.channels c
      where c.id = channel_members.channel_id
        and c.team_season_id is not null
        and app.is_team_staff(c.team_season_id)
    )
  )
  with check (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or exists (
      select 1 from public.channels c
      where c.id = channel_members.channel_id
        and c.team_season_id is not null
        and app.is_team_staff(c.team_season_id)
    )
  );
-- members manage their own mute/read state
create policy channel_members_self_update on public.channel_members for update
  using (user_id = auth.uid());

-- messages: channel members read; members post to non-read-only channels
-- (read-only channels: staff only). UPDATE = soft delete / edits by sender or
-- staff. No DELETE policy + trigger forbids hard deletes.
create policy messages_select on public.messages for select
  using (
    exists (
      select 1 from public.channel_members cm
      where cm.channel_id = messages.channel_id and cm.user_id = auth.uid()
    )
    or app.has_org_role(organization_id, array['owner','division_admin'])
  );
create policy messages_insert on public.messages for insert
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from public.channel_members cm
      join public.channels c on c.id = cm.channel_id
      where cm.channel_id = messages.channel_id
        and cm.user_id = auth.uid()
        and (
          not c.is_read_only
          or app.has_org_role(messages.organization_id, array['owner','division_admin'])
          or (c.team_season_id is not null and app.is_team_staff(c.team_season_id))
        )
    )
  );
create policy messages_update on public.messages for update
  using (
    sender_user_id = auth.uid()
    or app.has_org_role(organization_id, array['owner','division_admin'])
    or exists (
      select 1 from public.channels c
      where c.id = messages.channel_id
        and c.team_season_id is not null
        and app.is_team_staff(c.team_season_id)
    )
  );

-- media_consents: guardians grant/revoke for their players; admins + the
-- player's team staff read; guardians see their own grants.
create policy media_consents_select on public.media_consents for select
  using (
    app.has_org_role(organization_id, array['owner','division_admin'])
    or granted_by_user_id = auth.uid()
    or app.is_guardian_of(player_person_id)
    or exists (
      select 1 from public.roster_memberships rm
      where rm.person_id = media_consents.player_person_id
        and app.is_team_staff(rm.team_season_id)
    )
  );
create policy media_consents_insert on public.media_consents for insert
  with check (
    granted_by_user_id = auth.uid()
    and (app.is_guardian_of(player_person_id)
         or app.has_org_role(organization_id, array['owner','division_admin']))
  );

-- ============================================================================
-- REALTIME
-- ============================================================================
alter publication supabase_realtime add table public.game_events;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.games;
