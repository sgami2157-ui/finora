-- 0015: penutupan periode bulanan (kunci) dan tahunan (jurnal penutup ke Laba Ditahan), pembukaan kembali berjejak.
-- Desain:
--  * Bulanan  : business_settings.locked_until = akhir bulan. Trigger jurnal yang sudah ada menolak posting <= tanggal itu.
--  * Tahunan  : jurnal kind='closing' tanggal 31 Des memindahkan saldo Pendapatan/HPP/Beban/Prive tahun itu ke 3-1300 Laba Ditahan, lalu mengunci s.d. 31 Des.
--  * Laporan rentang (laba rugi) TIDAK menghitung jurnal penutup (account_balances dengan p_from, monthly_summary, period_summary);
--    laporan kumulatif (neraca, p_from null) menghitungnya, sehingga neraca tetap seimbang.
--  * Pembukaan kembali hanya owner, wajib catatan; jurnal penutup tahun yang terlewati dibalik otomatis. Riwayat append-only.
create table period_closings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  action text not null check (action in ('close_month','close_year','reopen')),
  locked_until date,
  period_year int,
  net_income numeric,
  closing_entry_id uuid references journal_entries(id),
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on period_closings(business_id, created_at desc);
alter table period_closings enable row level security;
create policy pc_sel on period_closings for select using (is_member(business_id));
create policy pc_ins on period_closings for insert with check (is_member(business_id, array['owner','admin']::member_role[]));
create or replace function period_closings_immutable() returns trigger language plpgsql set search_path = public as $$
begin raise exception 'Riwayat penutupan periode tidak dapat diubah atau dihapus'; end $$;
create trigger trg_period_closings_immutable before update or delete on period_closings for each row execute function period_closings_immutable();

-- Laba bersih (kredit - debit akun Pendapatan/HPP/Beban) pada rentang tanggal, tanpa jurnal penutup.
create or replace function pnl_net(p_business uuid, p_from date, p_to date) returns numeric
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(l.credit - l.debit), 0)
  from journal_lines l join journal_entries e on e.id = l.entry_id join accounts a on a.id = l.account_id
  where e.business_id = p_business and e.status in ('posted','reversed') and e.kind <> 'closing'
    and a.type in ('revenue','cogs','expense') and e.entry_date between p_from and p_to
$$;

create or replace function close_month(p_business uuid, p_month date) returns date
language plpgsql security invoker set search_path = public as $$
declare m_start date; m_end date; lk date; td numeric; tc numeric; today date := (now() at time zone 'Asia/Jakarta')::date; found_s boolean;
begin
  if not is_member(p_business, array['owner','admin']::member_role[]) then raise exception 'Hanya pemilik atau admin yang dapat menutup periode'; end if;
  if p_month is null then raise exception 'Bulan wajib dipilih'; end if;
  m_start := date_trunc('month', p_month)::date;
  m_end := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  if m_end >= today then raise exception 'Bulan % belum selesai, belum bisa ditutup', to_char(m_start, 'MM-YYYY'); end if;
  select locked_until, true into lk, found_s from business_settings where business_id = p_business for update;
  if found_s is not true then raise exception 'Pengaturan usaha tidak ditemukan'; end if;
  if lk is not null and m_end <= lk then raise exception 'Periode sampai % sudah dikunci', to_char(lk, 'DD-MM-YYYY'); end if;
  select coalesce(sum(l.debit),0), coalesce(sum(l.credit),0) into td, tc
    from journal_lines l join journal_entries e on e.id = l.entry_id
    where e.business_id = p_business and e.status in ('posted','reversed') and e.entry_date <= m_end;
  if td <> tc then raise exception 'Pembukuan sampai % belum seimbang (debit % <> kredit %); periksa jurnal dahulu', to_char(m_end, 'DD-MM-YYYY'), td, tc; end if;
  if exists (select 1 from journal_entries where business_id = p_business and status = 'draft' and entry_date <= m_end) then
    raise exception 'Masih ada jurnal draft pada atau sebelum % ; selesaikan dahulu', to_char(m_end, 'DD-MM-YYYY'); end if;
  update business_settings set locked_until = m_end, updated_at = now() where business_id = p_business;
  insert into period_closings(business_id, action, locked_until, net_income) values (p_business, 'close_month', m_end, pnl_net(p_business, m_start, m_end));
  return m_end;
end $$;

