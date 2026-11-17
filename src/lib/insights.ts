import type { MonthPoint } from "@/lib/data";

export type Insight = { tone: "pos" | "neg" | "warn" | "info"; title: string; text: string; href?: string };

export type InsightInput = {
  series: MonthPoint[];            // 6 bulan, terakhir = bulan berjalan (sen)
  cash: number;                    // total kas+bank (sen)
  arTotal: number; arLate: number; arLateCount: number;
  apTotal: number; apLate: number; apLateCount: number;
  productsEmpty: number; productsNegativeMargin: number; productCount: number;
};

const rp = (cents: number) => "Rp " + Math.round(cents / 100).toLocaleString("id-ID");

/** Wawasan otomatis dari data (aturan sederhana, bukan AI): kalimat awam tanpa istilah akuntansi. */
export function buildInsights(i: InsightInput): Insight[] {
  const out: Insight[] = [];
  const cur = i.series[i.series.length - 1];
  const prev = i.series.length >= 2 ? i.series[i.series.length - 2] : undefined;
  if (cur) {
    const spend = cur.cogs + cur.expense;
    const net = cur.revenue - spend;
    if (cur.revenue === 0 && spend === 0) {
      out.push({ tone: "info", title: "Belum ada catatan bulan ini", text: "Mulai dengan mencatat penjualan atau biaya. Hasilnya langsung muncul di ringkasan ini.", href: "/sales" });
    } else if (net > 0) {
      out.push({ tone: "pos", title: `Bulan ini usaha Anda untung ${rp(net)}`, text: `Pemasukan dari penjualan ${rp(cur.revenue)}, dikurangi modal barang dan biaya ${rp(spend)}.` });
    } else if (net < 0) {
      out.push({ tone: "neg", title: `Bulan ini usaha Anda rugi ${rp(-net)}`, text: `Modal barang dan biaya (${rp(spend)}) lebih besar dari pemasukan (${rp(cur.revenue)}). Periksa biaya terbesar atau naikkan harga/penjualan.`, href: "/reports" });
    }
    if (cur.revenue > 0 && spend / cur.revenue > 0.8 && net > 0) {
      out.push({ tone: "warn", title: "Sebagian besar pemasukan habis untuk biaya", text: `Modal barang dan biaya memakan ${Math.round((spend / cur.revenue) * 100)}% dari penjualan. Untung tipis rawan berubah jadi rugi.` });
    }
  }
  if (cur && prev && prev.revenue > 0 && cur.revenue > 0) {
    const pct = Math.round(((cur.revenue - prev.revenue) / prev.revenue) * 100);
    if (pct >= 10) out.push({ tone: "pos", title: `Penjualan naik ${pct}% dari bulan lalu`, text: `Bulan lalu ${rp(prev.revenue)}, bulan ini ${rp(cur.revenue)}.` });
    else if (pct <= -10) out.push({ tone: "warn", title: `Penjualan turun ${Math.abs(pct)}% dari bulan lalu`, text: `Bulan lalu ${rp(prev.revenue)}, bulan ini ${rp(cur.revenue)}. Bulan masih berjalan, jadi bandingkan lagi di akhir bulan.` });
  }
  const past = i.series.slice(0, -1).filter((p) => p.cogs + p.expense > 0);
  if (past.length > 0) {
    const avg = past.reduce((s, p) => s + p.cogs + p.expense, 0) / past.length;
    if (avg > 0 && i.cash >= 0) {
      const days = Math.floor((i.cash / avg) * 30);
      if (days < 30) out.push({ tone: "warn", title: "Uang tunai & bank menipis", text: `Saldo ${rp(i.cash)} kira-kira hanya cukup untuk ${days} hari pengeluaran rata-rata (${rp(avg)}/bulan). Pertimbangkan menagih piutang atau menunda pembelian.`, href: "/receivables" });
    }
  }
  if (i.cash < 0) out.push({ tone: "neg", title: "Saldo kas/bank negatif", text: "Ada rekening dengan saldo minus. Periksa pencatatan pembayaran atau transfer antar rekening.", href: "/cash" });
  if (i.arLateCount > 0) out.push({ tone: "warn", title: `${i.arLateCount} tagihan pelanggan sudah lewat jatuh tempo`, text: `Total ${rp(i.arLate)} belum dibayar. Segera hubungi pelanggan.`, href: "/receivables" });
  if (i.apLateCount > 0) out.push({ tone: "warn", title: `${i.apLateCount} utang ke pemasok sudah lewat jatuh tempo`, text: `Total ${rp(i.apLate)}. Bayar secepatnya agar hubungan dengan pemasok tetap baik.`, href: "/payables" });
  if (i.productsEmpty > 0) out.push({ tone: "warn", title: `${i.productsEmpty} produk stoknya habis`, text: "Produk yang habis tidak bisa dijual. Tambah stok bila masih diminati.", href: "/products" });
  if (i.productsNegativeMargin > 0) out.push({ tone: "neg", title: `${i.productsNegativeMargin} produk dijual di bawah modal`, text: "Harga jual lebih rendah dari rata-rata harga belinya. Cek dan sesuaikan harga.", href: "/products" });
  return out;
}
