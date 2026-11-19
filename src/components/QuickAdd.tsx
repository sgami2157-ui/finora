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

/** Tombol "Catat" cepat: pilih kejadian dengan bahasa sehari-hari, tanpa perlu tahu istilah akuntansi. */
export default function QuickAdd() {
  const [open, setOpen] = useState(false);
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("finora:quickadd", on);
    return () => window.removeEventListener("finora:quickadd", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button type="button" className="fab" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
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
