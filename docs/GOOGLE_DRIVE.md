# Integrasi Google Drive

**Status:** kode OAuth server-side sudah ditulis (`src/app/api/google/*`, `src/lib/google.ts`), tetapi **belum diuji** dengan akun Google sungguhan di sesi pembuatan. Status "Terhubung" di UI hanya muncul setelah callback berhasil memanggil Drive API (`about.get`) — bukan sekadar token tersimpan.

## Setup
1. Google Cloud Console → buat project → aktifkan **Google Drive API**.
2. OAuth consent screen (External/Internal) → tambahkan scope `drive.file`.
3. Credentials → OAuth client ID tipe **Web application**. Authorized redirect URI: `https://<domain>/api/google/callback` (dan `http://localhost:3000/api/google/callback` untuk dev).
4. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY` di Vercel (Environment Variables) — tidak pernah di kode.

## Keamanan
- Scope `drive.file`: aplikasi hanya melihat file yang ia buat.
- Parameter `state` acak + cookie httpOnly; callback memverifikasi pengguna & peran owner/admin.
- Refresh token dienkripsi AES-256-GCM sebelum disimpan; tabel `integrations` tidak dapat dibaca klien (hanya view `integrations_public` tanpa token).

## Fitur (kode ditulis, BELUM diuji dengan akun Google sungguhan)
- **Simpan dokumen ke Drive:** tombol di halaman Dokumen → `FINORA/<Bisnis>/<Tahun>/<Kategori>/`. Sukses hanya bila ukuran file di Drive = ukuran yang dikirim.
- **Cadangan data:** Pengaturan → "Cadangkan sekarang" mengekspor tabel bisnis (akun, jurnal, faktur, pembayaran, produk, pelanggan, pemasok, mutasi stok) sebagai CSV + `manifest.json` (SHA-256) ke `FINORA/<Bisnis>/Backup/<waktu>/`. Status "Terverifikasi" dicatat di `backup_logs` hanya jika semua ukuran cocok.
- **Cadangan otomatis mingguan:** opt-in (`integrations.backup_auto`), dijalankan oleh cron `/api/cron/notify`.
- Variabel tambahan: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

## Belum dibuat
Restore dari cadangan, simpan laporan PDF ke Drive.
