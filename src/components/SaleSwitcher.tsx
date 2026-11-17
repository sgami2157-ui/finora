"use client";
import { useState, type ReactNode } from "react";

/** Pilih cara mencatat penjualan: dari daftar produk (stok & modal otomatis) atau nominal saja (jasa). */
export default function SaleSwitcher({ items, plain }: { items: ReactNode; plain: ReactNode }) {
  const [mode, setMode] = useState<"items" | "plain">("items");
  return (
    <div className="form">
      <div className="seg" role="tablist" aria-label="Cara mencatat penjualan">
        <button type="button" role="tab" aria-selected={mode === "items"} className={mode === "items" ? "on" : ""} onClick={() => setMode("items")}>Dari produk</button>
        <button type="button" role="tab" aria-selected={mode === "plain"} className={mode === "plain" ? "on" : ""} onClick={() => setMode("plain")}>Nominal saja</button>
      </div>
      <small className="hint">{mode === "items" ? "Untuk jual barang: stok berkurang dan modal barang tercatat otomatis." : "Untuk jasa atau penjualan tanpa stok: cukup isi jumlah uangnya."}</small>
      {mode === "items" ? items : plain}
    </div>
  );
}
