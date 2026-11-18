-- Buku besar per akun dengan saldo berjalan (hanya membaca, security invoker: RLS tetap berlaku).
-- Baris pertama (ord = 0) adalah saldo awal sebelum p_from. Saldo mengikuti sisi normal akun.
create or replace function ledger_report(p_business uuid, p_account uuid, p_from date, p_to date)
returns table(ord bigint, entry_id uuid, entry_date date, number text, description text, memo text, debit numeric, credit numeric, balance numeric)
language sql stable security invoker set search_path = public as $$
  with acc as (select type from accounts where id = p_account and business_id = p_business),
  lines as (
    select e.id as eid, e.entry_date as edate, e.number as enum, e.description as edesc, l.memo as lmemo, l.debit as ldebit, l.credit as lcredit,
           e.created_at as ecreated, l.id as lid,
           case when (select type from acc) in ('asset','expense','cogs') then l.debit - l.credit else l.credit - l.debit end as delta
    from journal_lines l
    join journal_entries e on e.id = l.entry_id and e.business_id = l.business_id
    where l.business_id = p_business and l.account_id = p_account
      and e.status in ('posted','reversed') and (p_to is null or e.entry_date <= p_to)
  ), run as (
    select *, sum(delta) over (order by edate, ecreated, lid) as bal,
           row_number() over (order by edate, ecreated, lid) as rn
    from lines
  )
  select 0::bigint, null::uuid, p_from, 'Saldo awal'::text, null::text, null::text, null::numeric, null::numeric,
         coalesce((select bal from run where p_from is not null and edate < p_from order by rn desc limit 1), 0)
  union all
  select rn, eid, edate, enum, edesc, lmemo, ldebit, lcredit, bal from run where p_from is null or edate >= p_from
  order by 1
$$;
revoke execute on function ledger_report(uuid, uuid, date, date) from public, anon;
grant execute on function ledger_report(uuid, uuid, date, date) to authenticated;
