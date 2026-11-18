-- Integritas laporan: faktur dan pembayaran hanya boleh berubah lewat fungsi transaksi (yang membuat jurnal).
-- Sebelumnya, anggota dengan peran staff bisa mengubah invoices.paid/total atau menyisipkan payments langsung
-- lewat API tabel sehingga piutang/utang menyimpang dari jurnal. Pola sama dengan guard_stock_write.
-- Fungsi yang sah (create_invoice, record_payment) menyalakan bendera di awal tubuh fungsi.

create or replace function guard_invoice_write() returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('finora.fin_write', true), '') = '1' then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    raise exception 'Faktur hanya dapat dibuat lewat fungsi transaksi';
  elsif tg_op = 'DELETE' then
    raise exception 'Faktur tidak dapat dihapus; gunakan jurnal balik';
  elsif new.business_id is distinct from old.business_id or new.type is distinct from old.type or new.number is distinct from old.number
     or new.issue_date is distinct from old.issue_date or new.subtotal is distinct from old.subtotal or new.discount is distinct from old.discount
     or new.total is distinct from old.total or new.paid is distinct from old.paid or new.journal_entry_id is distinct from old.journal_entry_id
     or new.deleted_at is distinct from old.deleted_at then
    raise exception 'Nilai faktur hanya dapat diubah lewat transaksi (pembayaran atau jurnal balik)';
  end if;
  return new;
end $$;
drop trigger if exists invoices_fin_guard on invoices;
create trigger invoices_fin_guard before insert or update or delete on invoices for each row execute function guard_invoice_write();

create or replace function guard_payment_write() returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('finora.fin_write', true), '') = '1' then return coalesce(new, old); end if;
  raise exception 'Pembayaran hanya dapat dicatat lewat fungsi transaksi';
end $$;
drop trigger if exists payments_fin_guard on payments;
create trigger payments_fin_guard before insert or update or delete on payments for each row execute function guard_payment_write();

-- Fungsi sah menyalakan bendera di awal tubuh fungsi (ALTER FUNCTION ... SET tidak diizinkan untuk parameter kustom di Supabase).
create or replace function record_payment(p_invoice uuid, p_cash_account uuid, p_amount numeric, p_date date)
returns uuid language plpgsql security invoker set search_path = public as $$
declare inv invoices; ca cash_accounts; ar uuid; ap uuid; jid uuid; pid uuid; num text;
begin
  perform set_config('finora.fin_write', '1', true); -- izinkan penjaga faktur/pembayaran untuk transaksi sah ini
  select * into inv from invoices where id = p_invoice for update;
  if not found then raise exception 'Invoice tidak ditemukan'; end if;
  if p_amount <= 0 then raise exception 'Nominal harus positif'; end if;
  if inv.paid + p_amount > inv.total then raise exception 'Pembayaran melebihi sisa tagihan'; end if;
  select * into ca from cash_accounts where id = p_cash_account and business_id = inv.business_id;
  if not found then raise exception 'Rekening kas/bank tidak valid'; end if;
  select id into ar from accounts where business_id = inv.business_id and code = '1-1300';
  select id into ap from accounts where business_id = inv.business_id and code = '2-1100';
  num := 'PAY-' || to_char(p_date,'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6);
  if inv.type = 'sale' then
    jid := create_journal_entry(inv.business_id, num, p_date, 'Penerimaan piutang ' || inv.number, 'cash_in',
      jsonb_build_array(jsonb_build_object('account_id', ca.account_id, 'debit', p_amount, 'credit', 0),
                        jsonb_build_object('account_id', ar, 'debit', 0, 'credit', p_amount)));
  else
    jid := create_journal_entry(inv.business_id, num, p_date, 'Pembayaran utang ' || inv.number, 'cash_out',
      jsonb_build_array(jsonb_build_object('account_id', ap, 'debit', p_amount, 'credit', 0),
                        jsonb_build_object('account_id', ca.account_id, 'debit', 0, 'credit', p_amount)));
  end if;
  insert into payments(business_id, invoice_id, cash_account_id, amount, paid_on, journal_entry_id, created_by)
    values (inv.business_id, inv.id, ca.id, p_amount, p_date, jid, auth.uid()) returning id into pid;
  update invoices set paid = paid + p_amount where id = inv.id;
  return pid;
end $$;

create or replace function create_invoice(
  p_business uuid, p_type invoice_type, p_date date, p_due date, p_party_name text,
  p_subtotal numeric, p_discount numeric, p_account uuid, p_notes text, p_pay_cash uuid
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  ar uuid; ap uuid; rev uuid; disc uuid; target uuid; tcode text; ttype account_type;
  party uuid; pname text; v_total numeric; v_disc numeric; jid uuid; iid uuid; num text; prefix text; lines jsonb; descr text;
begin
  perform set_config('finora.fin_write', '1', true); -- izinkan penjaga faktur/pembayaran untuk transaksi sah ini
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

revoke execute on function guard_invoice_write() from public, anon, authenticated;
revoke execute on function guard_payment_write() from public, anon, authenticated;
