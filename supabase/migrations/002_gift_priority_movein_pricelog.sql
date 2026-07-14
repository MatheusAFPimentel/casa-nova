-- Run this once in the Supabase SQL Editor for a project that already ran
-- schema.sql before these features existed.

-- 1) Presente vs. compra
alter table items drop constraint if exists items_status_check;
alter table items add constraint items_status_check check (status in ('falta', 'comprado', 'presente'));
alter table items add column if not exists gifted_by text;

-- 2) Prioridade + data da mudança
alter table items add column if not exists priority text not null default 'pode_esperar' check (priority in ('essencial', 'pode_esperar'));
alter table households add column if not exists move_in_date date;

-- 3) Log de preço
create table if not exists price_log (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id) on delete cascade,
  price numeric not null,
  store text,
  observed_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists price_log_item_id_idx on price_log (item_id);

alter table price_log enable row level security;

drop policy if exists "price_log_select_household_members" on price_log;
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

drop policy if exists "price_log_insert_household_members" on price_log;
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

drop policy if exists "price_log_delete_household_members" on price_log;
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
