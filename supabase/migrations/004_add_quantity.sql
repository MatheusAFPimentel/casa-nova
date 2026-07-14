-- Run this once in the Supabase SQL Editor if you already applied
-- schema.sql before this column existed.
alter table items add column if not exists quantity integer not null default 1 check (quantity > 0);
