begin;
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from business_members where role = 'owner' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare b uuid := (select id from businesses limit 1); r record; bad text := '';
begin
  for r in select a.account_id, a.code, a.balance from account_balances(b, null, null) a where a.balance <> 0 loop
    if (select l.balance from ledger_report(b, r.account_id, null, null) l order by l.ord desc limit 1) <> r.balance then bad := bad || r.code || ' '; end if;
  end loop;
  if bad <> '' then raise exception 'GAGAL: saldo buku besar tidak cocok untuk akun %', bad; end if;
  raise exception 'ROLLBACK_OK semua saldo akhir buku besar = account_balances';
end $$;
rollback;
