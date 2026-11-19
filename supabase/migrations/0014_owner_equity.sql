-- 0014: setoran modal dan penarikan (prive) pemilik, satu transaksi basis data, jurnal otomatis.
--   capital : Dr rekening kas/bank / Cr 3-1100 Modal Pemilik
--   drawing : Dr 3-1200 Prive      / Cr rekening kas/bank
-- Hanya owner/admin/accountant (dicek is_member). Tidak memengaruhi laba rugi; tampil di arus kas sebagai pendanaan.
create or replace function record_owner_equity(
  p_business uuid, p_cash_account uuid, p_kind text, p_amount numeric, p_date date, p_note text default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare cash_acc uuid; cash_name text; eq uuid; desc_txt text; pref text; lines jsonb;
begin
  if not is_member(p_business, array['owner','admin','accountant']::member_role[]) then raise exception 'Tidak diizinkan'; end if;
  if p_kind not in ('capital','drawing') then raise exception 'Jenis tidak valid'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Nominal harus lebih dari nol'; end if;
  if p_amount > 999999999999 then raise exception 'Nominal terlalu besar'; end if;
  if p_date is null then raise exception 'Tanggal wajib diisi'; end if;
  select account_id, name into cash_acc, cash_name from cash_accounts where id = p_cash_account and business_id = p_business;
  if cash_acc is null then raise exception 'Rekening tidak valid'; end if;
  select id into eq from accounts where business_id = p_business and code = case when p_kind = 'capital' then '3-1100' else '3-1200' end;
  if eq is null then raise exception 'Akun modal/prive tidak ditemukan'; end if;
  pref := case when p_kind = 'capital' then 'MD' else 'PV' end;
  desc_txt := case when p_kind = 'capital' then 'Setoran modal pemilik' else 'Penarikan pemilik ke rekening pribadi' end
              || ' · ' || cash_name || coalesce(' · ' || nullif(left(trim(p_note), 120), ''), '');
  lines := case when p_kind = 'capital'
    then jsonb_build_array(jsonb_build_object('account_id', cash_acc, 'debit', p_amount, 'credit', 0), jsonb_build_object('account_id', eq, 'debit', 0, 'credit', p_amount))
    else jsonb_build_array(jsonb_build_object('account_id', eq, 'debit', p_amount, 'credit', 0), jsonb_build_object('account_id', cash_acc, 'debit', 0, 'credit', p_amount)) end;
  return create_journal_entry(p_business, pref || '-' || to_char(p_date, 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6)),
    p_date, desc_txt, case when p_kind = 'capital' then 'cash_in' else 'cash_out' end, lines);
end $$;
revoke all on function record_owner_equity(uuid, uuid, text, numeric, date, text) from public, anon;
grant execute on function record_owner_equity(uuid, uuid, text, numeric, date, text) to authenticated;
