# Integrasi Macaly Cloud

**Status: belum terverifikasi — tidak ada integrasi runtime yang dibuat.**

## Temuan audit
- Yang tersedia di sesi pembuatan adalah tools untuk *membuat, mengedit, mempublikasikan aplikasi Macaly* (proyek, file, deployment, domain). Itu adalah platform hosting/pembuat aplikasi.
- Tidak ditemukan dokumentasi API runtime (endpoint, skema autentikasi, format API key) yang dapat dipanggil dari aplikasi FINORA. Endpoint dan SDK tidak dikarang.

## Yang dibuat
- `src/lib/integrations/macaly.ts`: antarmuka `CloudProvider` + implementasi `NotVerifiedMacaly` yang selalu melaporkan `not_verified` tanpa panggilan jaringan. UI menampilkan "Belum terverifikasi".
- Env `MACALY_API_BASE_URL`/`MACALY_API_KEY` dicadangkan tetapi belum dipakai.

## Langkah berikutnya
Tentukan peran Macaly (hosting alternatif, atau runtime lain), dapatkan dokumentasi API resmi, implementasikan `CloudProvider`, uji nyata, baru ubah status.
Alternatif yang kompatibel hari ini: Vercel (hosting) + Supabase (backend).
