-- ============================================================================
-- HackQ — AI features: teammate messages + voice-note plans
-- Run in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

-- ---------- 1. Mark AI-teammate replies ----------
-- Normal chat rows keep kind = 'message'. AI replies are authored by the
-- requesting member (RLS requires author_id = auth.uid()) but flagged 'ai' so
-- the UI renders them as the HackQ teammate instead of the member.
alter table public.messages
  add column if not exists kind text not null default 'message'
  check (kind in ('message', 'ai'));

-- ---------- 2. Structured plan extracted from a voice note ----------
-- Kept on its own table: messages have no UPDATE policy, and plans are
-- append-only per note. One plan per voice note, replaced on re-analysis.
create table if not exists public.voice_plans (
  message_id uuid primary key references public.messages (id) on delete cascade,
  team_id    uuid not null references public.teams (id) on delete cascade,
  transcript text not null,
  plan       jsonb not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists voice_plans_team_idx on public.voice_plans (team_id);

alter table public.voice_plans enable row level security;

drop policy if exists "voice_plans_select_member" on public.voice_plans;
create policy "voice_plans_select_member" on public.voice_plans
  for select using (is_team_member(team_id));

-- created_by is pinned to the caller — any member may plan a room's voice note.
drop policy if exists "voice_plans_insert_member" on public.voice_plans;
create policy "voice_plans_insert_member" on public.voice_plans
  for insert with check (is_team_member(team_id) and created_by = auth.uid());

-- Re-analysis overwrites the plan (upsert needs update-on-conflict).
drop policy if exists "voice_plans_update_member" on public.voice_plans;
create policy "voice_plans_update_member" on public.voice_plans
  for update using (is_team_member(team_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'voice_plans'
  ) then
    alter publication supabase_realtime add table public.voice_plans;
  end if;
end $$;

grant select, insert, update on public.voice_plans to authenticated;
