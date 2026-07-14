-- Casa Nova: schema + RLS policies
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  budget_limit numeric,
  move_in_date date,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  category text not null,
  name text not null,
  estimated_price numeric,
  actual_price numeric,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'falta' check (status in ('falta', 'comprado', 'presente')),
  gifted_by text,
  priority text not null default 'pode_esperar' check (priority in ('essencial', 'pode_esperar')),
  store text,
  link text,
  notes text,
  -- position (not created_at) drives display order: bulk inserts share one
  -- `now()` value per statement, so created_at alone is not a stable sort key.
  position bigserial,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_log (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id) on delete cascade,
  price numeric not null,
  store text,
  observed_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists items_household_id_idx on items (household_id);
create index if not exists household_members_user_id_idx on household_members (user_id);
create index if not exists price_log_item_id_idx on price_log (item_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger for items
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table households enable row level security;
alter table household_members enable row level security;
alter table items enable row level security;

-- households: readable only by members — NOT `using (true)`. A user who
-- isn't a member yet never gets to see a household's invite_code, name,
-- or budget; they only reach one via the SECURITY DEFINER functions below.
create policy "households_select_members"
  on households for select
  to authenticated
  using (
    id in (select household_id from household_members where user_id = auth.uid())
  );

-- No direct insert policy: households are only created via
-- create_household() (SECURITY DEFINER, below), never a raw table insert.

create policy "households_update_members"
  on households for update
  to authenticated
  using (
    id in (select household_id from household_members where user_id = auth.uid())
  );

-- household_members: users can only see their own membership row (a
-- self-referencing policy here would cause infinite RLS recursion).
create policy "household_members_select_own"
  on household_members for select
  to authenticated
  using (user_id = auth.uid());

-- No direct insert policy: membership rows are only created via
-- create_household() / join_household() (SECURITY DEFINER, below). A plain
-- `with check (user_id = auth.uid())` policy here would let anyone enroll
-- themselves into ANY household_id they can see or guess, bypassing the
-- invite code entirely.

-- create_household: creates a new household + the caller's membership in
-- one atomic, privileged operation, so clients never need standing INSERT
-- access to either table.
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

-- join_household: validates the invite code and enrolls the caller inside
-- one privileged transaction. Raises if the code doesn't match anything,
-- which the app surfaces as "Código de convite inválido."
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

-- items: full CRUD restricted to members of the item's household.
create policy "items_select_household_members"
  on items for select
  to authenticated
  using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "items_insert_household_members"
  on items for insert
  to authenticated
  with check (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "items_update_household_members"
  on items for update
  to authenticated
  using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

create policy "items_delete_household_members"
  on items for delete
  to authenticated
  using (
    household_id in (select household_id from household_members where user_id = auth.uid())
  );

-- price_log: entries are immutable (no update policy) — only create/delete,
-- restricted to members of the household that owns the parent item.
alter table price_log enable row level security;

create policy "price_log_select_household_members"
  on price_log for select
  to authenticated
  using (
    item_id in (
      select id from items where household_id in (
        select household_id from household_members where user_id = auth.uid()
      )
    )
  );

create policy "price_log_insert_household_members"
  on price_log for insert
  to authenticated
  with check (
    item_id in (
      select id from items where household_id in (
        select household_id from household_members where user_id = auth.uid()
      )
    )
  );

create policy "price_log_delete_household_members"
  on price_log for delete
  to authenticated
  using (
    item_id in (
      select id from items where household_id in (
        select household_id from household_members where user_id = auth.uid()
      )
    )
  );
