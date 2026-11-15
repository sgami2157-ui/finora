-- Stub minimal skema Supabase agar migrasi dapat diuji di Postgres biasa (BUKAN untuk Supabase sungguhan).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text, raw_user_meta_data jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/') $$;
grant usage on schema public, auth, storage to anon, authenticated;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on functions to authenticated;
