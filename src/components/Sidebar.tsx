"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon, Logo, type IconName } from "./Icon";

// Hanya modul yang benar-benar berfungsi yang berupa tautan. Sisanya ditandai jelas "segera".
const NAV: { label: string; icon: IconName; href?: string }[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Transaksi", icon: "transfer" },
  { label: "Jurnal Akuntansi", icon: "book", href: "/journal" },
  { label: "Kas & Bank", icon: "bank" },
  { label: "Penjualan", icon: "cart" },
  { label: "Pembelian", icon: "bag" },
  { label: "Produk & Persediaan", icon: "box" },
  { label: "Piutang", icon: "coin" },
  { label: "Utang", icon: "banknote" },
  { label: "Biaya Operasional", icon: "wallet" },
  { label: "Laporan Keuangan", icon: "chart", href: "/reports" },
  { label: "AI Financial Analyst", icon: "sparkles" },
  { label: "Dokumen", icon: "folder" },
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
                  <Icon name={n.icon} />{n.label}
                </a>
              ) : (
                <span key={n.label} title="Belum tersedia di versi ini"><Icon name={n.icon} />{n.label}<em>segera</em></span>
              );
            })}
          </nav>
        </div>
        <button className="logout" onClick={logout}><Icon name="logout" />Keluar</button>
      </aside>
    </>
  );
}
