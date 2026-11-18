/** Sel CSV aman: kutip ganda + cegah formula injection (Excel/Sheets). */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let t = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

/** Baris objek → CSV (BOM UTF-8). Kolom mengikuti kunci semua baris, urutan kemunculan pertama. */
export function toCsv(rows: Record<string, unknown>[]): string {
  const cols: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  const head = cols.map(csvCell).join(",");
  return "﻿" + [head, ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n");
}
