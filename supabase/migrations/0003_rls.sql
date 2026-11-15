-- Row Level Security: data setiap bisnis terisolasi berdasarkan keanggotaan.

alter table profiles enable row level security;
create policy profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());

alter table businesses enable row level security;
create policy businesses_select on businesses for select using (is_member(id));
create policy businesses_update on businesses for update using (is_member(id, array['owner','admin']::member_role[]));
-- insert hanya lewat create_business() (security definer)

alter table business_members enable row level security;
create policy members_select on business_members for select using (user_id = auth.uid() or is_member(business_id));
create policy members_manage on business_members for all
  using (is_member(business_id, array['owner']::member_role[]))
  with check (is_member(business_id, array['owner']::member_role[]));

alter table business_settings enable row level security;
create policy settings_select on business_settings for select using (is_member(business_id));
create policy settings_update on business_settings for update using (is_member(business_id, array['owner','admin']::member_role[]));

-- Tabel data bisnis: baca = anggota; tulis = owner/admin/accountant/staff; viewer hanya baca.
do $$
declare t text;
begin
  foreach t in array array['accounts','journal_entries','journal_lines','cash_accounts','customers','suppliers',
    'invoices','payments','products','ingredients','recipe_items','inventory_movements','attachments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_member(business_id))', t||'_sel', t);
    execute format($p$create policy %I on %I for insert with check (is_member(business_id, array['owner','admin','accountant','staff']::member_role[]))$p$, t||'_ins', t);
    execute format($p$create policy %I on %I for update using (is_member(business_id, array['owner','admin','accountant','staff']::member_role[])) with check (is_member(business_id, array['owner','admin','accountant','staff']::member_role[]))$p$, t||'_upd', t);
    execute format($p$create policy %I on %I for delete using (is_member(business_id, array['owner','admin','accountant']::member_role[]))$p$, t||'_del', t);
  end loop;
end $$;

-- Integrasi: klien TIDAK boleh membaca token. Berikan hanya kolom aman via view; tulis hanya oleh service role.
alter table integrations enable row level security;
revoke all on integrations from anon, authenticated;
create view integrations_public with (security_invoker = false) as
  select id, business_id, provider, status, external_account, root_folder_id, last_verified_at
  from integrations where is_member(business_id);
grant select on integrations_public to authenticated;

alter table integration_logs enable row level security;
create policy intlogs_sel on integration_logs for select using (is_member(business_id, array['owner','admin']::member_role[]));

alter table backup_logs enable row level security;
create policy backup_sel on backup_logs for select using (is_member(business_id, array['owner','admin']::member_role[]));

alter table ai_conversations enable row level security;
create policy ai_sel on ai_conversations for select using (user_id = auth.uid() and is_member(business_id));
create policy ai_ins on ai_conversations for insert with check (user_id = auth.uid() and is_member(business_id));

alter table audit_logs enable row level security;
create policy audit_sel on audit_logs for select using (business_id is not null and is_member(business_id, array['owner','admin']::member_role[]));

-- Storage: bucket privat, path = {business_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create policy docs_read on storage.objects for select
  using (bucket_id = 'documents' and is_member(((storage.foldername(name))[1])::uuid));
create policy docs_insert on storage.objects for insert
  with check (bucket_id = 'documents' and is_member(((storage.foldername(name))[1])::uuid, array['owner','admin','accountant','staff']::member_role[]));
create policy docs_delete on storage.objects for delete
  using (bucket_id = 'documents' and is_member(((storage.foldername(name))[1])::uuid, array['owner','admin','accountant']::member_role[]));
