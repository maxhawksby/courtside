-- user_profiles visibility: org members may resolve user ↔ person links.
-- Needed for member pickers (DMs, channels) and "answer RSVP as" lists; the
-- link itself is not sensitive — persons are already org-visible, and
-- persons_sensitive keeps its own strict policies. PM-authored (RLS change).
drop policy user_profiles_select on public.user_profiles;
create policy user_profiles_select on public.user_profiles for select
  using (app.is_org_member(organization_id));
