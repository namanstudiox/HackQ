-- ============================================================================
-- HackQ — migration 0008: function-execution lockdown
--
-- Security Advisor findings (SECURITY DEFINER functions callable by the API
-- roles) — three families, three different treatments:
--
--   1. handle_new_user()  — signup trigger on auth.users. Only the auth
--      service should ever invoke it. Revoke from the API roles, then grant
--      explicitly to supabase_auth_admin (the role that inserts into
--      auth.users and owns it), so the trigger keeps firing during signup.
--
--   2. rls_auto_enable()  — leftover from the dashboard's "Enable automatic
--      RLS" toggle (you create tables via migrations with explicit RLS, so
--      the feature is redundant). Remove the function and whatever event
--      trigger references it.
--
--   3. The RLS helpers + app RPCs (is_team_owner, is_team_member,
--      can_manage_team, team_can, lookup_team_by_code, lookup_team_by_slug,
--      create_team, transfer_ownership) — revoke EXECUTE from `anon` only.
--      This is safe because `anon` holds NO table grants (migration 0002
--      grants only to `authenticated`), and Postgres checks table privileges
--      BEFORE evaluating RLS — so anon never legitimately reaches these
--      functions. `authenticated` KEEPS execute: the helpers are called by
--      RLS policy expressions, and the RPCs are the app's API surface.
--
-- Run in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

-- ---------- 1. handle_new_user — signup-trigger only ----------
do $$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    revoke execute on function public.handle_new_user() from anon, authenticated, public;
    -- The trigger on auth.users fires as supabase_auth_admin — keep it able to
    -- run the function so signups still create profiles.
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end $$;

-- ---------- 2. rls_auto_enable — remove the auto-RLS leftover ----------
do $$
declare
  trg record;
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
    -- Drop any event trigger wired to it, whatever its name.
    for trg in
      select evtname from pg_event_trigger
      where evtfun = to_regprocedure('public.rls_auto_enable()')
    loop
      execute format('drop event trigger %I', trg.evtname);
    end loop;
    drop function public.rls_auto_enable();
  end if;
end $$;

-- ---------- 3. anon never needs the RLS helpers / app RPCs ----------
-- (authenticated intentionally keeps EXECUTE on all of these.)
revoke execute on function public.is_team_owner(uuid)         from anon;
revoke execute on function public.is_team_member(uuid)        from anon;
revoke execute on function public.can_manage_team(uuid)       from anon;
revoke execute on function public.team_can(uuid, text)        from anon;
revoke execute on function public.lookup_team_by_code(text)   from anon;
revoke execute on function public.lookup_team_by_slug(text)   from anon;
revoke execute on function public.create_team(text, text, timestamptz, text) from anon;
revoke execute on function public.transfer_ownership(uuid, uuid) from anon;
