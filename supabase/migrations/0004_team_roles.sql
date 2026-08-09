-- ============================================================================
-- HackQ — custom team roles.
--
-- A team can define its own roles (e.g. "Designer", "QA", "Ops") with a custom
-- capability set. Members hold a role by `team_members.role` — either a
-- built-in key ("lead" | "co-lead" | "member") or the uuid of a row here.
--
-- Permissions are a jsonb map of the 7 capabilities the app knows:
--   manage-room, approve-joins, manage-roles, edit-tasks, post-ideas, chat, mood
--
-- Run in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

create table if not exists public.team_roles (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  name        text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (team_id, name)
);

create index if not exists team_roles_team_idx on public.team_roles (team_id);

alter table public.team_roles enable row level security;

-- Any member can read the team's role definitions (the matrix, badges).
create policy "roles_select_member" on public.team_roles
  for select using (is_team_member(team_id));

-- Only the owner manages roles — mirrors members_update_owner (assignment also
-- writes team_members.role, which is owner-gated, so keep both in sync).
create policy "roles_insert_owner" on public.team_roles
  for insert with check (is_team_owner(team_id));

create policy "roles_update_owner" on public.team_roles
  for update using (is_team_owner(team_id)) with check (is_team_owner(team_id));

create policy "roles_delete_owner" on public.team_roles
  for delete using (is_team_owner(team_id));

grant select, insert, update, delete on public.team_roles to authenticated;
