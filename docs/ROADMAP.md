# FINORA — Status Roadmap

Legenda: ✅ selesai dan terverifikasi · 🟡 ada, verifikasi terbatas · ⬜ belum ada

## Migrasi database (urut)
| # | Isi |
|---|---|
| 0001–0004 | Skema, fungsi & trigger jurnal, RLS, hardening keamanan |
| 0005 | Modul: create_cash_account, create_invoice (+bayar tunai), monthly_summary |
| 0006 | Persediaan: guard_stock_write, create_product, stock_in, create_sale, adjust_stock (HPP rata-rata tertimbang) |
| 0007 | period_summary (dashboard, filter harian/mingguan/bulanan/tahunan) |
| 0008 | products.min_stock |
| 0009 | cashflow_report (arus kas metode langsung) |
| 0010 | **Penjaga integritas**: faktur/pembayaran hanya berubah lewat create_invoice/record_payment |
| 0011 | Optimasi RLS (initplan), pecah kebijakan ganda business_members, indeks FK |
| 0012 | ledger_report (buku besar + saldo berjalan) |

Tes database rollback-only: `supabase/tests/` (lihat README di sana). Tes logika murni: `npm test` (18 tes lulus).

## Phase 1 — Audit
- ✅ RLS aktif di 22/22 tabel, kebijakan berbasis peran (owner/admin/accountant/staff/viewer).
- ✅ Temuan & perbaikan: staf dapat mengubah invoices.paid/total atau menyisipkan payments langsung → ditutup (0010, diuji).
- 🟡 `npm install/build` tidak dapat dijalankan di sandbox (tanpa jaringan); build diverifikasi oleh Vercel pada setiap push, tipe diperiksa dengan stub.
- ⬜ Leaked-password protection (Auth) dimatikan: harus diaktifkan pemilik di dashboard Supabase (Auth → Password security).
- ℹ️ `create_business` dan `is_member` (SECURITY DEFINER) sengaja dapat dipanggil pengguna login: onboarding dan evaluasi RLS.

## Phase 2 — Modul bisnis
✅ Kas & Bank · Penjualan · Pembelian · Biaya · Piutang · Utang · Produk & Persediaan (stok minimum) · Pelanggan & Pemasok · Laporan · Dokumen · Detail faktur.
Semua transaksi menghasilkan jurnal otomatis lewat fungsi database.

## Phase 3 — Akuntansi lanjutan
- ✅ Rata-rata tertimbang · pembayaran sebagian · arus kas · buku besar (cocok dengan account_balances, diuji) · validasi laporan (neraca seimbang, selisih arus kas).
- ⬜ FIFO · rekonsiliasi bank · retur penjualan/pembelian · konfigurasi pajak · penutupan periode.

## Phase 4 — AI
- ✅ Edge Function ai-analyst (hanya membaca, batas 30 pertanyaan/jam). Mendukung Anthropic atau OpenAI; aktif setelah pemilik memasang kunci + nama model salah satunya (opsional `AI_PROVIDER`). Wawasan otomatis (non-AI) sudah berjalan.
- ⬜ Prakiraan arus kas, deteksi pengeluaran tidak wajar berbasis model.

## Phase 5 — Pengalaman produk
- ✅ Dashboard responsif, navigasi mobile, loading (skeleton + loader FINORA), pencarian/filter transaksi, CSV (saldo akun), cetak/PDF A4 (faktur, laporan, buku besar), PWA manifest.
- ⬜ Tema terang · ekspor Excel · notifikasi/pengingat jatuh tempo (lonceng baru menampilkan ringkasan).

## Phase 6 — Produksi
- ✅ RLS, penjaga integritas, rate limit AI, indeks.
- ⬜ Backup/restore terjadwal · pemantauan error · manajemen pengguna/peran di UI · tes end-to-end dengan login.
