-- Modul transaksi: rekening kas/bank, penjualan, pembelian, biaya, ringkasan bulanan.
-- Semua fungsi security invoker: RLS tetap berlaku, jurnal selalu seimbang (dipaksa trigger).

-- Rekening kas/bank baru. Setiap rekening punya sub-akun buku besar sendiri
-- (1-11xx di bawah Kas, 1-12xx di bawah Bank) agar saldo per rekening dapat dilacak.
-- Saldo awal (jika > 0) dijurnal: Dr rekening / Cr Modal Pemilik.
create or replace function create_cash_account(
  p_business uuid, p_name text, p_kind cash_kind, p_bank_name text, p_account_number text,
  p_opening numeric, p_date date
) returns uuid language plpgsql security invoker set search_path = public as $$
declare parent_code text; parent uuid; seq int; new_code text; aid uuid; cid uuid; modal uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'Nama rekening wajib diisi'; end if;
  if coalesce(p_opening, 0) < 0 then raise exception 'Saldo awal tidak boleh negatif'; end if;
  parent_code := case when p_kind = 'cash' then '1-1100' else '1-1200' end;
  select id into parent from accounts where business_id = p_business and code = parent_code;
  if parent is null then raise exception 'Akun induk % tidak ditemukan', parent_code; end if;
  select coalesce(max(substr(code, 5)::int), 0) + 1 into seq from accounts where business_id = p_business and parent_id = parent;
  if seq > 99 then raise exception 'Jumlah rekening maksimum tercapai'; end if;
  new_code := substr(parent_code, 1, 4) || lpad(seq::text, 2, '0');
  insert into accounts(business_id, code, name, type, normal_balance, parent_id, is_cash, is_default)
    values (p_business, new_code, trim(p_name), 'asset', 'debit', parent, true, false) returning id into aid;
  insert into cash_accounts(business_id, account_id, name, kind, bank_name, account_number, opening_balance)
    values (p_business, aid, trim(p_name), p_kind, nullif(trim(p_bank_name), ''), nullif(trim(p_account_number), ''), coalesce(p_opening, 0))
    returning id into cid;
  if coalesce(p_opening, 0) > 0 then
    select id into modal from accounts where business_id = p_business and code = '3-1100';
    perform create_journal_entry(p_business, 'OB-' || new_code || '-' || upper(substr(gen_random_uuid()::text, 1, 4)), p_date,
      'Saldo awal ' || trim(p_name), 'general',
      jsonb_build_array(jsonb_build_object('account_id', aid, 'debit', p_opening, 'credit', 0),
                        jsonb_build_object('account_id', modal, 'debit', 0, 'credit', p_opening)));
  end if;
  return cid;
end $$;

