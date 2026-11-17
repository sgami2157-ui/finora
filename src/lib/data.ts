import { supabaseServer } from "@/lib/supabase/server";
import { formatIDR, toCents } from "@/lib/accounting/money";
import { todayJakarta } from "@/lib/format";

export type Balance = { account_id: string; code: string; name: string; type: string; balance: number | string };

export async function getBusiness() {
  const sb = await supabaseServer();
  const { data } = await sb.from("businesses").select("id,name").is("deleted_at", null).limit(1).maybeSingle();
  return data;
}

export async function getBalances(businessId: string, from: string | null, to: string | null) {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("account_balances", { p_business: businessId, p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return (data as Balance[]).map((b) => ({ ...b, cents: toCents(Number(b.balance)) }));
}

export const idr = formatIDR;

export function sumBy(rows: { type: string; cents: number }[], ...types: string[]) {
  return rows.filter((r) => types.includes(r.type)).reduce((s, r) => s + r.cents, 0);
}

export function monthRange(d = new Date()) {
  const [y, m] = todayJakarta(d).split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}

export type CashAccount = {
  id: string; account_id: string; name: string; kind: "cash" | "bank";
  bank_name: string | null; account_number: string | null; balance: number;
};

/** Rekening kas/bank beserta saldo dari jurnal yang sudah diposting (dalam sen). */
export async function getCashAccounts(businessId: string): Promise<CashAccount[]> {
  const sb = await supabaseServer();
  const [{ data: rows }, balances] = await Promise.all([
    sb.from("cash_accounts").select("id,account_id,name,kind,bank_name,account_number").eq("business_id", businessId).eq("is_active", true).order("created_at"),
    getBalances(businessId, null, null),
  ]);
  const byAcc = new Map(balances.map((b) => [b.account_id, b.cents]));
  return (rows ?? []).map((r) => ({ ...r, balance: byAcc.get(r.account_id) ?? 0 })) as CashAccount[];
}

export type MonthPoint = { month: string; revenue: number; cogs: number; expense: number };

/** Pendapatan, HPP, beban per bulan (dalam sen) untuk grafik. */
export async function getMonthly(businessId: string, months = 6): Promise<MonthPoint[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("monthly_summary", { p_business: businessId, p_months: months });
  if (error) throw new Error(error.message);
  return (data as { month: string; revenue: number | string; cogs: number | string; expense: number | string }[]).map((r) => ({
    month: r.month, revenue: toCents(Number(r.revenue)), cogs: toCents(Number(r.cogs)), expense: toCents(Number(r.expense)),
  }));
}
