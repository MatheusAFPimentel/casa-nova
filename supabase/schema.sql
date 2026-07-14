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

-- households: any authenticated user can look up a household by invite_code
-- (needed to join), and can create a new household for themselves.
create policy "households_select_authenticated"
  on households for select
  to authenticated
  using (true);

create policy "households_insert_authenticated"
  on households for insert
  to authenticated
  with check (true);

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

create policy "household_members_insert_self"
  on household_members for insert
  to authenticated
  with check (user_id = auth.uid());

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