-- Penjualan / pembelian / biaya dalam satu transaksi:
--   sale     : Dr Piutang (total) [+ Dr Diskon Penjualan] / Cr Penjualan (subtotal)
--   purchase : Dr Persediaan atau aset terpilih (total) / Cr Utang Usaha (total)
--   expense  : Dr akun beban terpilih (total) / Cr Utang Usaha (total)
-- Bila p_pay_cash diisi, langsung dilunasi lewat record_payment (jurnal pelunasan + baris payments).
create or replace function create_invoice(
  p_business uuid, p_type invoice_type, p_date date, p_due date, p_party_name text,
  p_subtotal numeric, p_discount numeric, p_account uuid, p_notes text, p_pay_cash uuid
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  ar uuid; ap uuid; rev uuid; disc uuid; target uuid; tcode text; ttype account_type;
  party uuid; pname text; v_total numeric; v_disc numeric; jid uuid; iid uuid; num text; prefix text; lines jsonb; descr text;
begin
  v_disc := coalesce(p_discount, 0);
  if p_subtotal is null or p_subtotal <= 0 then raise exception 'Nominal harus lebih dari nol'; end if;
  if v_disc < 0 or v_disc >= p_subtotal then raise exception 'Diskon harus di antara nol dan kurang dari subtotal'; end if;
  if p_due is not null and p_due < p_date then raise exception 'Jatuh tempo tidak boleh sebelum tanggal transaksi'; end if;
  v_total := p_subtotal - v_disc;
  pname := nullif(trim(coalesce(p_party_name, '')), '');

  select id into ar   from accounts where business_id = p_business and code = '1-1300';
  select id into ap   from accounts where business_id = p_business and code = '2-1100';
  select id into rev  from accounts where business_id = p_business and code = '4-1100';
  select id into disc from accounts where business_id = p_business and code = '4-1200';
  if ar is null or ap is null or rev is null or disc is null then raise exception 'Bagan akun standar tidak lengkap'; end if;

  prefix := case p_type when 'sale' then 'INV' when 'purchase' then 'PUR' else 'EXP' end;
  num := prefix || '-' || to_char(p_date, 'YYYYMM') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));

  if p_type = 'sale' then
    if pname is not null then
      select id into party from customers where business_id = p_business and lower(name) = lower(pname) and deleted_at is null limit 1;
      if party is null then insert into customers(business_id, name) values (p_business, pname) returning id into party; end if;
    end if;
    lines := jsonb_build_array(
      jsonb_build_object('account_id', ar, 'debit', v_total, 'credit', 0),
      jsonb_build_object('account_id', rev, 'debit', 0, 'credit', p_subtotal));
    if v_disc > 0 then
      lines := lines || jsonb_build_array(jsonb_build_object('account_id', disc, 'debit', v_disc, 'credit', 0));
    end if;
    descr := 'Penjualan ' || num || coalesce(' - ' || pname, '');
  else
    if pname is not null then
      select id into party from suppliers where business_id = p_business and lower(name) = lower(pname) and deleted_at is null limit 1;
      if party is null then insert into suppliers(business_id, name) values (p_business, pname) returning id into party; end if;
    end if;
    if p_account is null then
      if p_type = 'purchase' then
        select id into target from accounts where business_id = p_business and code = '1-1400';
      else
        raise exception 'Pilih akun beban';
      end if;
    else
      target := p_account;
    end if;
    select code, type into tcode, ttype from accounts where id = target and business_id = p_business and is_active;
    if tcode is null then raise exception 'Akun tujuan tidak valid'; end if;
    if p_type = 'purchase' and (ttype <> 'asset' or tcode like '1-11%' or tcode like '1-12%' or tcode = '1-1300') then
      raise exception 'Pembelian harus dicatat ke akun persediaan/aset (bukan kas, bank, atau piutang)'; end if;
    if p_type = 'expense' and ttype not in ('expense', 'cogs') then raise exception 'Biaya harus dicatat ke akun beban'; end if;
    lines := jsonb_build_array(
      jsonb_build_object('account_id', target, 'debit', v_total, 'credit', 0),
      jsonb_build_object('account_id', ap, 'debit', 0, 'credit', v_total));
    descr := case p_type when 'purchase' then 'Pembelian ' else 'Biaya ' end || num || coalesce(' - ' || pname, '');
  end if;

  jid := create_journal_entry(p_business, 'JU-' || num, p_date, descr,
           case p_type when 'sale' then 'sale' when 'purchase' then 'purchase' else 'general' end, lines, true);

  insert into invoices(business_id, type, number, issue_date, due_date, customer_id, supplier_id,
                       subtotal, discount, total, paid, category, notes, journal_entry_id, created_by)
    values (p_business, p_type, num, p_date, p_due,
            case when p_type = 'sale' then party end, case when p_type <> 'sale' then party end,
            p_subtotal, v_disc, v_total, 0, tcode, nullif(trim(coalesce(p_notes, '')), ''), jid, auth.uid())
    returning id into iid;

  if p_pay_cash is not null then
    perform record_payment(iid, p_pay_cash, v_total, p_date);
  end if;
  return iid;
end $$;

-- Ringkasan bulanan (pendapatan, HPP, beban) untuk grafik; bulan berjalan = bulan di zona Asia/Jakarta.
create or replace function monthly_summary(p_business uuid, p_months int default 6)
returns table(month date, revenue numeric, cogs numeric, expense numeric)
language sql stable security invoker set search_path = public as $$
  with m as (
    select (date_trunc('month', (now() at time zone 'Asia/Jakarta')::date) - make_interval(months => g))::date as month
    from generate_series(0, least(greatest(p_months, 1), 24) - 1) g
  )
  select m.month,
    coalesce(sum(case when a.type = 'revenue' then l.credit - l.debit end), 0),
    coalesce(sum(case when a.type = 'cogs' then l.debit - l.credit end), 0),
    coalesce(sum(case when a.type = 'expense' then l.debit - l.credit end), 0)
  from m
  left join journal_entries e on e.business_id = p_business and e.status in ('posted', 'reversed')
       and e.entry_date >= m.month and e.entry_date < (m.month + interval '1 month')::date
  left join journal_lines l on l.entry_id = e.id
  left join accounts a on a.id = l.account_id
  group by m.month order by m.month
$$;

revoke execute on function create_cash_account(uuid, text, cash_kind, text, text, numeric, date),
  create_invoice(uuid, invoice_type, date, date, text, numeric, numeric, uuid, text, uuid),
  monthly_summary(uuid, int) from public, anon;
grant execute on function create_cash_account(uuid, text, cash_kind, text, text, numeric, date),
  create_invoice(uuid, invoice_type, date, date, text, numeric, numeric, uuid, text, uuid),
  monthly_summary(uuid, int) to authenticated;
