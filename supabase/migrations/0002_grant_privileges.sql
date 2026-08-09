-- ============================================================================
-- HackQ — grant table privileges to the API roles.
--
-- Why: with "Automatically expose new tables" disabled (recommended), tables
-- created via the SQL editor have NO grants for the `anon` / `authenticated`
-- roles. Postgres checks table privileges BEFORE row-level security, so every
-- query fails with `permission denied for table ...` (42501) even though the
-- RLS policies are correct.
--
-- Run this in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- authenticated — every signed-in user (all app traffic goes through this role;
-- RLS policies in 0001 decide which rows each user can touch).
grant select, insert, update, delete on public.teams         to authenticated;
grant select, insert, update, delete on public.team_members  to authenticated;
grant select, insert, update, delete on public.join_requests to authenticated;
grant select, insert, update, delete on public.messages      to authenticated;
grant select, insert, update, delete on public.tasks         to authenticated;
grant select, insert, update, delete on public.ideas         to authenticated;
grant select, insert, update, delete on public.moods         to authenticated;

-- profiles: members read the roster + update their own row (inserts happen via
-- the security-definer handle_new_user trigger, so no INSERT grant needed).
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