create or replace function close_year(p_business uuid, p_year int) returns uuid
language plpgsql security invoker set search_path = public as $$
declare y_start date; y_end date; today date := (now() at time zone 'Asia/Jakarta')::date; lk date; prior numeric;
        re uuid; r record; lines jsonb := '[]'::jsonb; dsum numeric := 0; csum numeric := 0; diff numeric; eid uuid; found_s boolean;
begin
  if not is_member(p_business, array['owner','admin']::member_role[]) then raise exception 'Hanya pemilik atau admin yang dapat menutup tahun'; end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then raise exception 'Tahun tidak valid'; end if;
  y_start := make_date(p_year, 1, 1); y_end := make_date(p_year, 12, 31);
  if y_end >= today then raise exception 'Tahun % belum berakhir', p_year; end if;
  if exists (select 1 from journal_entries where business_id = p_business and kind = 'closing' and status = 'posted' and reverses_id is null and entry_date = y_end) then
    raise exception 'Tahun % sudah ditutup', p_year; end if;
  if exists (select 1 from journal_entries where business_id = p_business and kind = 'closing' and status = 'posted' and reverses_id is null and entry_date > y_end) then
    raise exception 'Tahun setelah % sudah ditutup; buka kembali tahun tersebut lebih dulu', p_year; end if;
  select coalesce(sum(abs(s.bal)), 0) into prior from (
    select sum(l.credit - l.debit) bal from journal_lines l join journal_entries e on e.id = l.entry_id join accounts a on a.id = l.account_id
    where e.business_id = p_business and e.status in ('posted','reversed') and e.entry_date < y_start and a.type in ('revenue','cogs','expense') group by a.id) s;
  if prior <> 0 then raise exception 'Tutup tahun-tahun sebelumnya terlebih dahulu (urut dari yang paling lama)'; end if;
  select id into re from accounts where business_id = p_business and code = '3-1300';
  if re is null then raise exception 'Akun Laba Ditahan tidak ditemukan'; end if;

  for r in
    select a.id, sum(l.credit - l.debit) as net
    from journal_lines l join journal_entries e on e.id = l.entry_id join accounts a on a.id = l.account_id
    where e.business_id = p_business and e.status in ('posted','reversed') and e.kind <> 'closing'
      and e.entry_date between y_start and y_end and (a.type in ('revenue','cogs','expense') or a.code = '3-1200')
    group by a.id having sum(l.credit - l.debit) <> 0
  loop
    if r.net > 0 then lines := lines || jsonb_build_object('account_id', r.id, 'debit', r.net, 'credit', 0); dsum := dsum + r.net;
    else lines := lines || jsonb_build_object('account_id', r.id, 'debit', 0, 'credit', -r.net); csum := csum - r.net; end if;
  end loop;
  diff := dsum - csum;
  if diff > 0 then lines := lines || jsonb_build_object('account_id', re, 'debit', 0, 'credit', diff);
  elsif diff < 0 then lines := lines || jsonb_build_object('account_id', re, 'debit', -diff, 'credit', 0); end if;

  select locked_until, true into lk, found_s from business_settings where business_id = p_business for update;
  if found_s is not true then raise exception 'Pengaturan usaha tidak ditemukan'; end if;
  if jsonb_array_length(lines) >= 2 then
    if lk is not null and lk >= y_end then update business_settings set locked_until = y_end - 1 where business_id = p_business; end if;  -- sementara, dalam transaksi ini
    eid := create_journal_entry(p_business, 'CL-' || p_year || '-' || upper(substr(gen_random_uuid()::text, 1, 4)), y_end,
      'Penutupan tahun ' || p_year || ': laba/rugi dan prive dipindahkan ke Laba Ditahan', 'closing', lines);
  end if;
  update business_settings set locked_until = greatest(coalesce(lk, y_end), y_end), updated_at = now() where business_id = p_business;
  insert into period_closings(business_id, action, locked_until, period_year, net_income, closing_entry_id)
    values (p_business, 'close_year', greatest(coalesce(lk, y_end), y_end), p_year, pnl_net(p_business, y_start, y_end), eid);
  return eid;
end $$;

