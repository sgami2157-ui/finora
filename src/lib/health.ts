import { supabaseServer } from "@/lib/supabase/server";
import { getBalances, getMonthly, type MonthPoint } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { daysBetween, todayJakarta } from "@/lib/format";
import { buildInsights, type Insight } from "@/lib/insights";

export type Health = { insights: Insight[]; series: MonthPoint[]; cash: number; ar: number; ap: number };

/** Kumpulkan angka kunci bisnis dan ubah menjadi wawasan berbahasa awam. */
export async function loadHealth(businessId: string, prefetched?: { series?: MonthPoint[] }): Promise<Health> {
  const sb = await supabaseServer();
  const today = todayJakarta();
  const [series, bal, inv, prod] = await Promise.all([
    prefetched?.series ? Promise.resolve(prefetched.series) : getMonthly(businessId, 6),
    getBalances(businessId, null, null),
    sb.from("invoices").select("type,total,paid,due_date").eq("business_id", businessId).is("deleted_at", null),
    sb.from("products").select("sell_price,stock_qty,stock_value").eq("business_id", businessId).is("deleted_at", null).limit(1000),
  ]);
  const cash = bal.filter((r) => r.code.startsWith("1-11") || r.code.startsWith("1-12")).reduce((s, r) => s + r.cents, 0);

  let arTotal = 0, arLate = 0, arLateCount = 0, apTotal = 0, apLate = 0, apLateCount = 0;
  for (const i of (inv.data ?? []) as { type: string; total: number | string; paid: number | string; due_date: string | null }[]) {
    const left = toCents(Number(i.total)) - toCents(Number(i.paid));
    if (left <= 0) continue;
    const late = i.due_date != null && daysBetween(i.due_date, today) > 0;
    if (i.type === "sale") { arTotal += left; if (late) { arLate += left; arLateCount++; } }
    else { apTotal += left; if (late) { apLate += left; apLateCount++; } }
  }
  const products = (prod.data ?? []) as { sell_price: number | string; stock_qty: number | string; stock_value: number | string }[];
  let empty = 0, negMargin = 0;
  for (const p of products) {
    const q = Number(p.stock_qty), v = Number(p.stock_value), price = Number(p.sell_price);
    if (q <= 0) empty++;
    else if (price > 0 && v / q > price) negMargin++;
  }
  const insights = buildInsights({
    series, cash, arTotal, arLate, arLateCount, apTotal, apLate, apLateCount,
    productsEmpty: empty, productsNegativeMargin: negMargin, productCount: products.length,
  });
  return { insights, series, cash, ar: arTotal, ap: apTotal };
}
