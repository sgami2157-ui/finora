import { Callout, PageHead, Panel } from "@/components/ui";

const GLOSSARY: [string, string][] = [
  ["Pendapatan", "Uang yang Anda peroleh dari berjualan, sebelum dikurangi biaya apa pun."],
  ["HPP (Harga Pokok Penjualan)", "Modal barang yang sudah terjual. Jika beli kopi Rp8.000 dan dijual Rp15.000, HPP-nya Rp8.000."],
  ["Laba kotor", "Pendapatan dikurangi HPP. Menunjukkan seberapa untung dari barangnya saja."],
  ["Laba bersih", "Laba kotor dikurangi biaya operasional (sewa, listrik, gaji). Inilah untung sesungguhnya. Jika negatif, artinya rugi."],
  ["Piutang", "Uang yang masih harus dibayar pelanggan kepada Anda (jual tempo/kredit)."],
  ["Utang", "Uang yang masih harus Anda bayar kepada pemasok atau pihak lain."],
  ["Persediaan", "Stok barang dagangan yang Anda simpan dan belum terjual."],
  ["Aset", "Semua yang dimiliki usaha: uang kas, saldo bank, stok, dan tagihan ke pelanggan."],
  ["Ekuitas", "Bagian kekayaan yang menjadi milik pemilik: modal ditambah untung yang ditahan."],
  ["Neraca", "Foto kondisi usaha pada satu tanggal: apa yang dimiliki (aset) dan dari mana asalnya (utang dan modal). Totalnya selalu seimbang."],
  ["Jurnal", "Catatan akuntansi di balik setiap transaksi. FINORA membuatnya otomatis, Anda tidak wajib mengisinya."],
  ["Debit dan Kredit", "Dua sisi pada jurnal. Setiap transaksi dicatat dua sisi yang jumlahnya sama agar buku selalu seimbang."],
  ["Jurnal balik (pembatalan)", "Cara resmi membatalkan transaksi: bukan menghapus, tetapi membuat catatan lawan agar jejak tetap utuh."],
];
const HOWTO: [string, string][] = [
  ["Saya baru jualan, apa yang dicatat?", "Ketuk tombol Catat lalu pilih Catat penjualan. Isi tanggal, nama pembeli (boleh kosong), jumlah, dan pilih uang masuk ke kas atau bank. Jika pembeli belum bayar, matikan pilihan lunas; transaksi akan muncul di Piutang."],
  ["Pelanggan melunasi tagihan", "Buka Piutang, pilih tagihannya, isi jumlah yang dibayar, lalu simpan."],
  ["Bayar sewa, listrik, atau gaji", "Pilih Catat biaya, pilih jenis biayanya, isi jumlah, dan rekening yang dipakai membayar."],
  ["Membeli barang untuk dijual", "Buka Produk & Persediaan, buat produknya, lalu pilih Tambah stok. Setiap penjualan produk akan mengurangi stok dan menghitung modalnya otomatis."],
  ["Salah catat angka", "Buka Jurnal Akuntansi, cari transaksinya, pilih Balik. Lalu catat ulang dengan angka yang benar."],
  ["Menyimpan foto struk", "Buka Dokumen, pilih kategori, lalu unggah foto atau PDF."],
];
const FAQ: [string, string][] = [
  ["Apakah saya harus paham akuntansi?", "Tidak. Cukup catat kejadian sehari-hari. Aplikasi menyusun jurnal dan laporan secara otomatis."],
  ["Apakah data saya aman?", "Data disimpan di basis data dengan pembatasan akses per pengguna sehingga hanya akun Anda yang dapat membacanya."],
  ["Mengapa transaksi tidak bisa dihapus?", "Agar riwayat keuangan tetap dapat diaudit. Gunakan fitur Balik jika ada kesalahan."],
  ["Apakah AI Analyst selalu aktif?", "AI baru aktif setelah pemilik aplikasi memasang kunci layanannya. Jika belum, halaman AI menyatakannya dengan jelas. Bagian Perlu perhatian tetap bekerja tanpa AI."],
];

export default function HelpPage() {
  return (
    <>
      <PageHead title="Pusat Bantuan" desc="Panduan singkat dengan bahasa sehari-hari. Tidak perlu belajar akuntansi dulu." />
      <Callout title="Mulai dengan tiga langkah">
        1) Tambah rekening kas/bank di <a href="/cash">Kas &amp; Bank</a>. 2) Catat penjualan di <a href="/sales">Penjualan</a>. 3) Catat biaya di <a href="/expenses">Biaya</a>. Setelah itu lihat <a href="/reports">Laporan</a>.
      </Callout>
      <Panel title="Cara melakukan hal umum">
        <div className="faq">{HOWTO.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </Panel>
      <Panel title="Kamus istilah" className="mt">
        <dl className="gloss">{GLOSSARY.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
      </Panel>
      <Panel title="Pertanyaan umum" className="mt">
        <div className="faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </Panel>
    </>
  );
}
