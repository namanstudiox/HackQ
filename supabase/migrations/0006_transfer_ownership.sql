-- ============================================================================
-- HackQ — transfer team ownership.
--
-- A plain `UPDATE teams SET owner_id = …` is rejected by RLS: the update
-- policy's WITH CHECK re-evaluates is_team_owner() on the NEW row, where the
-- caller is no longer the owner. So the handover runs in a security-definer
-- function that verifies the rules itself:
--   * only the current owner may transfer
--   * the target must be a current member
--   * the old owner steps down to member, the target becomes lead,
--     and teams.owner_id moves over
--
-- Run in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

create or replace function public.transfer_ownership(p_team uuid, p_new_owner uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.teams where id = p_team;
  -- Only the current owner may hand the room over.
  if v_owner is null or v_owner <> auth.uid() then
    return false;
  end if;
  -- The target must be an approved member of this team.
  if not exists (
    select 1 from public.team_members where team_id = p_team and user_id = p_new_owner
  ) then
    return false;
  end if;

  -- Old owner steps down to member; target takes the lead role.
  update public.team_members set role = 'member' where team_id = p_team and user_id = v_owner;
  update public.team_members set role = 'lead'   where team_id = p_team and user_id = p_new_owner;
  update public.teams set owner_id = p_new_owner where id = p_team;

  return true;
end;
$$;

grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;
