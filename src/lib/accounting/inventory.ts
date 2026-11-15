/** Weighted average cost. Semua nominal dalam sen; kuantitas boleh desimal. */
export interface StockState {
  qty: number;
  value: number; // sen
}

export function avgCost(s: StockState): number {
  return s.qty === 0 ? 0 : s.value / s.qty;
}

export function receive(s: StockState, qty: number, unitCost: number): StockState {
  if (qty <= 0) throw new Error("Kuantitas masuk harus positif");
  return { qty: s.qty + qty, value: s.value + Math.round(qty * unitCost) };
}

/** Mengeluarkan stok; mengembalikan HPP (sen) berdasarkan rata-rata tertimbang. */
export function issue(s: StockState, qty: number): { state: StockState; cogs: number } {
  if (qty <= 0) throw new Error("Kuantitas keluar harus positif");
  if (qty > s.qty) throw new Error("Stok tidak mencukupi");
  const cogs = qty === s.qty ? s.value : Math.round(qty * avgCost(s));
  return { state: { qty: s.qty - qty, value: s.value - cogs }, cogs };
}

/** HPP resep = jumlah (kuantitas bahan × biaya rata-rata bahan). */
export function recipeCost(items: { qty: number; unitCost: number }[]): number {
  return items.reduce((s, i) => s + Math.round(i.qty * i.unitCost), 0);
}

export function marginPct(price: number, cost: number): number | null {
  return price <= 0 ? null : ((price - cost) / price) * 100;
}
