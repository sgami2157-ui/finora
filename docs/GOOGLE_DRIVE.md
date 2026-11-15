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

## Belum dibuat
Upload dokumen, simpan laporan, ekspor backup & restore ke Drive. Helper `ensureFolderPath` sudah menyiapkan struktur `FINORA/<Bisnis>/<Tahun>/<Sub>`.
