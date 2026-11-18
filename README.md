# FINORA — Business Accounting & Financial Intelligence

Aplikasi akuntansi double-entry untuk UMKM (Next.js + Supabase + Vercel). **Versi 0.1 = fondasi**, bukan produk lengkap — lihat status jujur di bawah.

## Status fitur

**Sudah ada dan teruji**
- Mesin akuntansi TypeScript (`src/lib/accounting`): validasi debit=kredit, posting, pembalikan, neraca saldo, laba rugi, neraca, arus kas (metode langsung, transfer internal dikecualikan, rekonsiliasi ke saldo kas), buku besar, BEP, HPP rata-rata tertimbang & resep. **18 tes lulus** (`npm test`).
- Skema PostgreSQL, fungsi RPC, RLS, trigger penjaga jurnal (posted tidak bisa diedit/dihapus, jurnal tak seimbang ditolak, periode terkunci), audit log. **Migrasi diterapkan & `supabase/tests/rls_test.sql` lulus di Postgres 16 lokal dengan stub Supabase**; tes terbukti gagal bila penjaga/RLS dimatikan.

**Sudah ditulis tetapi BELUM dijalankan/diuji** (tidak ada akses jaringan saat pembuatan)
- Aplikasi Next.js: login, daftar, pemulihan sandi, buat bisnis, dashboard (dari data jurnal), jurnal (buat/posting/balik), laporan (laba rugi, neraca, neraca saldo), pengaturan.
- OAuth Google Drive server-side; Edge Function `ai-analyst`.
- `npm install`, `npm run build`, `tsc` **belum pernah dijalankan** — kemungkinan ada galat tipe/impor kecil.
- Migrasi belum diterapkan ke project Supabase sungguhan; belum ada deploy Vercel.

**Belum dibuat**
Kas & Bank, Penjualan, Pembelian, Piutang/Utang (UI; fungsi DB `record_payment` & `record_transfer` sudah ada), Produk & Persediaan (UI), Biaya, laporan arus kas/buku besar di UI, ekspor PDF/Excel/CSV, manajemen dokumen & upload, backup/restore, UI AI Analyst, FIFO, pajak, mode terang, PWA icon, skeleton loading, rate limiting, Macaly Cloud (lihat `docs/MACALY.md`).

## Menjalankan
```bash
npm install
cp .env.example .env.local   # isi nilai Supabase, dll.
npm test                     # tes mesin akuntansi
npm run dev
```

## Database
1. Buat project Supabase **staging** terlebih dahulu.
2. Terapkan `supabase/migrations/0001..0005` berurutan (`supabase db push` atau SQL editor).
3. Jalankan `supabase/tests/rls_test.sql` di staging — harus mencetak `SEMUA TES RLS & JURNAL LULUS`.
4. Authentication → aktifkan Email; atur Site URL & Redirect URLs ke domain Anda.
5. Edge Function: `supabase functions deploy ai-analyst` lalu pasang salah satu penyedia: `supabase secrets set ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=...` **atau** `supabase secrets set OPENAI_API_KEY=... OPENAI_MODEL=...` (opsional `AI_PROVIDER=anthropic|openai` jika keduanya terpasang). Nama model diisi sendiri; kode tidak menebaknya.

## Deploy Vercel
1. Push repo ke GitHub, import di Vercel (framework Next.js terdeteksi).
2. Isi Environment Variables dari `.env.example` (Production & Preview). `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY` hanya sebagai variabel server.
3. Pastikan `npm run build` sukses lokal sebelum deploy. Tambahkan custom domain di Vercel → Domains.

## Backup & recovery (sementara)
Gunakan backup bawaan Supabase / `pg_dump`. Backup ke Google Drive dengan verifikasi checksum belum dibuat (tabel `backup_logs` sudah disiapkan).

## Catatan keamanan
Jangan commit `.env*`. Jurnal posted bersifat permanen — koreksi lewat pembalikan. Tinjau kebijakan RLS sebelum produksi.

Dokumen: `docs/ARCHITECTURE.md`, `docs/GOOGLE_DRIVE.md`, `docs/MACALY.md`.
