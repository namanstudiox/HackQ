-- ============================================================================
-- HackQ — security hardening
--
-- Audit findings fixed here:
--   1. CRITICAL: any signed-in user could SELECT every team row (invite_code,
--      owner_id, deadline, modules, slug) via `teams_select_auth`. Non-member
--      lookups (join by code, room by slug, team creation) now go through
--      security-definer RPCs that return only the minimum fields.
--   2. HIGH: custom-role permissions were client-side only — tasks/ideas/
--      messages/moods RLS allowed ANY member to write. New `team_can()`
--      helper enforces capabilities server-side (mirrors ROLE_PERMISSIONS).
--   3. HIGH: `members_insert_self_or_owner` blocked co-leads from approving
--      join requests even though they hold `approve-joins`.
--   4. MEDIUM: pending join requests were visible to every member.
--
-- Run in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

-- ---------- 1. Stop team-data enumeration ----------
drop policy if exists "teams_select_auth" on public.teams;
create policy "teams_select_member_or_owner" on public.teams
  for select using (is_team_member(id) or is_team_owner(id));

-- Join lookup by invite code: returns only id / group name / join lock —
-- never the code itself, owner, deadline or module config.
create or replace function public.lookup_team_by_code(p_code_key text)
returns table (id uuid, group_name text, join_locked boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.group_name, t.join_locked
  from public.teams t
  where t.code_key = upper(replace(p_code_key, '-', ''))
  limit 1;
$$;
grant execute on function public.lookup_team_by_code(text) to authenticated;

-- Room-by-slug lookup for the /room/<slug> gateway (private-room wall etc.).
create or replace function public.lookup_team_by_slug(p_slug text)
returns table (id uuid, group_name text)
language sql stable security definer set search_path = public as $$
  select t.id, t.group_name from public.teams t where t.slug = p_slug limit 1;
$$;
grant execute on function public.lookup_team_by_slug(text) to authenticated;

-- Team creation moved server-side: slug dedupe + the owner's lead row run in
-- one security-definer transaction (the old client-side slug probe SELECT is
-- now blocked by the member-only select policy). Retries on unique conflicts
-- (slug/invite-code race) up to 5 times with an incremented suffix.
create or replace function public.create_team(
  p_group_name text,
  p_event_name text,
  p_deadline timestamptz,
  p_invite_code text
)
returns table (
  id uuid, group_name text, event_name text, deadline timestamptz,
  started_at timestamptz, invite_code text, join_locked boolean,
  modules jsonb, owner_id uuid, slug text
)
language plpgsql security definer set search_path = public as $$
declare
  v_base      text;
  v_candidate text;
  v_n         int;
  v_team      uuid;
  v_attempt   int;
begin
  v_base := lower(regexp_replace(regexp_replace(p_group_name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));
  if v_base = '' then v_base := 'room'; end if;

  for v_attempt in 1..5 loop
    v_candidate := v_base;
    v_n := 1;
    -- Qualify `teams.slug` — the RETURNS TABLE declares a `slug` output
    -- parameter, and an unqualified reference is ambiguous (42702).
    while exists (select 1 from public.teams where teams.slug = v_candidate) loop
      v_n := v_n + 1;
      v_candidate := v_base || '-' || v_n::text;
    end loop;

    begin
      insert into public.teams (owner_id, group_name, event_name, deadline, invite_code, slug)
      values (auth.uid(), p_group_name, p_event_name, p_deadline, p_invite_code, v_candidate)
      returning id into v_team;

      insert into public.team_members (team_id, user_id, role)
      values (v_team, auth.uid(), 'lead');

      return query
        select t.id, t.group_name, t.event_name, t.deadline, t.started_at,
               t.invite_code, t.join_locked, t.modules, t.owner_id, t.slug
        from public.teams t where t.id = v_team;
      return;
    exception when unique_violation then
      continue; -- slug/code raced — retry with the next suffix
    end;
  end loop;

  raise exception 'Could not create the room — please try again.';
end;
$$;
grant execute on function public.create_team(text, text, timestamptz, text) to authenticated;

-- ---------- 2. Capability enforcement (mirrors ROLE_PERMISSIONS) ----------
-- Built-ins: lead = everything; co-lead & member = the four content caps.
-- Custom roles: read from their team_roles.permissions map. Non-members get
-- NULL (false). security definer so policy evaluation bypasses RLS itself.
create or replace function public.team_can(p_team uuid, p_cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select
    case
      when tm.role = 'lead' then true
      when tm.role in ('co-lead', 'member') then p_cap in ('edit-tasks', 'post-ideas', 'chat', 'mood')
      else exists (
        select 1 from public.team_roles r
        where r.team_id = p_team and r.id::text = tm.role
          and (r.permissions ->> p_cap) = 'true'
      )
    end
  from public.team_members tm
  where tm.team_id = p_team and tm.user_id = auth.uid();
$$;

-- tasks — write requires edit-tasks; authorship pinned to the caller so a
-- member can't forge who created what.
drop policy if exists "tasks_insert_member" on public.tasks;
drop policy if exists "tasks_update_member" on public.tasks;
drop policy if exists "tasks_delete_member" on public.tasks;
create policy "tasks_insert_capable" on public.tasks
  for insert with check (
    is_team_member(team_id) and created_by = auth.uid() and team_can(team_id, 'edit-tasks')
  );
create policy "tasks_update_capable" on public.tasks
  for update using (is_team_member(team_id) and team_can(team_id, 'edit-tasks'));
create policy "tasks_delete_capable" on public.tasks
  for delete using (is_team_member(team_id) and team_can(team_id, 'edit-tasks'));

-- ideas — write requires post-ideas; authorship pinned to the caller.
drop policy if exists "ideas_insert_member" on public.ideas;
drop policy if exists "ideas_update_member" on public.ideas;
drop policy if exists "ideas_delete_member" on public.ideas;
create policy "ideas_insert_capable" on public.ideas
  for insert with check (
    is_team_member(team_id) and author_id = auth.uid() and team_can(team_id, 'post-ideas')
  );
create policy "ideas_update_capable" on public.ideas
  for update using (is_team_member(team_id) and team_can(team_id, 'post-ideas'));
create policy "ideas_delete_capable" on public.ideas
  for delete using (is_team_member(team_id) and team_can(team_id, 'post-ideas'));

-- messages — posting requires chat (reads stay member-only)
drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_capable" on public.messages
  for insert with check (is_team_member(team_id) and author_id = auth.uid() and team_can(team_id, 'chat'));

-- moods — check-ins require mood
drop policy if exists "moods_insert_member" on public.moods;
drop policy if exists "moods_update_member" on public.moods;
create policy "moods_insert_capable" on public.moods
  for insert with check (user_id = auth.uid() and team_can(team_id, 'mood'));
create policy "moods_update_capable" on public.moods
  for update using (user_id = auth.uid() and team_can(team_id, 'mood'));

-- ---------- 3. Co-leads can approve join requests ----------
-- The owner could always approve; now any can_manage_team holder (lead or
-- co-lead) may insert the approved member row too.
--
-- NOTE: there is deliberately NO `user_id = auth.uid()` self-insert branch
-- anymore. It was an approval bypass: anyone could INSERT themselves into a
-- team they knew the id of (ids are discoverable via the lookup RPCs) and
-- become a member without the lead ever approving. Team creation now inserts
-- the owner's lead row inside the create_team RPC (security definer), and
-- joining always goes through a join request + lead approval — so no
-- legitimate self-insert exists.
drop policy if exists "members_insert_self_or_owner" on public.team_members;
create policy "members_insert_self_or_manage" on public.team_members
  for insert with check (
    is_team_owner(team_id)
    or can_manage_team(team_id)
  );

-- Pending-request visibility: a user sees only their OWN request; the room's
-- managers (lead/co-lead) see all of them. Regular members no longer learn
-- who is trying to join.
drop policy if exists "requests_select_member" on public.join_requests;
create policy "requests_select_self_or_manage" on public.join_requests
  for select using (user_id = auth.uid() or can_manage_team(team_id));
