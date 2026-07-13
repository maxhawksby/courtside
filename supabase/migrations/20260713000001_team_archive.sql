-- Team archive (BE-1): teams are archived, never deleted — a deleted team
-- would cascade away its channels and message history, destroying the
-- SafeSport audit trail. Adds teams.archived_at and splits the single
-- `for all` write policy into insert/update for the same principals.
-- Deliberately NO delete policy: RLS default-deny makes hard delete
-- impossible for everyone, including owners. Select policies untouched —
-- archived-row visibility is a UI concern, not a security boundary.

alter table public.teams add column archived_at timestamptz;

drop policy teams_write on public.teams;

create policy teams_insert on public.teams for insert
  with check (app.has_org_role(organization_id, array['owner','division_admin']));

create policy teams_update on public.teams for update
  using (app.has_org_role(organization_id, array['owner','division_admin']))
  with check (app.has_org_role(organization_id, array['owner','division_admin']));
