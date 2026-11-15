-- Pengetatan keamanan berdasarkan Supabase advisor.

-- 1) Kunci search_path semua fungsi.
alter function set_updated_at() set search_path = public;
alter function journal_totals(uuid) set search_path = public;
alter function guard_journal_entry() set search_path = public;
alter function guard_journal_insert() set search_path = public;
alter function guard_journal_lines() set search_path = public;
alter function post_journal_entry(uuid) set search_path = public;
alter function reverse_journal_entry(uuid, date) set search_path = public;
alter function create_journal_entry(uuid, text, date, text, text, jsonb, boolean) set search_path = public;
alter function record_payment(uuid, uuid, numeric, date) set search_path = public;
alter function record_transfer(uuid, uuid, uuid, numeric, date) set search_path = public;
alter function account_balances(uuid, date, date) set search_path = public;

-- 2) Cabut EXECUTE bawaan (PUBLIC/anon) dari semua fungsi; beri hanya ke authenticated yang memang perlu.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  is_member(uuid, member_role[]),
  create_business(text),
  post_journal_entry(uuid),
  reverse_journal_entry(uuid, date),
  create_journal_entry(uuid, text, date, text, text, jsonb, boolean),
  record_payment(uuid, uuid, numeric, date),
  record_transfer(uuid, uuid, uuid, numeric, date),
  account_balances(uuid, date, date),
  journal_totals(uuid)
to authenticated;
-- Fungsi trigger (handle_new_user, write_audit, guard_*, set_updated_at) tidak perlu EXECUTE oleh klien.

-- 3) integrations_public: ganti view SECURITY DEFINER dengan view invoker + hak kolom aman saja.
drop view if exists integrations_public;
grant select (id, business_id, provider, status, external_account, root_folder_id, last_verified_at)
  on integrations to authenticated;
create policy integrations_sel on integrations for select using (is_member(business_id));
create view integrations_public with (security_invoker = true) as
  select id, business_id, provider, status, external_account, root_folder_id, last_verified_at from integrations;
grant select on integrations_public to authenticated;
-- encrypted_refresh_token tetap tidak dapat dibaca klien (tanpa hak kolom).
