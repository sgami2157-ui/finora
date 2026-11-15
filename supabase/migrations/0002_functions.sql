-- Penegakan aturan akuntansi di level database + fungsi RPC.

-- Membuat bisnis baru: pemilik, pengaturan, dan bagan akun default dalam satu transaksi.
create or replace function create_business(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare bid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login'; end if;
  insert into businesses(name, created_by) values (p_name, auth.uid()) returning id into bid;
  insert into business_members(business_id, user_id, role) values (bid, auth.uid(), 'owner');
  insert into business_settings(business_id) values (bid);
  insert into accounts(business_id, code, name, type, normal_balance, is_cash, is_default)
  select bid, code, name, type::account_type,
         case when type in ('asset','expense','cogs') then 'debit'::normal_balance else 'credit'::normal_balance end,
         is_cash, true
  from (values
    ('1-1100','Kas','asset',true),
    ('1-1200','Bank','asset',true),
    ('1-1300','Piutang Usaha','asset',false),
    ('1-1400','Persediaan Barang','asset',false),
    ('1-1500','Persediaan Bahan Baku','asset',false),
    ('1-2100','Peralatan','asset',false),
    ('2-1100','Utang Usaha','liability',false),
    ('2-1200','Utang Lainnya','liability',false),
    ('3-1100','Modal Pemilik','equity',false),
    ('3-1200','Prive','equity',false),
    ('3-1300','Laba Ditahan','equity',false),
    ('4-1100','Penjualan','revenue',false),
    ('4-1200','Diskon Penjualan','revenue',false),
    ('4-1300','Retur Penjualan','revenue',false),
    ('5-1100','Harga Pokok Penjualan','cogs',false),
    ('6-1100','Beban Gaji','expense',false),
    ('6-1200','Beban Sewa','expense',false),
    ('6-1300','Beban Listrik & Internet','expense',false),
    ('6-1400','Beban Transportasi','expense',false),
    ('6-1500','Beban Pemeliharaan','expense',false),
    ('6-1600','Beban Pemasaran','expense',false),
    ('6-1900','Beban Lain-lain','expense',false)
  ) as t(code, name, type, is_cash);
  return bid;
end $$;

create or replace function is_member(p_business uuid, p_roles member_role[] default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_members m
    where m.business_id = p_business and m.user_id = auth.uid()
      and (p_roles is null or m.role = any(p_roles)))
$$;

-- Total jurnal
create or replace function journal_totals(p_entry uuid, out d numeric, out c numeric)
language sql stable as $$ select coalesce(sum(debit),0), coalesce(sum(credit),0) from journal_lines where entry_id = p_entry $$;

-- Mencegah ubah/hapus jurnal & baris jurnal yang sudah diposting; memvalidasi saat posting.
create or replace function guard_journal_entry() returns trigger language plpgsql as $$
declare d numeric; c numeric; lock_date date; n int;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then raise exception 'Jurnal % sudah diposting dan tidak boleh dihapus', old.number; end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'posted' and new.status = 'reversed' then
      -- satu-satunya perubahan yang diizinkan: menandai telah dibalik
      if (new.number, new.entry_date, new.description, new.business_id) is distinct from (old.number, old.entry_date, old.description, old.business_id) then
        raise exception 'Jurnal posted tidak boleh diubah'; end if;
      return new;
    elsif old.status <> 'draft' then
      raise exception 'Jurnal % berstatus % dan tidak boleh diubah; gunakan pembalikan', old.number, old.status;
    end if;
  end if;
  if new.status = 'posted' then
    select * into d, c from journal_totals(new.id);
    select count(*) into n from journal_lines where entry_id = new.id;
    if n < 2 then raise exception 'Jurnal minimal dua baris'; end if;
    if d <> c then raise exception 'Jurnal tidak seimbang: debit % <> kredit %', d, c; end if;
    if d = 0 then raise exception 'Total jurnal tidak boleh nol'; end if;
    select locked_until into lock_date from business_settings where business_id = new.business_id;
    if lock_date is not null and new.entry_date <= lock_date then
      raise exception 'Periode sampai % sudah dikunci', lock_date; end if;
    new.posted_at = now();
  end if;
  return new;
end $$;
create trigger trg_guard_journal_entry before update or delete on journal_entries
  for each row execute function guard_journal_entry();
-- insert langsung sebagai 'posted' tidak diizinkan (baris belum ada saat insert)
create or replace function guard_journal_insert() returns trigger language plpgsql as $$
begin
  if new.status <> 'draft' then raise exception 'Jurnal baru harus berstatus draft; gunakan post_journal_entry()'; end if;
  return new;
end $$;
create trigger trg_guard_journal_insert before insert on journal_entries
  for each row execute function guard_journal_insert();

create or replace function guard_journal_lines() returns trigger language plpgsql as $$
declare st journal_status; eid uuid;
begin
  eid := case when tg_op = 'DELETE' then old.entry_id else new.entry_id end;
  select status into st from journal_entries where id = eid;
  if st is not null and st <> 'draft' then
    raise exception 'Baris jurnal pada jurnal yang sudah diposting tidak boleh diubah';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger trg_guard_journal_lines before insert or update or delete on journal_lines
  for each row execute function guard_journal_lines();

-- Memposting jurnal (validasi dilakukan trigger)
create or replace function post_journal_entry(p_entry uuid) returns void
language plpgsql security invoker as $$
begin
  update journal_entries set status = 'posted' where id = p_entry and status = 'draft';
  if not found then raise exception 'Jurnal tidak ditemukan atau bukan draft'; end if;
end $$;

-- Pembalikan: buat jurnal baru dengan debit/kredit ditukar, tandai asli sebagai reversed.
create or replace function reverse_journal_entry(p_entry uuid, p_date date default current_date) returns uuid
language plpgsql security invoker as $$
declare e journal_entries; rid uuid; num text;
begin
  select * into e from journal_entries where id = p_entry;
  if not found then raise exception 'Jurnal tidak ditemukan'; end if;
  if e.status <> 'posted' then raise exception 'Hanya jurnal posted yang dapat dibalik'; end if;
  num := 'REV-' || e.number;
  insert into journal_entries(business_id, number, entry_date, description, kind, status, reverses_id, created_by)
    values (e.business_id, num, p_date, 'Pembalikan ' || e.number || ': ' || e.description, 'reversal', 'draft', e.id, auth.uid())
    returning id into rid;
  insert into journal_lines(business_id, entry_id, account_id, debit, credit, memo)
    select business_id, rid, account_id, credit, debit, memo from journal_lines where entry_id = e.id;
  update journal_entries set status = 'posted' where id = rid;
  update journal_entries set status = 'reversed' where id = e.id;
  return rid;
end $$;

-- Pembuatan jurnal dalam satu panggilan: p_lines = [{"account_id":"..","debit":100,"credit":0,"memo":""}]
create or replace function create_journal_entry(
  p_business uuid, p_number text, p_date date, p_description text, p_kind text, p_lines jsonb, p_post boolean default true
) returns uuid language plpgsql security invoker as $$
declare eid uuid; l jsonb;
begin
  insert into journal_entries(business_id, number, entry_date, description, kind, created_by)
    values (p_business, p_number, p_date, p_description, coalesce(p_kind,'general'), auth.uid())
    returning id into eid;
  for l in select * from jsonb_array_elements(p_lines) loop
    insert into journal_lines(business_id, entry_id, account_id, debit, credit, memo)
    values (p_business, eid, (l->>'account_id')::uuid,
            coalesce((l->>'debit')::numeric,0), coalesce((l->>'credit')::numeric,0), l->>'memo');
  end loop;
  if p_post then perform post_journal_entry(eid); end if;
  return eid;
end $$;

-- Pembayaran piutang/utang: jurnal + update paid dalam satu transaksi.
create or replace function record_payment(p_invoice uuid, p_cash_account uuid, p_amount numeric, p_date date)
returns uuid language plpgsql security invoker as $$
declare inv invoices; ca cash_accounts; ar uuid; ap uuid; jid uuid; pid uuid; num text;
begin
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

-- Transfer antar rekening: bukan pendapatan/beban.
create or replace function record_transfer(p_business uuid, p_from uuid, p_to uuid, p_amount numeric, p_date date)
returns uuid language plpgsql security invoker as $$
declare a_from uuid; a_to uuid;
begin
  if p_from = p_to then raise exception 'Rekening asal dan tujuan harus berbeda'; end if;
  select account_id into a_from from cash_accounts where id = p_from and business_id = p_business;
  select account_id into a_to from cash_accounts where id = p_to and business_id = p_business;
  if a_from is null or a_to is null then raise exception 'Rekening tidak valid'; end if;
  return create_journal_entry(p_business, 'TF-' || to_char(p_date,'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6),
    p_date, 'Transfer antar rekening', 'transfer',
    jsonb_build_array(jsonb_build_object('account_id', a_to, 'debit', p_amount, 'credit', 0),
                      jsonb_build_object('account_id', a_from, 'debit', 0, 'credit', p_amount)));
end $$;

-- Neraca saldo / laba rugi dari jurnal posted (dipakai dashboard & AI)
create or replace function account_balances(p_business uuid, p_from date, p_to date)
returns table(account_id uuid, code text, name text, type account_type, balance numeric)
language sql stable security invoker as $$
  select a.id, a.code, a.name, a.type,
    case when a.normal_balance = 'debit'
      then coalesce(sum(l.debit - l.credit),0) else coalesce(sum(l.credit - l.debit),0) end
  from accounts a
  left join journal_lines l on l.account_id = a.id and l.business_id = a.business_id
  left join journal_entries e on e.id = l.entry_id and e.status in ('posted','reversed')
    and (p_from is null or e.entry_date >= p_from) and (p_to is null or e.entry_date <= p_to)
  where a.business_id = p_business
    and (l.id is null or e.id is not null)
  group by a.id
$$;

-- Audit log generik
create or replace function write_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare rec jsonb; bid uuid;
begin
  rec := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  bid := nullif(rec->>'business_id','')::uuid;
  insert into audit_logs(business_id, user_id, table_name, record_id, action, old_data, new_data)
  values (bid, auth.uid(), tg_table_name, rec->>'id', tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return case when tg_op = 'DELETE' then old else new end;
end $$;
do $$
declare t text;
begin
  foreach t in array array['journal_entries','invoices','payments','accounts','cash_accounts','attachments','integrations']
  loop
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$s for each row execute function write_audit()', t);
  end loop;
end $$;

-- Profil otomatis saat registrasi
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
