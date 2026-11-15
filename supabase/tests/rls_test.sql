-- Jalankan di project STAGING (bukan produksi) lewat SQL editor atau `supabase test db`.
-- Skrip membuat dua pengguna & dua bisnis, lalu memverifikasi isolasi dan aturan jurnal.
begin;

insert into auth.users(id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.local');

set local role authenticated;

-- Pengguna A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
create temp table ctx(k text primary key, v uuid);
insert into ctx select 'biz_a', create_business('Usaha A');

-- Pengguna B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
insert into ctx select 'biz_b', create_business('Usaha B');

do $$
declare a uuid; b uuid; cnt int; kas uuid; jual uuid; eid uuid; ok boolean;
begin
  select v into a from ctx where k = 'biz_a';
  select v into b from ctx where k = 'biz_b';

  -- B tidak boleh melihat akun bisnis A
  select count(*) into cnt from accounts where business_id = a;
  assert cnt = 0, 'RLS bocor: B melihat akun bisnis A';
  select count(*) into cnt from accounts where business_id = b;
  assert cnt > 0, 'B harus melihat akun bisnis sendiri';

  -- B tidak boleh menulis ke bisnis A
  begin
    insert into customers(business_id, name) values (a, 'x');
    assert false, 'B berhasil menulis ke bisnis A';
  exception when insufficient_privilege or others then
    if sqlstate = 'P0004' then raise; end if;  -- assert failure
  end;

  select id into kas from accounts where business_id = b and code = '1-1100';
  select id into jual from accounts where business_id = b and code = '4-1100';

  -- Jurnal tidak seimbang ditolak
  begin
    perform create_journal_entry(b, 'T-1', current_date, 'tidak seimbang', 'general',
      jsonb_build_array(jsonb_build_object('account_id', kas, 'debit', 100, 'credit', 0),
                        jsonb_build_object('account_id', jual, 'debit', 0, 'credit', 90)));
    assert false, 'Jurnal tidak seimbang berhasil diposting';
  exception when others then
    if sqlstate = 'P0004' then raise; end if;
  end;

  -- Jurnal seimbang OK
  eid := create_journal_entry(b, 'T-2', current_date, 'penjualan', 'sale',
      jsonb_build_array(jsonb_build_object('account_id', kas, 'debit', 100, 'credit', 0),
                        jsonb_build_object('account_id', jual, 'debit', 0, 'credit', 100)));

  -- Jurnal posted tidak boleh diubah / dihapus
  begin
    update journal_entries set description = 'diubah' where id = eid;
    assert false, 'Jurnal posted berhasil diubah';
  exception when others then
    if sqlstate = 'P0004' then raise; end if;
  end;
  begin
    delete from journal_entries where id = eid;
    assert false, 'Jurnal posted berhasil dihapus';
  exception when others then
    if sqlstate = 'P0004' then raise; end if;
  end;

  -- Pembalikan menetralkan saldo
  perform reverse_journal_entry(eid);
  select coalesce(sum(balance),0) into cnt from account_balances(b, null, null) where type = 'revenue';
  assert cnt = 0, 'Pembalikan tidak menetralkan pendapatan';

  -- Token integrasi tidak terbaca oleh klien
  begin
    perform 1 from integrations;
    assert false, 'Klien dapat membaca tabel integrations';
  exception when insufficient_privilege then null;
  end;

  raise notice 'SEMUA TES RLS & JURNAL LULUS';
end $$;

rollback;
