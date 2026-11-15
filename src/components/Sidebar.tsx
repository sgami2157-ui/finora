"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Hanya modul yang benar-benar berfungsi yang berupa tautan. Sisanya ditandai jelas "belum tersedia".
const NAV: { label: string; href?: string }[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Transaksi" },
  { label: "Jurnal Akuntansi", href: "/journal" },
  { label: "Kas & Bank" },
  { label: "Penjualan" },
  { label: "Pembelian" },
  { label: "Produk & Persediaan" },
  { label: "Piutang" },
  { label: "Utang" },
  { label: "Biaya Operasional" },
  { label: "Laporan Keuangan", href: "/reports" },
  { label: "AI Financial Analyst" },
  { label: "Dokumen" },
  { label: "Pengaturan", href: "/settings" },
];

export default function Sidebar({ businessName }: { businessName: string | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login"); router.refresh();
  }
  return (
    <>
      <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">☰ Menu</button>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">{process.env.NEXT_PUBLIC_APP_NAME ?? "FINORA"}</div>
        {businessName && <div style={{ padding: "0 12px 12px", color: "var(--secondary)", fontSize: 13 }}>{businessName}</div>}
        <nav className="nav">
          {NAV.map((n) =>
            n.href ? <a key={n.label} href={n.href}>{n.label}</a>
                   : <span key={n.label} title="Belum tersedia di versi ini">{n.label} · segera</span>)}
        </nav>
        <div style={{ padding: 12 }}><button onClick={logout}>Keluar</button></div>
      </aside>
    </>
  );
}
