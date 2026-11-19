# Tes database (rollback-only)

Jalankan di SQL editor Supabase atau lewat `psql`. Setiap file memakai transaksi yang **selalu di-rollback**, sehingga tidak ada data yang tersimpan.
Hasil yang diharapkan: pesan error berawalan `ROLLBACK_OK` yang memuat ringkasan; baris `LOLOS(BUG)` atau `DITOLAK(BUG)` berarti tes gagal.

| File | Menguji |
|---|---|
| `financial_guards.sql` | Faktur/pembayaran tidak bisa diubah langsung lewat API; alur sah (create_invoice, record_payment) tetap jalan |
| `cashflow_reconciles.sql` | Saldo akhir laporan arus kas = saldo akun kas/bank di buku besar |
| `ledger_reconciles.sql` | Saldo akhir buku besar tiap akun = `account_balances` |
| `stock_integrity.sql` | Stok hanya berubah lewat fungsi; HPP rata-rata tertimbang dan jurnal HPP |

Tes aplikasi (logika murni): `npm test`.

- `owner_equity.sql` — setoran modal & penarikan pemilik: saldo kas, Modal, Prive, jurnal seimbang, input tidak valid ditolak.
