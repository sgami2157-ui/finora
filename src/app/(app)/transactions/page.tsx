import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { fmtDate } from "@/lib/format";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";

type Inv = { id: string; type: string; number: string; issue_date: string; total: number | string; created_at: string };
type Pay = { id: string; invoice_id: string; amount: number | string; paid_on: string; created_at: string };

const FILTERS: [string, string][] = [["all", "Semua"], ["sale", "Penjualan"], ["purchase", "Pembelian"], ["expense", "Biaya"], ["payment", "Pembayaran"]];
const LABEL: Record<string, string> = { sale: "Penjualan", purchase: "Pembelian", expense: "Biaya", payment: "Pembayaran" };
const HREF: Record<string, string> = { sale: "/sales", purchase: "/purchases", expense: "/expenses" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const filter = FILTERS.some(([k]) => k === type) ? (type as string) : "all";
  const biz = await getBusiness();
  if (!biz) {
    return (<><PageHead title="Transaksi" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);
  }
  const sb = await supabaseServer();
  const wantInv = filter !== "payment";
  const wantPay = filter === "all" || filter === "payment";
  const [invRes, payRes] = await Promise.all([
    wantInv
      ? (filter === "all" ? sb.from("invoices").select("id,type,number,issue_date,total,created_at").eq("business_id", biz.id).is("deleted_at", null)
        : sb.from("invoices").select("id,type,number,issue_date,total,created_at").eq("business_id", biz.id).is("deleted_at", null).eq("type", filter)
      ).order("issue_date", { ascending: false }).order("created_at", { ascending: false }).limit(60)
      : Promise.resolve({ data: [] as Inv[] }),
    wantPay
      ? sb.from("payments").select("id,invoice_id,amount,paid_on,created_at").eq("business_id", biz.id).order("paid_on", { ascending: false }).order("created_at", { ascending: false }).limit(60)
      : Promise.resolve({ data: [] as Pay[] }),
  ]);
  const payments = (payRes.data ?? []) as Pay[];
  const numbers = new Map<string, { number: string; type: string }>();
  if (payments.length) {
    const { data } = await sb.from("invoices").select("id,number,type").eq("business_id", biz.id).in("id", payments.map((p) => p.invoice_id));
    for (const r of (data ?? []) as { id: string; number: string; type: string }[]) numbers.set(r.id, r);
  }

  type Item = { key: string; date: string; at: string; kind: string; ref: string; amount: number; inflow: boolean | null };
  const items: Item[] = [
    ...((invRes.data ?? []) as Inv[]).map((i) => ({ key: "i" + i.id, date: i.issue_date, at: i.created_at, kind: i.type, ref: i.number, amount: toCents(Number(i.total)), inflow: null })),
    ...payments.map((p) => {
      const inv = numbers.get(p.invoice_id);
      return { key: "p" + p.id, date: p.paid_on, at: p.created_at, kind: "payment", ref: inv?.number ?? "–", amount: toCents(Number(p.amount)), inflow: inv?.type === "sale" };
    }),
  ].sort((a, b) => (a.date === b.date ? (a.at < b.at ? 1 : -1) : a.date < b.date ? 1 : -1)).slice(0, 80);

  return (
    <>
      <PageHead title="Transaksi" desc="Semua penjualan, pembelian, biaya, dan pembayaran dalam satu aliran.">
        <a className="btn primary" href="/sales">+ Penjualan</a>
      </PageHead>
      <nav className="chips" aria-label="Filter transaksi">
        {FILTERS.map(([k, l]) => <a key={k} href={k === "all" ? "/transactions" : `/transactions?type=${k}`} className={filter === k ? "on" : ""} aria-current={filter === k ? "page" : undefined}>{l}</a>)}
      </nav>
      <Panel>
        {items.length === 0 ? (
          <Empty icon="transfer" title="Belum ada transaksi" desc="Catat penjualan, pembelian, atau biaya — hasilnya muncul di sini.">
            <div className="empty-actions"><a className="btn primary" href="/sales">Catat penjualan</a><a className="btn ghost" href="/expenses">Catat biaya</a></div>
          </Empty>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Tanggal</th><th>Jenis</th><th>Referensi</th><th className="num">Jumlah</th></tr></thead>
            <tbody>{items.map((t) => (
              <tr key={t.key}>
                <td>{fmtDate(t.date)}</td>
                <td><Badge tone={t.kind === "sale" ? "pos" : t.kind === "payment" ? "pri" : t.kind === "expense" ? "warn" : "muted"}>{LABEL[t.kind] ?? t.kind}</Badge></td>
                <td>{HREF[t.kind] ? <a className="mono" href={HREF[t.kind]}>{t.ref}</a> : <span className="mono">{t.ref}</span>}</td>
                <td className="num">{t.inflow === null ? "" : t.inflow ? "+ " : "− "}{idr(t.amount)}</td>
              </tr>))}
            </tbody>
          </table></div>
        )}
      </Panel>
    </>
  );
}
