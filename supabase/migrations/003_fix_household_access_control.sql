-- SECURITY FIX — run this in the Supabase SQL Editor.
--
-- Two RLS policies were too permissive:
--
-- 1) `households_select_authenticated` used `using (true)`, so ANY
--    authenticated user could list every household in the system —
--    including invite codes, budget, and move-in dates that were never
--    shared with them.
-- 2) `household_members_insert_self` only checked `user_id = auth.uid()`,
--    not that the caller actually knew a household's invite code — so
--    anyone who learned (or guessed) a household's UUID could insert
--    themselves as a member directly via the API and read/write its data,
--    completely bypassing the invite-code flow.
--
-- Fix: household creation and joining now go through two SECURITY DEFINER
-- functions that encapsulate the invite-code check, and the underlying
-- table policies are tightened so direct inserts are no longer possible.

-- ---------------------------------------------------------------------------
-- Tighten households: only members can read a household's row.
-- ---------------------------------------------------------------------------
drop policy if exists "households_select_authenticated" on households;
create policy "households_select_members"
  on households for select
  to authenticated
  using (
    id in (select household_id from household_members where user_id = auth.uid())
  );

-- Household creation now only happens via create_household() below.
drop policy if exists "households_insert_authenticated" on households;

-- ---------------------------------------------------------------------------
-- Tighten household_members: no more direct self-enrollment into an
-- arbitrary household_id. Joining now only happens via join_household().
-- ---------------------------------------------------------------------------
drop policy if exists "household_members_insert_self" on household_members;

-- ---------------------------------------------------------------------------
-- create_household: creates a new household + the caller's membership in
-- one atomic, privileged operation, so the caller never needs standing
-- INSERT access to either table.
-- ---------------------------------------------------------------------------
create or replace function create_household(p_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  for attempt in 1..5 loop
    v_code := '';
    for pos in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into households (name, invite_code) values (p_name, v_code) returning * into v_household;
      exit;
    exception when unique_violation then
      if attempt = 5 then
        raise exception 'Não foi possível gerar um código de convite único.';
      end if;
    end;
  end loop;

  insert into household_members (household_id, user_id) values (v_household.id, auth.uid());

  return v_household;
end;
$$;

grant execute on function create_household(text) to authenticated;

-- ---------------------------------------------------------------------------
-- join_household: validates the invite code and enrolls the caller, all
-- inside one privileged transaction. Raises if the code doesn't match
-- anything, which the app surfaces as "Código de convite inválido."
-- ---------------------------------------------------------------------------
create or replace function join_household(p_invite_code text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
begin
  select * into v_household from households where invite_code = upper(p_invite_code);
  if not found then
    raise exception 'Código de convite inválido.';
  end if;

  insert into household_members (household_id, user_id)
  values (v_household.id, auth.uid())
  on conflict do nothing;

  return v_household;
end;
$$;

grant execute on function join_household(text) to authenticated;
