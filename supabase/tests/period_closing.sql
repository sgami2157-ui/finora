-- Tes rollback-only: penutupan bulan/tahun, laporan tetap benar, kunci menolak posting, buka kembali membalik jurnal penutup.
-- Hasil sukses = exception 'ROLLBACK_OK ...'. Memakai tahun 2024 (data uji hanya hidup di dalam transaksi ini).
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from business_members where role = 'owner' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare b uuid := (select id from businesses limit 1); ca uuid; rev uuid; exp uuid; prv uuid; re uuid;
        rev_p numeric; exp_p numeric; re_bal numeric; prv_bal numeric; rev_cum numeric; a numeric; l numeric; q numeric; ok boolean; msg text; n int;
begin
  select account_id into ca from cash_accounts where business_id = b limit 1;
  select id into rev from accounts where business_id = b and code = '4-1100';
  select id into exp from accounts where business_id = b and code = '6-1200';
  select id into prv from accounts where business_id = b and code = '3-1200';
  select id into re from accounts where business_id = b and code = '3-1300';
  if (select coalesce(sum(abs(x)),0) from (select sum(l2.credit - l2.debit) x from journal_lines l2 join journal_entries e2 on e2.id = l2.entry_id join accounts a2 on a2.id = l2.account_id where e2.business_id = b and e2.entry_date < '2025-01-01' and a2.type in ('revenue','cogs','expense') group by a2.id) s) <> 0 then
    raise exception 'GAGAL: data sebelum 2025 sudah ada; ganti tahun uji'; end if;
  -- data uji: Mar 2024 jual 1.000.000, Sep 2024 sewa 300.000, Okt 2024 prive 100.000
  perform create_journal_entry(b, 'T-1', '2024-03-10', 'uji jual', 'general', jsonb_build_array(jsonb_build_object('account_id', ca, 'debit', 1000000, 'credit', 0), jsonb_build_object('account_id', rev, 'debit', 0, 'credit', 1000000)));
  perform create_journal_entry(b, 'T-2', '2024-09-10', 'uji sewa', 'general', jsonb_build_array(jsonb_build_object('account_id', exp, 'debit', 300000, 'credit', 0), jsonb_build_object('account_id', ca, 'debit', 0, 'credit', 300000)));
  perform create_journal_entry(b, 'T-3', '2024-10-10', 'uji prive', 'general', jsonb_build_array(jsonb_build_object('account_id', prv, 'debit', 100000, 'credit', 0), jsonb_build_object('account_id', ca, 'debit', 0, 'credit', 100000)));

  -- bulan berjalan tidak boleh ditutup
  begin perform close_month(date_trunc('month', current_date)::date); raise exception 'GAGAL: bulan berjalan bisa ditutup'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  -- tutup Juni 2024 -> posting Juni ditolak, Juli boleh
  perform close_month('2024-06-01');
  begin perform create_journal_entry(b, 'T-4', '2024-06-15', 'harus ditolak', 'general', jsonb_build_array(jsonb_build_object('account_id', ca, 'debit', 1, 'credit', 0), jsonb_build_object('account_id', rev, 'debit', 0, 'credit', 1))); raise exception 'GAGAL: posting ke periode terkunci diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  perform create_journal_entry(b, 'T-5', '2024-07-05', 'boleh', 'general', jsonb_build_array(jsonb_build_object('account_id', ca, 'debit', 1, 'credit', 0), jsonb_build_object('account_id', rev, 'debit', 0, 'credit', 1)));
  -- menutup ulang bulan yang sama ditolak
  begin perform close_month('2024-05-01'); raise exception 'GAGAL: menutup bulan yang sudah terkunci diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;

  -- tutup tahun 2024
  perform close_year(b, 2024);
  select sum(balance) into rev_p from account_balances(b, '2024-01-01', '2024-12-31') where type = 'revenue';
  select sum(balance) into exp_p from account_balances(b, '2024-01-01', '2024-12-31') where type = 'expense';
  if rev_p <> 1000001 or exp_p <> 300000 then raise exception 'GAGAL: laba rugi 2024 berubah setelah ditutup (pendapatan %, beban %)', rev_p, exp_p; end if;
  select balance into re_bal from account_balances(b, null, '2025-06-30') where account_id = re;
  if re_bal <> 700001 - 100000 then raise exception 'GAGAL: Laba Ditahan % (harus 600001 = laba 700001 - prive 100000)', re_bal; end if;
  select coalesce(sum(balance),0) into prv_bal from account_balances(b, null, '2025-06-30') where account_id = prv;
  if prv_bal <> 0 then raise exception 'GAGAL: Prive belum nol setelah penutupan (%)', prv_bal; end if;
  select coalesce(sum(balance),0) into rev_cum from account_balances(b, null, '2025-06-30') where type in ('revenue','cogs','expense');
  if rev_cum <> 0 then raise exception 'GAGAL: akun laba rugi kumulatif belum nol (%)', rev_cum; end if;
  -- persamaan neraca per 30 Jun 2025
  select (select coalesce(sum(balance),0) from account_balances(b, null, '2025-06-30') where type = 'asset'),
         (select coalesce(sum(balance),0) from account_balances(b, null, '2025-06-30') where type in ('liability','equity'))
    into a, l;
  if a <> l then raise exception 'GAGAL: neraca tidak seimbang setelah tutup tahun (aset %, kewajiban+modal %)', a, l; end if;
  -- ringkasan bulanan tidak menghitung jurnal penutup
  select count(*) into n from period_summary(b, 'year', 5) p where p.period = '2024-01-01' and p.revenue <> 1000001;
  if n <> 0 then raise exception 'GAGAL: period_summary 2024 salah'; end if;
  -- tahun yang sama tidak bisa ditutup dua kali; posting ke 2024 ditolak; tahun berjalan tidak bisa ditutup
  begin perform close_year(b, 2024); raise exception 'GAGAL: tutup tahun ganda diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  begin perform create_journal_entry(b, 'T-6', '2024-12-20', 'harus ditolak', 'general', jsonb_build_array(jsonb_build_object('account_id', ca, 'debit', 1, 'credit', 0), jsonb_build_object('account_id', rev, 'debit', 0, 'credit', 1))); raise exception 'GAGAL: posting ke tahun tertutup diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  begin perform close_year(b, extract(year from current_date)::int); raise exception 'GAGAL: tahun berjalan bisa ditutup'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  -- buka kembali tanpa alasan ditolak; dengan alasan -> jurnal penutup dibalik, laba rugi kumulatif kembali
  begin perform reopen_period(b, '2023-12-31', ''); raise exception 'GAGAL: buka kembali tanpa alasan diterima'; exception when others then if sqlerrm like 'GAGAL%' then raise; end if; end;
  perform reopen_period(b, '2023-12-31', 'uji koreksi tahun 2024');
  select coalesce(sum(balance),0) into re_bal from account_balances(b, null, '2025-06-30') where account_id = re;
  select sum(balance) into rev_cum from account_balances(b, null, '2025-06-30') where type = 'revenue';
  if re_bal <> 0 or rev_cum <> 1000001 then raise exception 'GAGAL: pembukaan kembali tidak membalik penutupan (RE %, pendapatan %)', re_bal, rev_cum; end if;
  select (select coalesce(sum(balance),0) from account_balances(b, null, '2025-06-30') where type = 'asset'),
         (select coalesce(sum(balance),0) from account_balances(b, null, '2025-06-30') where type in ('liability','equity')) + (select coalesce(sum(case when type = 'revenue' then balance else -balance end),0) from account_balances(b, null, '2025-06-30') where type in ('revenue','cogs','expense'))
    into a, l;
  if a <> l then raise exception 'GAGAL: neraca tidak seimbang setelah buka kembali (% vs %)', a, l; end if;
  -- tahun bisa ditutup lagi, dan riwayat tercatat & tidak bisa diubah
  perform close_year(b, 2024);
  select count(*) into n from period_closings where business_id = b;
  if n < 4 then raise exception 'GAGAL: riwayat penutupan tidak lengkap (%)', n; end if;
  update period_closings set note = 'x';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: riwayat bisa diubah (% baris)', n; end if;
  delete from period_closings;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'GAGAL: riwayat bisa dihapus (% baris)', n; end if;
  raise exception 'ROLLBACK_OK kunci bulan, tutup tahun, laporan & neraca tetap benar, buka kembali membalik penutupan, riwayat append-only';
end $$;
rollback;
