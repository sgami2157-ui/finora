-- Ringkasan per periode (hari/minggu/bulan/tahun) untuk grafik arus kas di dashboard.
-- security invoker: RLS tetap membatasi ke bisnis milik pengguna. Hanya membaca.
-- cash_net = perubahan saldo akun kas/bank (1-11xx, 1-12xx); transfer antar rekening saling meniadakan.
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
  left join journal_entries e on e.business_id = p_business and e.status in ('posted', 'reversed')
       and e.entry_date >= m.p and e.entry_date < (m.p + step)::date
  left join journal_lines l on l.entry_id = e.id
  left join accounts a on a.id = l.account_id
  group by m.p order by m.p;
end $$;
revoke execute on function period_summary(uuid, text, int) from public, anon;
grant execute on function period_summary(uuid, text, int) to authenticated;
