begin;
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from business_members where role = 'owner' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare b uuid := (select id from businesses limit 1); ca uuid; pid uuid; q numeric; v numeric; r text := '';
begin
  select id into ca from cash_accounts where business_id = b and is_active limit 1;
  pid := create_product(b, 'Tes Stok', null, 15000);
  perform stock_in(b, pid, 10, 8000, current_date, null, null, ca);
  perform stock_in(b, pid, 10, 10000, current_date, null, null, ca);
  select stock_qty, stock_value into q, v from products where id = pid;
  r := r || 'stok=' || q || ' nilai=' || v || ' (harus 20 dan 180000; HPP rata-rata 9000);';
  perform set_config('finora.stock_write', '', true);
  begin update products set stock_qty = 999 where id = pid; r := r || 'UPDATE_stok=LOLOS(BUG);'; exception when others then r := r || 'UPDATE_stok=ditolak;'; end;
  raise exception 'ROLLBACK_OK %', r;
end $$;
rollback;
