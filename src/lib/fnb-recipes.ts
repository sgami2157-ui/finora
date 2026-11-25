/**
 * Saran takaran bahan per 1 porsi untuk menu F&B yang umum di Indonesia.
 * PENTING: ini perkiraan umum yang lazim dipakai penjual di lapangan, BUKAN data resmi dan bukan resep Anda.
 * Takaran berbeda menurut ukuran porsi, kualitas bahan, dan selera; selalu sesuaikan, lalu timbang untuk memastikan.
 * Tidak ada harga di sini: harga bahan diisi pengguna dari harga belinya sendiri.
 */
export type Unit = "g" | "ml" | "pcs";
export type SuggestedItem = { name: string; qty: number; unit: Unit; pokok?: boolean; note?: string };
export type Dish = { id: string; label: string; keywords: string[]; portion: string; items: SuggestedItem[] };

export const DISHES: Dish[] = [
  { id: "pecel-lele", label: "Pecel Lele", keywords: ["pecel lele", "lele"], portion: "1 ekor lele + nasi + sambal + lalapan", items: [
    { name: "Lele segar", qty: 180, unit: "g", pokok: true, note: "±1 ekor ukuran konsumsi (4–5 ekor/kg)" },
    { name: "Beras", qty: 90, unit: "g", pokok: true, note: "jadi ±200 g nasi matang" },
    { name: "Minyak goreng", qty: 60, unit: "ml", note: "menggoreng; sebagian sisa bisa dipakai ulang" },
    { name: "Cabai rawit", qty: 20, unit: "g", note: "sambal; sesuaikan tingkat pedas" },
    { name: "Tomat", qty: 40, unit: "g" }, { name: "Bawang merah", qty: 15, unit: "g" }, { name: "Bawang putih", qty: 5, unit: "g" },
    { name: "Terasi", qty: 2, unit: "g" }, { name: "Garam", qty: 3, unit: "g" }, { name: "Gula pasir", qty: 2, unit: "g" },
    { name: "Kunyit", qty: 3, unit: "g", note: "bumbu marinasi lele" }, { name: "Ketumbar", qty: 1, unit: "g" },
    { name: "Timun", qty: 40, unit: "g", note: "lalapan" }, { name: "Kol", qty: 30, unit: "g", note: "lalapan" }, { name: "Kemangi", qty: 5, unit: "g", note: "lalapan" },
  ] },
  { id: "nasi-goreng", label: "Nasi Goreng", keywords: ["nasi goreng", "nasgor"], portion: "1 piring + telur", items: [
    { name: "Beras", qty: 100, unit: "g", pokok: true, note: "±220 g nasi matang" },
    { name: "Telur ayam", qty: 1, unit: "pcs", pokok: true },
    { name: "Minyak goreng", qty: 25, unit: "ml" }, { name: "Kecap manis", qty: 15, unit: "ml" },
    { name: "Bawang merah", qty: 15, unit: "g" }, { name: "Bawang putih", qty: 5, unit: "g" }, { name: "Cabai merah", qty: 10, unit: "g" },
    { name: "Garam", qty: 2, unit: "g" }, { name: "Ayam suwir", qty: 30, unit: "g", note: "opsional" }, { name: "Timun", qty: 20, unit: "g", note: "pelengkap" },
  ] },
  { id: "ayam-geprek", label: "Ayam Geprek", keywords: ["geprek"], portion: "1 potong ayam + nasi + sambal", items: [
    { name: "Ayam (paha/dada potong)", qty: 120, unit: "g", pokok: true },
    { name: "Beras", qty: 90, unit: "g", pokok: true },
    { name: "Tepung bumbu", qty: 50, unit: "g" }, { name: "Minyak goreng", qty: 80, unit: "ml", note: "deep fry" },
    { name: "Cabai rawit", qty: 30, unit: "g" }, { name: "Bawang putih", qty: 8, unit: "g" }, { name: "Garam", qty: 2, unit: "g" },
  ] },
  { id: "mie-ayam", label: "Mie Ayam", keywords: ["mie ayam", "mi ayam", "mie ayam bakso"], portion: "1 mangkuk", items: [
    { name: "Mie basah", qty: 120, unit: "g", pokok: true },
    { name: "Ayam (daging cincang)", qty: 40, unit: "g", pokok: true },
    { name: "Sawi hijau", qty: 30, unit: "g" }, { name: "Kecap manis", qty: 10, unit: "ml" }, { name: "Minyak ayam / goreng", qty: 10, unit: "ml" },
    { name: "Bawang putih", qty: 3, unit: "g" }, { name: "Kaldu ayam (air)", qty: 200, unit: "ml" }, { name: "Pangsit goreng", qty: 2, unit: "pcs" },
  ] },
  { id: "soto-ayam", label: "Soto Ayam", keywords: ["soto"], portion: "1 mangkuk + nasi", items: [
    { name: "Ayam", qty: 80, unit: "g", pokok: true },
    { name: "Beras", qty: 80, unit: "g", pokok: true },
    { name: "Bihun", qty: 20, unit: "g" }, { name: "Kunyit", qty: 5, unit: "g" }, { name: "Jahe", qty: 3, unit: "g" },
    { name: "Bawang putih", qty: 6, unit: "g" }, { name: "Bawang merah", qty: 10, unit: "g" }, { name: "Serai", qty: 5, unit: "g" },
    { name: "Kol", qty: 20, unit: "g" }, { name: "Telur ayam", qty: 1, unit: "pcs", note: "opsional" }, { name: "Minyak goreng", qty: 10, unit: "ml" },
  ] },
  { id: "bakso", label: "Bakso", keywords: ["bakso"], portion: "1 mangkuk ±5 butir", items: [
    { name: "Daging sapi giling", qty: 80, unit: "g", pokok: true },
    { name: "Tepung tapioka", qty: 25, unit: "g" }, { name: "Mie / bihun", qty: 60, unit: "g" }, { name: "Sawi hijau", qty: 20, unit: "g" },
    { name: "Bawang putih", qty: 4, unit: "g" }, { name: "Kaldu (air)", qty: 250, unit: "ml" }, { name: "Garam", qty: 2, unit: "g" },
  ] },
  { id: "sate-ayam", label: "Sate Ayam", keywords: ["sate ayam", "sate"], portion: "10 tusuk + lontong", items: [
    { name: "Daging ayam", qty: 150, unit: "g", pokok: true },
    { name: "Beras (lontong)", qty: 70, unit: "g", pokok: true },
    { name: "Kacang tanah", qty: 40, unit: "g", note: "bumbu kacang" }, { name: "Kecap manis", qty: 20, unit: "ml" },
    { name: "Bawang merah", qty: 15, unit: "g" }, { name: "Bawang putih", qty: 5, unit: "g" }, { name: "Cabai merah", qty: 10, unit: "g" },
    { name: "Tusuk sate", qty: 10, unit: "pcs" },
  ] },
  { id: "gado-gado", label: "Gado-gado", keywords: ["gado"], portion: "1 porsi", items: [
    { name: "Kacang tanah", qty: 50, unit: "g", pokok: true, note: "bumbu kacang" },
    { name: "Kentang", qty: 60, unit: "g" }, { name: "Tahu", qty: 40, unit: "g" }, { name: "Tempe", qty: 30, unit: "g" },
    { name: "Kol", qty: 40, unit: "g" }, { name: "Tauge", qty: 30, unit: "g" }, { name: "Kangkung / bayam", qty: 30, unit: "g" },
    { name: "Telur ayam", qty: 1, unit: "pcs" }, { name: "Gula merah", qty: 15, unit: "g" }, { name: "Cabai rawit", qty: 10, unit: "g" }, { name: "Bawang putih", qty: 4, unit: "g" },
  ] },
  { id: "es-teh", label: "Es Teh Manis", keywords: ["es teh", "teh manis", "teh"], portion: "1 gelas ±300 ml", items: [
    { name: "Teh celup / seduh", qty: 3, unit: "g", pokok: true }, { name: "Gula pasir", qty: 25, unit: "g", pokok: true },
    { name: "Es batu", qty: 150, unit: "g" }, { name: "Air", qty: 250, unit: "ml" },
  ] },
  { id: "kopi-susu", label: "Kopi Susu Es", keywords: ["kopi susu", "kopi"], portion: "1 gelas ±300 ml", items: [
    { name: "Kopi (bubuk/biji)", qty: 12, unit: "g", pokok: true }, { name: "Susu cair", qty: 120, unit: "ml", pokok: true },
    { name: "Gula aren cair", qty: 20, unit: "ml" }, { name: "Es batu", qty: 120, unit: "g" },
  ] },
  { id: "es-jeruk", label: "Es Jeruk", keywords: ["es jeruk", "jeruk"], portion: "1 gelas ±300 ml", items: [
    { name: "Jeruk (peras)", qty: 100, unit: "g", pokok: true }, { name: "Gula pasir", qty: 20, unit: "g" },
    { name: "Es batu", qty: 150, unit: "g" }, { name: "Air", qty: 150, unit: "ml" },
  ] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Cocokkan nama produk dengan menu yang dikenal. Kata kunci yang lebih panjang lebih diutamakan. Null bila tidak dikenal. */
export function matchDish(productName: string): Dish | null {
  const n = " " + norm(productName) + " ";
  let best: { d: Dish; len: number } | null = null;
  for (const d of DISHES) for (const k of d.keywords) {
    if (n.includes(" " + norm(k) + " ") && (!best || k.length > best.len)) best = { d, len: k.length };
  }
  return best?.d ?? null;
}

/** Biaya per satuan dasar (g/ml/pcs) dari harga per kemasan (kg/liter/pcs) yang dimasukkan pengguna. */
export function pricePerBase(unit: Unit, perPack: number): number { return unit === "pcs" ? perPack : perPack / 1000; }
export function packLabel(unit: Unit): string { return unit === "g" ? "kg" : unit === "ml" ? "liter" : "pcs"; }
export function packFromBase(unit: Unit, base: number): number { return unit === "pcs" ? base : base * 1000; }

export type RecipeRow = { name: string; qty: number; unit: Unit; price?: number | null /* per satuan dasar */ };
export function recipeTotals(rows: RecipeRow[]) {
  let cost = 0, priced = 0;
  for (const r of rows) if (r.price != null && r.price > 0) { cost += r.qty * r.price; priced++; }
  return { cost, priced, missing: rows.length - priced };
}
export function formatQty(qty: number, unit: Unit): string {
  const nf = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  if (unit === "g") return qty >= 1000 ? `${nf(qty / 1000)} kg` : `${nf(qty)} g`;
  if (unit === "ml") return qty >= 1000 ? `${nf(qty / 1000)} liter` : `${nf(qty)} ml`;
  return `${nf(qty)} pcs`;
}
