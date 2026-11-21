/** Versi aplikasi dan catatan rilis. Hanya memuat hal yang benar-benar sudah ada di kode. */
export const APP_VERSION = "2.0.0";

export type Release = { version: string; date: string; title: string; groups: { label: string; items: string[] }[] };

export const RELEASES: Release[] = [
  {
    version: "2.0.0", date: "2026-11-21", title: "Lebih aman, lebih halus, lebih lengkap",
    groups: [
      { label: "Keamanan", items: [
        "Verifikasi dua langkah (TOTP) opsional, dan tombol “Keluar dari semua perangkat”.",
        "Keluar otomatis saat tidak aktif (bisa diatur: 15/30/60 menit atau nonaktif).",
        "Kata sandi baru minimal 10 karakter dengan huruf besar, kecil, dan angka.",
        "Header keamanan tambahan (HSTS, Permissions-Policy, CSP dasar, COOP/CORP) dan respons API tanpa cache.",
        "Log Aktivitas untuk pemilik/admin: riwayat perubahan data.",
        "Penutupan periode terkunci di database; periode yang sudah ditutup tidak bisa diubah diam-diam.",
      ] },
      { label: "Akuntansi", items: [
        "Tutup Buku bulanan dan tahunan dengan jurnal penutup ke Laba Ditahan dan buka kembali yang berjejak.",
        "Setor modal dan penarikan pribadi (prive) di Kas & Bank.",
        "Buku besar dengan saldo berjalan, serta laporan arus kas.",
      ] },
      { label: "Tampilan & kenyamanan", items: [
        "Mode terang/gelap dengan satu tombol, dan pencarian global (/ atau Ctrl+K).",
        "Satu bilah atas untuk semua ukuran layar; pemberitahuan menutup saat digulir.",
        "Grafik tren mini di kartu dashboard, bar komposisi pendapatan, grafik arus kas yang lebih rapi.",
        "Animasi masuk halaman yang halus dan menghormati pengaturan “kurangi gerakan”.",
        "Cetak A4 dan struk thermal 80 mm / 58 mm untuk faktur.",
      ] },
      { label: "Integrasi", items: [
        "Cadangan dan simpan dokumen ke Google Drive; notifikasi push; dibungkus sebagai aplikasi Android (TWA).",
      ] },
    ],
  },
  {
    version: "1.0.0", date: "2026-11-01", title: "Rilis pertama",
    groups: [{ label: "Dasar", items: ["Pembukuan double-entry, faktur penjualan/pembelian, produk & stok, laporan keuangan, dan dokumen."] }],
  },
];
