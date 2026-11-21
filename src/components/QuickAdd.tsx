"use client";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

const ACTIONS: { href: string; icon: IconName; title: string; sub: string }[] = [
  { href: "/sales", icon: "cart", title: "Catat penjualan", sub: "Ada uang masuk dari jualan" },
  { href: "/expenses", icon: "wallet", title: "Catat biaya", sub: "Bayar sewa, listrik, gaji, dll." },
  { href: "/products", icon: "box", title: "Tambah stok barang", sub: "Beli barang untuk dijual" },
  { href: "/receivables", icon: "coin", title: "Terima bayaran pelanggan", sub: "Pelanggan melunasi tagihan" },
  { href: "/payables", icon: "banknote", title: "Bayar utang", sub: "Lunasi tagihan pemasok" },
  { href: "/cash", icon: "transfer", title: "Pindah uang antar rekening", sub: "Mis. dari kas ke bank" },
  { href: "/cash?jenis=modal#pemilik", icon: "plus", title: "Setor modal ke usaha", sub: "Uang pribadi masuk ke rekening usaha" },
  { href: "/cash?jenis=tarik#pemilik", icon: "banknote", title: "Tarik ke rekening pribadi", sub: "Ambil uang usaha untuk pribadi (prive)" },
  { href: "/documents", icon: "folder", title: "Simpan foto struk / nota", sub: "Unggah bukti transaksi" },
];

const DIAL: { href: string; icon: IconName; title: string }[] = [
  { href: "/sales", icon: "cart", title: "Catat penjualan" },
  { href: "/expenses", icon: "wallet", title: "Catat biaya" },
  { href: "/cash", icon: "transfer", title: "Pindah kas / bank" },
  { href: "/purchases", icon: "box", title: "Tambah pembelian" },
  { href: "/products", icon: "coin", title: "Sesuaikan stok" },
];

/** Tombol "Catat" cepat: pilih kejadian dengan bahasa sehari-hari, tanpa perlu tahu istilah akuntansi. */
export default function QuickAdd() {
  const [open, setOpen] = useState(false); // sheet lengkap
  const [dial, setDial] = useState(false); // menu cepat
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const on = () => setDial((d) => !d);
    window.addEventListener("finora:quickadd", on);
    return () => window.removeEventListener("finora:quickadd", on);
  }, []);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-dial", dial);
    if (!dial) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDial(false); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.removeAttribute("data-dial"); };
  }, [dial]);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      {dial && <div className="dial-backdrop" onClick={() => setDial(false)} aria-hidden="true" />}
      {dial && (
        <div className="dial" role="menu" aria-label="Aksi cepat">
          {[...DIAL].reverse().map((a, i) => (
            <a key={a.href} role="menuitem" href={a.href} className="dial-item" style={{ ["--i" as string]: i }} onClick={() => setDial(false)}>
              <span className="dial-label">{a.title}</span><span className="dial-ico"><Icon name={a.icon} size={20} /></span>
            </a>
          ))}
          <button type="button" className="dial-more" style={{ ["--i" as string]: DIAL.length }} onClick={() => { setDial(false); setOpen(true); }}>Semua aksi…</button>
        </div>
      )}
      <button type="button" className={`fab ${dial ? "is-open" : ""}`} onClick={() => setDial((d) => !d)} aria-haspopup="menu" aria-expanded={dial}>
        <Icon name="plus" size={20} /><span>Catat</span>
      </button>
      {open && (
        <div className="sheet-wrap" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Apa yang ingin Anda catat?" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><strong>Apa yang ingin Anda catat?</strong><button type="button" className="ghost sm" onClick={() => setOpen(false)} aria-label="Tutup">✕</button></div>
            <ul>
              {ACTIONS.map((a, i) => (
                <li key={a.href}>
                  <a href={a.href} ref={i === 0 ? first : undefined} onClick={() => setOpen(false)}>
                    <span className="kpi-ico"><Icon name={a.icon} size={18} /></span>
                    <span><strong>{a.title}</strong><small>{a.sub}</small></span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
