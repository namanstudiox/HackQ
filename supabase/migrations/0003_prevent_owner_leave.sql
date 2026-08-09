-- ============================================================================
-- HackQ — prevent the team owner from deleting their own membership row.
--
-- The old `members_delete_self_or_owner` policy let the owner delete their own
-- row (the `user_id = auth.uid()` branch). That would orphan the team:
-- owner_id points at a non-member and nobody could manage it (approve joins,
-- change settings, kick people). The UI hides "Leave" from leads, but the
-- database should enforce it too.
--
-- New semantics:
--   * you may delete your OWN row only if you are NOT the team owner
--   * the owner may delete rows of OTHER members (kicking)
--
-- Run in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

drop policy if exists "members_delete_self_or_owner" on public.team_members;

create policy "members_delete_self_or_owner" on public.team_members
  for delete using (
    (user_id = auth.uid() and not is_team_owner(team_id))
    or (is_team_owner(team_id) and user_id <> auth.uid())
  );
