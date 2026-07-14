-- Run this once in the Supabase SQL Editor if you already applied the
-- original schema.sql before the `items.position` column existed.
alter table items add column if not exists position bigserial;
