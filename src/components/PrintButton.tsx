"use client";
import { useEffect, useRef, useState } from "react";

export type PrintFormat = "a4" | "t80" | "t58";
const KEY = "finora:print-format";
const OPTIONS: { id: PrintFormat; label: string; hint: string }[] = [
  { id: "a4", label: "A4", hint: "Dokumen resmi di kertas A4 / simpan PDF" },
  { id: "t80", label: "Struk 80 mm", hint: "Printer thermal kertas lebar 80 mm" },
  { id: "t58", label: "Struk 58 mm", hint: "Printer thermal kertas lebar 58 mm" },
];
// Ukuran halaman harus lewat aturan @page; disisipkan sesaat sebelum mencetak lalu dilepas lagi.
const PAGE_CSS: Record<PrintFormat, string> = {
  a4: "",
  t80: "@page { size: 80mm 297mm; margin: 4mm 3mm; @bottom-right { content: none; } }",
  t58: "@page { size: 58mm 297mm; margin: 3mm 2mm; @bottom-right { content: none; } }",
};

function printAs(fmt: PrintFormat) {
  const root = document.documentElement;
  let style: HTMLStyleElement | null = null;
  if (fmt !== "a4") {
    root.dataset.print = fmt;
    style = document.createElement("style"); style.id = "print-page-size"; style.textContent = PAGE_CSS[fmt];
    document.head.appendChild(style);
  }
  const done = () => { delete root.dataset.print; style?.remove(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  // Beri waktu agar gaya terpasang sebelum dialog cetak dibuka.
  window.setTimeout(() => window.print(), 60);
}

/**
 * Tombol cetak. Dengan satu format (bawaan: A4) langsung mencetak; dengan beberapa format menampilkan menu pilihan
 * A4 / struk thermal 80 mm / 58 mm. Pilihan terakhir diingat di perangkat ini.
 */
export default function PrintButton({ label = "Cetak / simpan PDF", formats = ["a4"] }: { label?: string; formats?: PrintFormat[] }) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<PrintFormat>("a4");
  const box = useRef<HTMLDivElement>(null);
  const opts = OPTIONS.filter((o) => formats.includes(o.id));

  useEffect(() => { try { const v = localStorage.getItem(KEY) as PrintFormat | null; if (v && formats.includes(v)) setLast(v); } catch { /* abaikan */ } }, [formats]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (opts.length <= 1) return <button type="button" className="ghost" onClick={() => printAs("a4")}>{label}</button>;

  function choose(f: PrintFormat) {
    setLast(f); setOpen(false);
    try { localStorage.setItem(KEY, f); } catch { /* abaikan */ }
    printAs(f);
  }
  return (
    <div className="print-menu" ref={box}>
      <button type="button" className="ghost" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Cetak ▾</button>
      {open && (
        <div className="print-pop" role="menu" aria-label="Pilih ukuran cetak">
          {opts.map((o) => (
            <button key={o.id} type="button" role="menuitem" className={`print-opt ${o.id === last ? "on" : ""}`} onClick={() => choose(o.id)}>
              <strong>{o.label}</strong><small>{o.hint}</small>
            </button>
          ))}
          <p className="print-note">Di dialog cetak, pilih printer dan ukuran kertas yang sama, skala 100%, lalu matikan “Header dan footer”.</p>
        </div>
      )}
    </div>
  );
}