create or replace function reopen_period(p_business uuid, p_to date, p_note text) returns void
language plpgsql security invoker set search_path = public as $$
declare lk date; e journal_entries; rid uuid; found_s boolean;
begin
  if not is_member(p_business, array['owner']::member_role[]) then raise exception 'Hanya pemilik yang dapat membuka kembali periode'; end if;
  if p_note is null or length(trim(p_note)) < 5 then raise exception 'Alasan pembukaan kembali wajib diisi (minimal 5 huruf)'; end if;
  select locked_until, true into lk, found_s from business_settings where business_id = p_business for update;
  if found_s is not true then raise exception 'Pengaturan usaha tidak ditemukan'; end if;
  if lk is null then raise exception 'Belum ada periode yang dikunci'; end if;
  if p_to is not null and p_to >= lk then raise exception 'Tanggal harus sebelum batas kunci saat ini (%)', to_char(lk, 'DD-MM-YYYY'); end if;
  update business_settings set locked_until = p_to, updated_at = now() where business_id = p_business;
  for e in select * from journal_entries where business_id = p_business and kind = 'closing' and status = 'posted' and reverses_id is null
             and (p_to is null or entry_date > p_to) order by entry_date desc loop
    insert into journal_entries(business_id, number, entry_date, description, kind, status, reverses_id, created_by)
      values (e.business_id, 'RCL-' || e.number, e.entry_date, 'Pembukaan kembali: batalkan ' || e.number, 'closing', 'draft', e.id, auth.uid()) returning id into rid;
    insert into journal_lines(business_id, entry_id, account_id, debit, credit, memo)
      select business_id, rid, account_id, credit, debit, memo from journal_lines where entry_id = e.id;
    update journal_entries set status = 'posted' where id = rid;
    update journal_entries set status = 'reversed' where id = e.id;
  end loop;
  insert into period_closings(business_id, action, locked_until, note) values (p_business, 'reopen', p_to, trim(p_note));
end $$;

-- Laporan rentang tidak menghitung jurnal penutup; laporan kumulatif (p_from null) menghitungnya.
create or replace function account_balances(p_business uuid, p_from date, p_to date)
returns table(account_id uuid, code text, name text, type account_type, balance numeric)
language sql stable security invoker as $$
  select a.id, a.code, a.name, a.type,
    case when a.normal_balance = 'debit'
      then coalesce(sum(l.debit - l.credit),0) else coalesce(sum(l.credit - l.debit),0) end
  from accounts a
  left join journal_lines l on l.account_id = a.id and l.business_id = a.business_id
  left join journal_entries e on e.id = l.entry_id and e.status in ('posted','reversed')
    and (p_from is null or (e.entry_date >= p_from and e.kind <> 'closing')) and (p_to is null or e.entry_date <= p_to)
  where a.business_id = p_business
    and (l.id is null or e.id is not null)
  group by a.id
$$;

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
  left join journal_entries e on e.business_id = p_business and e.status in ('posted', 'reversed') and e.kind <> 'closing'
       and e.entry_date >= m.month and e.entry_date < (m.month + interval '1 month')::date
  left join journal_lines l on l.entry_id = e.id
  left join accounts a on a.id = l.account_id
  group by m.month order by m.month
$$;

create or replace function period_summary(p_business uuid, p_gran text default 'month', p_periods int default 6)
returns table(period date, revenue numeric, cogs numeric, expense numeric, cash_net numeric)
language plpgsql stable security invoker set search_path = public as $$
declare
  g text := case when p_gran in ('day', 'week', 'month', 'year') then p_gran else 'month' end;
  n int := least(greatest(p_periods, 1), 60);
  today date := (now() at time zone 'Asia/Jakarta')::date;
  step interval := ('1 ' || g)::interval;
begin
  return query
  with m as (
    select (date_trunc(g, today::timestamp) - (step * i))::date as p
    from generate_series(0, n - 1) i
  )
  select m.p,
    coalesce(sum(case when a.type = 'revenue' then l.credit - l.debit end), 0),
    coalesce(sum(case when a.type = 'cogs' then l.debit - l.credit end), 0),
    coalesce(sum(case when a.type = 'expense' then l.debit - l.credit end), 0),
    coalesce(sum(case when a.code like '1-11%' or a.code like '1-12%' then l.debit - l.credit end), 0)
  from m
  left join journal_entries e on e.business_id = p_business and e.status in ('posted', 'reversed') and e.kind <> 'closing'
       and e.entry_date >= m.p and e.entry_date < (m.p + step)::date
  left join journal_lines l on l.entry_id = e.id
  left join accounts a on a.id = l.account_id
  group by m.p order by m.p;
end $$;

revoke all on function pnl_net(uuid, date, date), close_month(uuid, date), close_year(uuid, int), reopen_period(uuid, date, text) from public, anon;
grant execute on function pnl_net(uuid, date, date), close_month(uuid, date), close_year(uuid, int), reopen_period(uuid, date, text) to authenticated;
