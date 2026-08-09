-- ============================================================================
-- HackQ — per-room URL slugs (/room/night-owl instead of /room?code=…).
--
-- Run in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

alter table public.teams add column if not exists slug text;

-- Backfill existing rooms: slugify the group name, dedupe with a -2/-3 suffix
-- (oldest room keeps the clean slug).
do $$
declare
  t record;
  base text;
  candidate text;
  n int;
begin
  for t in select id, group_name from public.teams order by created_at loop
    base := lower(regexp_replace(regexp_replace(t.group_name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));
    if base = '' then base := 'room'; end if;
    candidate := base;
    n := 1;
    while exists (select 1 from public.teams where slug = candidate and id <> t.id) loop
      n := n + 1;
      candidate := base || '-' || n::text;
    end loop;
    update public.teams set slug = candidate where id = t.id;
  end loop;
end $$;

create unique index if not exists teams_slug_idx on public.teams (slug);
