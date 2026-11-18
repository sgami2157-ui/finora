import { NextResponse, type NextRequest } from "next/server";
import { getBalances, getBusiness } from "@/lib/data";

// Ekspor Neraca Saldo (saldo tiap akun) ke CSV. Membutuhkan sesi login (middleware) dan membaca lewat RLS.
const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
// Cegah formula injection di Excel/Sheets pada sel teks.
const cell = (v: string) => { const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; return `"${t.replace(/"/g, '""')}"`; };
const TYPE: Record<string, string> = { asset: "Aset", liability: "Kewajiban", equity: "Ekuitas", revenue: "Pendapatan", expense: "Beban" };

export async function GET(req: NextRequest) {
  const biz = await getBusiness();
  if (!biz) return NextResponse.json({ error: "Bisnis tidak ditemukan" }, { status: 404 });
  const from = isDate(req.nextUrl.searchParams.get("from")), to = isDate(req.nextUrl.searchParams.get("to"));
  const rows = (await getBalances(biz.id, from, to)).filter((r) => r.cents !== 0);
  const lines = [["Kode", "Nama akun", "Jenis", "Saldo (Rp)"].map(cell).join(",")];
  for (const r of rows) lines.push([cell(r.code), cell(r.name), cell(TYPE[r.type] ?? r.type), (r.cents / 100).toFixed(2)].join(","));
  const name = `neraca-saldo-${from ?? "awal"}-${to ?? "kini"}.csv`;
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" },
  });
}
