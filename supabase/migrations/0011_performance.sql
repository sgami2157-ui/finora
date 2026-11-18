-- Performa: auth.uid() dievaluasi sekali per query (bukan per baris), kebijakan SELECT ganda pada business_members dipisah,
-- dan indeks untuk kunci asing yang dipakai pada join/filter utama (temuan Supabase advisor).
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists members_select on business_members;
create policy members_select on business_members for select using (user_id = (select auth.uid()) or is_member(business_id));
drop policy if exists members_manage on business_members;
create policy members_ins on business_members for insert with check (is_member(business_id, array['owner'::member_role]));
create policy members_upd on business_members for update using (is_member(business_id, array['owner'::member_role])) with check (is_member(business_id, array['owner'::member_role]));
create policy members_del on business_members for delete using (is_member(business_id, array['owner'::member_role]));

drop policy if exists ai_sel on ai_conversations;
create policy ai_sel on ai_conversations for select using (user_id = (select auth.uid()) and is_member(business_id));
drop policy if exists ai_ins on ai_conversations;
create policy ai_ins on ai_conversations for insert with check (user_id = (select auth.uid()) and is_member(business_id));

create index if not exists invoices_customer_idx on invoices(business_id, customer_id);
create index if not exists invoices_supplier_idx on invoices(business_id, supplier_id);
create index if not exists invoices_journal_idx on invoices(business_id, journal_entry_id);
create index if not exists payments_cash_idx on payments(business_id, cash_account_id);
create index if not exists payments_journal_idx on payments(business_id, journal_entry_id);
create index if not exists inv_mov_product_idx on inventory_movements(business_id, product_id);
create index if not exists inv_mov_journal_idx on inventory_movements(business_id, journal_entry_id);
create index if not exists journal_entries_reverses_idx on journal_entries(reverses_id);
create index if not exists cash_accounts_account_idx on cash_accounts(business_id, account_id);
