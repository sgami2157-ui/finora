"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon, Logo, type IconName } from "./Icon";

// Semua menu kini berfungsi. Item tanpa href (jika ada) ditandai "segera".
const NAV: { label: string; icon: IconName; href?: string; sub?: string }[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Transaksi", icon: "transfer", href: "/transactions" },
  { label: "Jurnal Akuntansi", icon: "book", href: "/journal", sub: "Catatan akuntansi lengkap" },
  { label: "Kas & Bank", icon: "bank", href: "/cash" },
  { label: "Penjualan", icon: "cart", href: "/sales" },
  { label: "Pembelian", icon: "bag", href: "/purchases" },
  { label: "Produk & Persediaan", icon: "box", href: "/products", sub: "Barang dan stoknya" },
  { label: "Piutang", icon: "coin", href: "/receivables", sub: "Pelanggan yang belum bayar" },
  { label: "Utang", icon: "banknote", href: "/payables", sub: "Tagihan yang harus Anda bayar" },
  { label: "Biaya Operasional", icon: "wallet", href: "/expenses" },
  { label: "Laporan Keuangan", icon: "chart", href: "/reports", sub: "Untung/rugi dan kekayaan usaha" },
  { label: "AI Financial Analyst", icon: "sparkles", href: "/ai", sub: "Tanya kondisi usaha Anda" },
  { label: "Dokumen", icon: "folder", href: "/documents", sub: "Simpan struk dan nota" },
  { label: "Pengaturan", icon: "settings", href: "/settings" },
];

export default function Sidebar({ businessName }: { businessName: string | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  // Tutup drawer saat pindah halaman, tekan Esc, atau layar melebar; kunci scroll body saat terbuka.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const mq = window.matchMedia("(min-width: 801px)");
    const onMq = () => { if (mq.matches) setOpen(false); };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); mq.removeEventListener("change", onMq); document.body.style.overflow = ""; };
  }, [open]);

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login"); router.refresh();
  }
  return (
    <>
      <header className="topbar">
        <a href="/dashboard" aria-label="FINORA"><Logo size={30} /></a>
        <button className="burger" onClick={() => setOpen(!open)} aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} aria-controls="app-sidebar">
          <span /><span /><span />
        </button>
      </header>
      <div className={`scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside id="app-sidebar" className={`sidebar ${open ? "open" : ""}`}>
        <div className="sb-top">
          <div className="brand"><Logo size={32} />
            {businessName && <small>{businessName}</small>}
          </div>
          <nav className="nav">
            {NAV.map((n) => {
              const active = !!n.href && (pathname === n.href || pathname.startsWith(n.href + "/"));
              return n.href ? (
                <a key={n.label} href={n.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                  <Icon name={n.icon} /><span className="nav-t">{n.label}{n.sub && <small>{n.sub}</small>}</span>
                </a>
              ) : (
                <span key={n.label} title="Belum tersedia di versi ini"><Icon name={n.icon} />{n.label}<em>segera</em></span>
              );
            })}
          </nav>
        </div>
        <div className="sb-bottom">
          <a href="/help" className={`help-link ${pathname === "/help" ? "active" : ""}`}><Icon name="help" />Pusat Bantuan</a>
          <button className="logout" onClick={logout}><Icon name="logout" />Keluar</button>
        </div>
      </aside>
      <nav className="bottom-nav" aria-label="Menu cepat">
        <a href="/dashboard" className={pathname === "/dashboard" ? "on" : ""}><Icon name="dashboard" size={22} /><span>Beranda</span></a>
        <a href="/sales" className={pathname.startsWith("/sales") ? "on" : ""}><Icon name="cart" size={22} /><span>Penjualan</span></a>
        <button type="button" className="bn-add" onClick={() => window.dispatchEvent(new Event("finora:quickadd"))} aria-label="Catat transaksi"><Icon name="plus" size={26} /></button>
        <a href="/cash" className={pathname.startsWith("/cash") ? "on" : ""}><Icon name="bank" size={22} /><span>Kas</span></a>
        <button type="button" onClick={() => setOpen(true)} aria-label="Buka semua menu"><Icon name="menu" size={22} /><span>Menu</span></button>
      </nav>
    </>
  );
}
