/** Ubah pesan error teknis (database/jaringan) menjadi kalimat yang bisa dipahami pengguna awam. */
export function friendlyError(raw: string | null | undefined): string {
  const m = (raw ?? "").trim();
  if (!m) return "Terjadi kesalahan. Silakan coba lagi.";
  const l = m.toLowerCase();
  if (l.includes("row-level security") || l.includes("permission denied")) return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
  if (l.includes("failed to fetch") || l.includes("networkerror") || l.includes("network request failed")) return "Koneksi bermasalah. Periksa internet Anda lalu coba lagi.";
  if (l.includes("jwt") || l.includes("not authenticated") || l.includes("invalid refresh token")) return "Sesi Anda berakhir. Silakan masuk kembali.";
  if (l.includes("duplicate key")) return "Data tersebut sudah ada.";
  if (l.includes("violates check constraint") || l.includes("invalid input syntax")) return "Ada isian yang tidak valid. Periksa kembali angka dan tanggalnya.";
  if (l.includes("periode") && (l.includes("terkunci") || l.includes("dikunci"))) return "Periode ini sudah ditutup, jadi transaksi tidak bisa ditambah atau diubah di tanggal tersebut. Pemilik dapat membukanya kembali di menu Tutup Buku.";
  return m;
}
