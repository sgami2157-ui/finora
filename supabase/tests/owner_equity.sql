-- Tes rollback-only: setoran modal & penarikan pemilik. Hasil sukses = exception 'ROLLBACK_OK ...'.
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from business_members where role = 'owner' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare b uuid := (select id from businesses limit 1); c uuid; ca uuid; d date := current_date;
        bal0 numeric; bal1 numeric; pr0 numeric; pr1 numeric; mo0 numeric; mo1 numeric; ok boolean;
begin
  select id, account_id into c, ca from cash_accounts where business_id = b limit 1;
  if c is null then raise exception 'GAGAL: tidak ada rekening untuk diuji'; end if;
  select balance into bal0 from account_balances(b, null, null) where account_id = ca;
  select coalesce(sum(balance),0) into pr0 from account_balances(b, null, null) where code = '3-1200';
  select coalesce(sum(balance),0) into mo0 from account_balances(b, null, null) where code = '3-1100';
  perform record_owner_equity(b, c, 'capital', 500000, d, 'uji');
  perform record_owner_equity(b, c, 'drawing', 200000, d, null);
  select balance into bal1 from account_balances(b, null, null) where account_id = ca;
  select coalesce(sum(balance),0) into pr1 from account_balances(b, null, null) where code = '3-1200';
  select coalesce(sum(balance),0) into mo1 from account_balances(b, null, null) where code = '3-1100';
  if coalesce(bal1,0) - coalesce(bal0,0) <> 300000 then raise exception 'GAGAL: saldo rekening berubah %', coalesce(bal1,0) - coalesce(bal0,0); end if;
  if mo1 - mo0 <> 500000 then raise exception 'GAGAL: modal berubah %', mo1 - mo0; end if;
  if pr1 - pr0 <> -200000 then raise exception 'GAGAL: prive berubah % (harus -200000)', pr1 - pr0; end if;
  -- Neraca tetap seimbang: total debit = total kredit pada seluruh jurnal
  select (select coalesce(sum(debit),0) from journal_lines where business_id = b) = (select coalesce(sum(credit),0) from journal_lines where business_id = b) into ok;
  if not ok then raise exception 'GAGAL: jurnal tidak seimbang'; end if;
  begin perform record_owner_equity(b, c, 'capital', 0, d); raise exception 'GAGAL: nominal 0 diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  begin perform record_owner_equity(b, c, 'xxx', 10, d); raise exception 'GAGAL: jenis salah diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  begin perform record_owner_equity(b, gen_random_uuid(), 'capital', 10, d); raise exception 'GAGAL: rekening asing diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  raise exception 'ROLLBACK_OK modal +500000, prive -200000, kas +300000, jurnal seimbang, input tidak valid ditolak';
end $$;
rollback;
