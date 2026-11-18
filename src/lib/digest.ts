import type { SupabaseClient } from "@supabase/supabase-js";
import { formatIDR, toCents } from "@/lib/accounting/money";
import { daysBetween, todayJakarta } from "@/lib/format";
import type { PushPayload } from "@/lib/push";

type Inv = { type: string; total: number | string; paid: number | string; due_date: string | null };
type Prod = { stock_qty: number | string; min_stock: number | string };

/** Ringkasan pengingat harian per bisnis. null bila tidak ada yang perlu diingatkan. Murni dari data tercatat. */
export function buildDigest(inv: Inv[], prod: Prod[], today: string): PushPayload | null {
  let arLate = 0, arLateN = 0, apLate = 0, apLateN = 0, soonN = 0, soon = 0;
  for (const i of inv) {
    const left = toCents(Number(i.total)) - toCents(Number(i.paid));
    if (left <= 0 || !i.due_date) continue;
    const d = daysBetween(i.due_date, today); // >0 = terlambat
    if (d > 0) { if (i.type === "sale") { arLate += left; arLateN++; } else { apLate += left; apLateN++; } }
    else if (d >= -3) { soonN++; soon += left; }
  }
  const lowN = prod.filter((p) => Number(p.min_stock) > 0 && Number(p.stock_qty) <= Number(p.min_stock)).length;
  const parts: string[] = [];
  if (arLateN) parts.push(`${arLateN} piutang terlambat (${formatIDR(arLate)})`);
  if (apLateN) parts.push(`${apLateN} utang terlambat (${formatIDR(apLate)})`);
  if (soonN) parts.push(`${soonN} tagihan jatuh tempo ≤3 hari (${formatIDR(soon)})`);
  if (lowN) parts.push(`${lowN} produk stok menipis`);
  if (parts.length === 0) return null;
  const url = arLateN ? "/receivables" : apLateN || soonN ? "/payables" : "/products";
  return { title: "FINORA — Perlu perhatian", body: parts.join(" · "), url, tag: "daily-digest" };
}

export async function digestFor(db: SupabaseClient, businessId: string): Promise<PushPayload | null> {
  const [inv, prod] = await Promise.all([
    db.from("invoices").select("type,total,paid,due_date").eq("business_id", businessId).is("deleted_at", null),
    db.from("products").select("stock_qty,min_stock").eq("business_id", businessId).is("deleted_at", null).limit(1000),
  ]);
  return buildDigest((inv.data ?? []) as Inv[], (prod.data ?? []) as Prod[], todayJakarta());
}
