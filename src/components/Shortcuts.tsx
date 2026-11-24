"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GO: Record<string, [string, string]> = {
  d: ["/dashboard", "Dashboard"], s: ["/sales", "Penjualan"], p: ["/purchases", "Pembelian"], c: ["/cash", "Kas & Bank"],
  k: ["/expenses", "Biaya"], b: ["/products", "Produk & Stok"], j: ["/journal", "Jurnal"], r: ["/reports", "Laporan"], a: ["/analysis", "Analisis"],
};

/** Pintasan keyboard: “?” membuka daftar; “g” lalu huruf untuk pindah halaman. Tidak aktif saat mengetik di kolom isian. */
export default function Shortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const gAt = useRef(0);
  const dlg = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (e.key === "?") { e.preventDefault(); setOpen((o) => !o); return; }
      const k = e.key.toLowerCase();
      if (k === "g") { gAt.current = Date.now(); return; }
      if (gAt.current && Date.now() - gAt.current < 1200 && GO[k]) { gAt.current = 0; router.push(GO[k][0]); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey); window.addEventListener("finora:shortcuts", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("finora:shortcuts", onOpen); };
  }, [router]);

  useEffect(() => { if (open) dlg.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="kbd-backdrop" onClick={() => setOpen(false)}>
      <div className="kbd-dialog" role="dialog" aria-modal="true" aria-label="Pintasan keyboard" tabIndex={-1} ref={dlg} onClick={(e) => e.stopPropagation()}>
        <div className="kbd-head"><strong>Pintasan keyboard</strong><button type="button" className="bell-x" aria-label="Tutup" onClick={() => setOpen(false)}>✕</button></div>
        <ul>
          <li><span>Cari apa saja</span><span><kbd>/</kbd> atau <kbd>Ctrl</kbd>+<kbd>K</kbd></span></li>
          <li><span>Buka daftar pintasan ini</span><kbd>?</kbd></li>
          {Object.entries(GO).map(([k, [, label]]) => <li key={k}><span>Ke {label}</span><span><kbd>g</kbd> lalu <kbd>{k}</kbd></span></li>)}
          <li><span>Tutup panel / dialog</span><kbd>Esc</kbd></li>
        </ul>
      </div>
    </div>
  );
}
