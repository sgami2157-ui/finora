import type { IconName } from "@/components/Icon";

export type NavItem = { label: string; icon: IconName; href: string; sub?: string };
// Hanya halaman yang benar-benar ada. Dikelompokkan menurut cara kerja pemilik usaha.
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Ringkasan", items: [{ label: "Dashboard", icon: "dashboard", href: "/dashboard" }] },
  { title: "Keuangan", items: [
    { label: "Transaksi", icon: "transfer", href: "/transactions" },
    { label: "Jurnal Akuntansi", icon: "book", href: "/journal", sub: "Catatan akuntansi lengkap" },
    { label: "Kas & Bank", icon: "bank", href: "/cash" },
    { label: "Buku Besar", icon: "book", href: "/ledger", sub: "Rincian per akun" },
    { label: "Tutup Buku", icon: "lock", href: "/closing", sub: "Kunci bulan dan tahun" },
  ] },
  { title: "Bisnis", items: [
    { label: "Penjualan", icon: "cart", href: "/sales" },
    { label: "Pembelian", icon: "bag", href: "/purchases" },
    { label: "Biaya Operasional", icon: "wallet", href: "/expenses" },
    { label: "Pelanggan & Pemasok", icon: "folder", href: "/parties", sub: "Kontak dan tagihannya" },
    { label: "Produk & Persediaan", icon: "box", href: "/products", sub: "Barang dan stoknya" },
    { label: "Piutang", icon: "coin", href: "/receivables", sub: "Pelanggan yang belum bayar" },
    { label: "Utang", icon: "banknote", href: "/payables", sub: "Tagihan yang harus Anda bayar" },
  ] },
  { title: "Analisis", items: [
    { label: "Laporan Keuangan", icon: "chart", href: "/reports", sub: "Untung/rugi dan kekayaan usaha" },
    { label: "Analisis Bisnis", icon: "trend", href: "/analysis", sub: "Rasio, tren, umur piutang & utang" },
    { label: "Dokumen", icon: "folder", href: "/documents", sub: "Simpan struk dan nota" },
  ] },
  { title: "Pengelolaan", items: [{ label: "Pengaturan", icon: "settings", href: "/settings" }] },
];

/** Halaman tambahan yang tidak ada di sidebar tetapi perlu bisa dicari. */
export const EXTRA_PAGES: NavItem[] = [{ label: "Pusat Bantuan", icon: "help", href: "/help", sub: "Panduan dan tanya jawab" }];
