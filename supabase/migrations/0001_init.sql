-- ============================================================================
-- HackQ — schema, row-level security, and realtime
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

-- ---------- profiles (one row per auth user) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default 'Teammate',
  color      text not null default '#ffffff',
  status     text,
  pfp        text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile when someone signs up (name from the signup form).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- teams ----------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  group_name  text not null,
  event_name  text not null default 'HackQ Sprint',
  deadline    timestamptz not null,
  started_at  timestamptz not null default now(),
  invite_code text not null unique,
  join_locked boolean not null default false,
  modules     jsonb not null default '{"chat":true,"board":true,"tasks":true,"mood":true}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Invite codes are displayed as "HQ-XXXX" but stored lookups strip the dash,
-- so keep a normalized key for matching: "HQ-4F2AK9XM" -> "HQ4F2AK9XM".
alter table public.teams
  add column if not exists code_key text
  generated always as (upper(replace(invite_code, '-', ''))) stored;
create index if not exists teams_code_key_idx on public.teams (code_key);

-- ---------- team members (roles) ----------
create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role    text not null default 'member' check (role in ('lead', 'co-lead', 'member')),
  primary key (team_id, user_id)
);

-- ---------- join requests ----------
create table if not exists public.join_requests (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- ---------- chat messages ----------
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams (id) on delete cascade,
  author_id      uuid not null references public.profiles (id) on delete cascade,
  text           text not null default '',
  voice          text,
  voice_duration integer,
  created_at     timestamptz not null default now()
);
create index if not exists messages_team_idx on public.messages (team_id, created_at);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  title       text not null,
  status      text not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee_id uuid references public.profiles (id) on delete set null,
  -- Assignee display snapshot (kept so history shows who it was, like chat).
  assignee_name  text,
  assignee_color text,
  assignee_pfp   text,
  due         timestamptz,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists tasks_team_idx on public.tasks (team_id);

-- ---------- idea board ----------
create table if not exists public.ideas (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  text       text not null,
  color      text not null,
  x          double precision not null,
  y          double precision not null,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  -- Author display snapshot (name/color/pfp) for the note footer chip.
  author_name  text,
  author_color text,
  author_pfp   text,
  created_at timestamptz not null default now()
);
create index if not exists ideas_team_idx on public.ideas (team_id);

-- ---------- mood check-ins (latest per member) ----------
create table if not exists public.moods (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  mood       text not null check (mood in ('fired', 'locked', 'okay', 'drained', 'lost')),
  note       text,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- ============================================================================
-- Row-level security
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.teams         enable row level security;
alter table public.team_members  enable row level security;
alter table public.join_requests enable row level security;
alter table public.messages      enable row level security;
alter table public.tasks         enable row level security;
alter table public.ideas         enable row level security;
alter table public.moods         enable row level security;

-- Membership helpers ---------------------------------------------------------
create or replace function public.is_team_member(team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = $1 and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_owner(team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t where t.id = $1 and t.owner_id = auth.uid()
  );
$$;

create or replace function public.can_manage_team(team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = $1 and tm.user_id = auth.uid() and tm.role in ('lead', 'co-lead')
  );
$$;

-- profiles ------------------------------------------------------------------
-- Members can read their own profile + the profiles of anyone they share a
-- team with. Pending joiners aren't members yet, so a team's lead also needs
-- to see *their* profiles to know who's asking to join.
create policy "profiles_select_self_or_teammates" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.team_members tm
      where tm.user_id = auth.uid()
        and tm.team_id in (select team_id from public.team_members where user_id = profiles.id)
    )
    or exists (
      select 1 from public.join_requests jr
      where jr.user_id = profiles.id
        and jr.status = 'pending'
        and jr.team_id in (select tm.team_id from public.team_members tm where tm.user_id = auth.uid())
    )
  );

create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- teams: anyone signed in may look up by code; only the owner writes ---------
create policy "teams_select_auth" on public.teams
  for select using (auth.role() = 'authenticated');

create policy "teams_insert_owner" on public.teams
  for insert with check (owner_id = auth.uid());

create policy "teams_update_owner" on public.teams
  for update using (is_team_owner(id)) with check (is_team_owner(id));

create policy "teams_delete_owner" on public.teams
  for delete using (is_team_owner(id));

-- team_members --------------------------------------------------------------
create policy "members_select_member" on public.team_members
  for select using (
    user_id = auth.uid()
    or is_team_member(team_id)
  );

-- Creating a team inserts your own lead row; the owner approves others.
create policy "members_insert_self_or_owner" on public.team_members
  for insert with check (
    user_id = auth.uid()
    or is_team_owner(team_id)
  );

create policy "members_update_owner" on public.team_members
  for update using (is_team_owner(team_id));

create policy "members_delete_self_or_owner" on public.team_members
  for delete using (user_id = auth.uid() or is_team_owner(team_id));

-- join_requests -------------------------------------------------------------
create policy "requests_select_member" on public.join_requests
  for select using (user_id = auth.uid() or is_team_member(team_id));

create policy "requests_insert_self" on public.join_requests
  for insert with check (user_id = auth.uid());

create policy "requests_update_lead" on public.join_requests
  for update using (can_manage_team(team_id));

create policy "requests_delete_self" on public.join_requests
  for delete using (user_id = auth.uid());

-- messages ------------------------------------------------------------------
create policy "messages_select_member" on public.messages
  for select using (is_team_member(team_id));

create policy "messages_insert_member" on public.messages
  for insert with check (is_team_member(team_id) and author_id = auth.uid());

-- tasks ---------------------------------------------------------------------
create policy "tasks_select_member" on public.tasks
  for select using (is_team_member(team_id));

create policy "tasks_insert_member" on public.tasks
  for insert with check (is_team_member(team_id));

create policy "tasks_update_member" on public.tasks
  for update using (is_team_member(team_id));

create policy "tasks_delete_member" on public.tasks
  for delete using (is_team_member(team_id));

-- ideas ---------------------------------------------------------------------
create policy "ideas_select_member" on public.ideas
  for select using (is_team_member(team_id));

create policy "ideas_insert_member" on public.ideas
  for insert with check (is_team_member(team_id));

create policy "ideas_update_member" on public.ideas
  for update using (is_team_member(team_id));

create policy "ideas_delete_member" on public.ideas
  for delete using (is_team_member(team_id));

-- moods ---------------------------------------------------------------------
create policy "moods_select_member" on public.moods
  for select using (is_team_member(team_id));

create policy "moods_insert_member" on public.moods
  for insert with check (is_team_member(team_id) and user_id = auth.uid());

create policy "moods_update_member" on public.moods
  for update using (is_team_member(team_id) and user_id = auth.uid());

create policy "moods_delete_member" on public.moods
  for delete using (is_team_member(team_id) and user_id = auth.uid());

-- ============================================================================
-- Realtime — live chat, board, tasks, mood without polling
-- ============================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.ideas;
alter publication supabase_realtime add table public.moods;

-- ============================================================================
-- Table privileges for the API roles
-- ============================================================================
-- RLS policies are checked AFTER table grants; without these, every query
-- fails with `permission denied for table ...` (42501) whenever the project
-- has "Automatically expose new tables" disabled.
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.teams         to authenticated;
grant select, insert, update, delete on public.team_members  to authenticated;
grant select, insert, update, delete on public.join_requests to authenticated;
grant select, insert, update, delete on public.messages      to authenticated;
grant select, insert, update, delete on public.tasks         to authenticated;
grant select, insert, update, delete on public.ideas         to authenticated;
grant select, insert, update, delete on public.moods         to authenticated;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
