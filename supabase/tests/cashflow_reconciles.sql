begin;
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from business_members where role = 'owner' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare b uuid := (select id from businesses limit 1); cf_close numeric; cf_open numeric; cf_net numeric; gl numeric;
begin
  select amount into cf_open from cashflow_report(b, null, null) where label like 'Saldo kas & bank awal%';
  select amount into cf_close from cashflow_report(b, null, null) where label like 'Saldo kas & bank akhir%';
  select coalesce(sum(amount), 0) into cf_net from cashflow_report(b, null, null) where section <> 'saldo';
  select coalesce(sum(balance), 0) into gl from account_balances(b, null, null) where code like '1-11%' or code like '1-12%';
  if cf_open + cf_net <> cf_close then raise exception 'GAGAL: awal % + bersih % <> akhir %', cf_open, cf_net, cf_close; end if;
  if cf_close <> gl then raise exception 'GAGAL: arus kas akhir % <> saldo buku besar %', cf_close, gl; end if;
  raise exception 'ROLLBACK_OK akhir=% buku_besar=%', cf_close, gl;
end $$;
rollback;
