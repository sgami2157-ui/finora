-- Laporan arus kas (metode langsung), hanya membaca. security invoker: RLS tetap berlaku.
-- Setiap jurnal yang menyentuh akun kas/bank diklasifikasikan menurut akun lawan terbesar.
-- Jurnal yang hanya memindahkan uang antar kas/bank (tanpa akun lawan) diabaikan karena nettonya nol.
create or replace function cashflow_report(p_business uuid, p_from date, p_to date)
returns table(section text, label text, amount numeric, sort int)
language sql stable security invoker set search_path = public as $$
  with cash_lines as (
    select e.id as entry_id, e.entry_date, sum(l.debit - l.credit) as cash_net
    from journal_entries e
    join journal_lines l on l.entry_id = e.id and l.business_id = e.business_id
    join accounts a on a.id = l.account_id and a.business_id = l.business_id and a.is_cash
    where e.business_id = p_business and e.status in ('posted','reversed')
    group by e.id, e.entry_date
  ), counter as (
    select distinct on (l.entry_id) l.entry_id, a.code
    from journal_lines l
    join accounts a on a.id = l.account_id and a.business_id = l.business_id and not a.is_cash
    where l.business_id = p_business and l.entry_id in (select entry_id from cash_lines)
    order by l.entry_id, (l.debit + l.credit) desc, a.code
  ), classified as (
    select c.entry_date, c.cash_net,
      case
        when k.code like '4-%' or k.code = '1-1300' then array['operasi','Penerimaan dari pelanggan','1']
        when k.code like '5-%' or k.code in ('2-1100','1-1400','1-1500') then array['operasi','Pembayaran ke pemasok dan pembelian barang','2']
        when k.code like '6-%' then array['operasi','Pembayaran biaya operasional','3']
        when k.code like '1-2%' then array['investasi','Pembelian atau penjualan peralatan','4']
        when k.code like '3-%' then array['pendanaan','Modal dan penarikan pemilik','5']
        when k.code like '2-%' then array['pendanaan','Pinjaman dan utang lainnya','6']
        else array['operasi','Lain-lain','7'] end as cls
    from cash_lines c join counter k on k.entry_id = c.entry_id
    where c.cash_net <> 0
  )
  select 'saldo'::text, 'Saldo kas & bank awal periode'::text,
         coalesce(sum(cash_net) filter (where p_from is not null and entry_date < p_from), 0), 0
    from cash_lines
  union all
  select cls[1], cls[2], sum(cash_net), cls[3]::int
    from classified
   where (p_from is null or entry_date >= p_from) and (p_to is null or entry_date <= p_to)
   group by cls
  union all
  select 'saldo', 'Saldo kas & bank akhir periode',
         coalesce(sum(cash_net) filter (where p_to is null or entry_date <= p_to), 0), 99
    from cash_lines
  order by 4
$$;
revoke execute on function cashflow_report(uuid, date, date) from public, anon;
grant execute on function cashflow_report(uuid, date, date) to authenticated;
