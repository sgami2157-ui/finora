import { supabaseServer } from "@/lib/supabase/server";
import { formatIDR, toCents } from "@/lib/accounting/money";

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
  const y = d.getFullYear(), m = d.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(y, m + 1, 0).getDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
}
