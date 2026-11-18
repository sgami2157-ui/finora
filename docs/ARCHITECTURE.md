# FINORA — Laporan Audit & Arsitektur (Phase 1)

## 1. Hasil audit environment

| Item | Temuan |
|---|---|
| Node.js | v22.23.4 (mendukung TypeScript type-stripping untuk tes) |
| Git, zip, python3 | Tersedia |
| Akses jaringan shell | **Tidak ada** (npm/pip ditolak) → dependensi belum bisa di-install dan `next build` belum bisa dijalankan di sesi ini |
| Supabase | Tools MCP tersedia, tetapi belum ada project yang ditentukan → migrasi **belum diterapkan** ke project mana pun |
| Vercel | Tools MCP tersedia, belum ada project/repo → **belum deploy** |
| Google Drive | Konektor Drive milik pengguna tersedia, tetapi tidak sama dengan OAuth server-side aplikasi. Perlu OAuth Client sendiri (Google Cloud Console) |
| Macaly Cloud | Tools MCP untuk membuat/mengedit/mempublikasikan *aplikasi Macaly*. Tidak ditemukan API runtime yang terverifikasi untuk dipanggil dari aplikasi lain. Lihat `MACALY.md` |
| GitHub | Tidak ada repo target yang diberikan → source dikirim sebagai ZIP + repo git lokal siap push |

## 2. Arsitektur final

- **Frontend & server-side API:** Next.js 15 (App Router) + TypeScript + Tailwind-ready CSS. Deploy ke Vercel dari GitHub.
- **Backend utama:** Supabase (Auth, Postgres, RLS, Storage, Edge Functions).
- **Mesin akuntansi:** modul TypeScript murni (`src/lib/accounting`) tanpa dependensi, diuji dengan `node:test`. Aturan penting (debit = kredit) **ditegakkan ganda**: di aplikasi dan di database (trigger).
- **Penegakan di database:** jurnal berstatus `draft` → `posted`. Trigger menolak posting jika debit ≠ kredit, menolak ubah/hapus jurnal `posted`. Koreksi lewat fungsi `reverse_journal_entry`.
- **Analisis Bisnis:** halaman `/analysis`, dihitung di server dari RPC `account_balances`/`monthly_summary`, faktur, dan produk (RLS). Fitur AI (Edge Function `ai-analyst`) dinonaktifkan; tabel `ai_conversations` dipertahankan tanpa dipakai.
- **Google Drive:** OAuth 2.0 server-side di Next.js API routes. Client Secret hanya di env server. Metadata file di tabel `attachments`/`integrations`.
- **Macaly Cloud:** adapter `StorageProvider`/`CloudProvider` dengan status `not_verified` sampai diuji nyata.

## 3. Skema database (ringkas)

Inti: `profiles`, `businesses`, `business_members`, `business_settings`, `accounts`, `journal_entries`, `journal_lines`, `cash_accounts`, `customers`, `suppliers`, `invoices`, `payments`, `products`, `ingredients`, `inventory_movements`, `recipe_items`, `attachments`, `integrations`, `integration_logs`, `backup_logs`, `ai_conversations`, `audit_logs`.

Keputusan desain:
- `transactions`, `sales`, `purchases`, `expenses`, `receivables`, `payables`: disatukan menjadi **`invoices`** (type `sale`/`purchase`/`expense`) + `payments`. Piutang/utang = invoice yang belum lunas (view `v_receivables`, `v_payables`). Ini mencegah data ganda dan selisih saldo.
- Transfer antar rekening adalah jurnal Dr Kas/Bank tujuan, Cr Kas/Bank asal — tidak menyentuh akun pendapatan/beban.
- Semua uang disimpan `numeric(18,2)`; di aplikasi dihitung dalam **sen bilangan bulat** (hindari galat floating point).

## 4. Environment variables

Lihat `.env.example`.

## 5. Risiko teknis

1. Dependensi belum ter-install & build belum dijalankan di sesi pembuatan → wajib `npm install && npm run build` sebelum deploy.
2. Migrasi SQL belum dijalankan di Postgres nyata → jalankan di project Supabase **staging** dulu dan jalankan `supabase/tests/rls_test.sql`.
3. UI baru berupa fondasi (login, dashboard terhubung data, jurnal), belum 14 modul penuh.
4. Metode persediaan baru weighted average (FIFO belum).
5. Macaly Cloud belum terverifikasi sebagai target integrasi runtime.
6. Pajak (PPN/PPh) belum diimplementasikan.

## 6. Roadmap

Lihat `README.md` bagian "Status fitur".
