import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { fmtDate } from "@/lib/format";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";

type Inv = { id: string; type: string; number: string; issue_date: string; total: number | string; created_at: string; notes?: string | null };
type Pay = { id: string; invoice_id: string; amount: number | string; paid_on: string; created_at: string };

const FILTERS: [string, string][] = [["all", "Semua"], ["sale", "Penjualan"], ["purchase", "Pembelian"], ["expense", "Biaya"], ["payment", "Pembayaran"]];
const LABEL: Record<string, string> = { sale: "Penjualan", purchase: "Pembelian", expense: "Biaya", payment: "Pembayaran" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; from?: string; to?: string }> }) {
  const { type, q: qRaw, from: fRaw, to: tRaw } = await searchParams;
  const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const from = isDate(fRaw), to = isDate(tRaw);
  const q = (qRaw ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
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
      ? (() => {
          let qb = sb.from("invoices").select("id,type,number,issue_date,total,created_at,notes").eq("business_id", biz.id).is("deleted_at", null);
          if (filter !== "all") qb = qb.eq("type", filter);
          if (from) qb = qb.gte("issue_date", from);
          if (to) qb = qb.lte("issue_date", to);
          if (q) { const qs = q.replace(/[,()*%_\\:"']/g, " ").trim(); if (qs) qb = qb.or(`number.ilike.%${qs}%,notes.ilike.%${qs}%`); }
          return qb.order("issue_date", { ascending: false }).order("created_at", { ascending: false }).limit(60);
        })()
      : Promise.resolve({ data: [] as Inv[] }),
    wantPay
      ? (() => {
          let pb = sb.from("payments").select("id,invoice_id,amount,paid_on,created_at").eq("business_id", biz.id);
          if (from) pb = pb.gte("paid_on", from);
          if (to) pb = pb.lte("paid_on", to);
          return pb.order("paid_on", { ascending: false }).order("created_at", { ascending: false }).limit(60);
        })()
      : Promise.resolve({ data: [] as Pay[] }),
  ]);
  const payments = (payRes.data ?? []) as Pay[];
  const numbers = new Map<string, { number: string; type: string }>();
  if (payments.length) {
    const { data } = await sb.from("invoices").select("id,number,type").eq("business_id", biz.id).in("id", payments.map((p) => p.invoice_id));
    for (const r of (data ?? []) as { id: string; number: string; type: string }[]) numbers.set(r.id, r);
  }

  type Item = { inv: string; key: string; date: string; at: string; kind: string; ref: string; note: string; amount: number; inflow: boolean | null };
  const items: Item[] = [
    ...((invRes.data ?? []) as Inv[]).map((i) => ({ inv: i.id, key: "i" + i.id, date: i.issue_date, at: i.created_at, kind: i.type, ref: i.number, note: i.notes ?? "", amount: toCents(Number(i.total)), inflow: null })),
    ...payments.filter((p) => !q || (numbers.get(p.invoice_id)?.number ?? "").toLowerCase().includes(q.toLowerCase())).map((p) => {
      const inv = numbers.get(p.invoice_id);
      return { inv: p.invoice_id, key: "p" + p.id, date: p.paid_on, at: p.created_at, kind: "payment", ref: inv?.number ?? "–", note: "", amount: toCents(Number(p.amount)), inflow: inv?.type === "sale" };
    }),
  ].sort((a, b) => (a.date === b.date ? (a.at < b.at ? 1 : -1) : a.date < b.date ? 1 : -1)).slice(0, 80);

  return (
    <>
      <PageHead title="Transaksi" desc="Semua penjualan, pembelian, biaya, dan pembayaran dalam satu aliran.">
        <a className="btn primary" href="/sales">+ Penjualan</a>
      </PageHead>
      <form className="filter" action="/transactions">
        {filter !== "all" && <input type="hidden" name="type" value={filter} />}
        <label className="field grow"><span>Cari nomor/catatan</span><input type="search" name="q" defaultValue={q} placeholder="Mis. INV-0001" maxLength={60} /></label>
        <label className="field"><span>Dari</span><input type="date" name="from" defaultValue={from} /></label>
        <label className="field"><span>Sampai</span><input type="date" name="to" defaultValue={to} /></label>
        <button className="primary">Terapkan</button>
        {(q || from || to) && <a className="btn ghost" href={filter === "all" ? "/transactions" : `/transactions?type=${filter}`}>Reset</a>}
      </form>
      <nav className="chips" aria-label="Filter jenis transaksi">
        {FILTERS.map(([k, l]) => <a key={k} href={(() => { const u = new URLSearchParams(); if (k !== "all") u.set("type", k); if (q) u.set("q", q); if (from) u.set("from", from); if (to) u.set("to", to); const t = u.toString(); return t ? `/transactions?${t}` : "/transactions"; })()} className={filter === k ? "on" : ""} aria-current={filter === k ? "page" : undefined}>{l}</a>)}
      </nav>
      <Panel>
        {items.length === 0 ? (
          <Empty icon="transfer" title={q || from || to ? "Tidak ada yang cocok" : "Belum ada transaksi"} desc={q || from || to ? "Ubah kata kunci atau rentang tanggal, atau tekan Reset." : "Catat penjualan, pembelian, atau biaya — hasilnya muncul di sini."}>
            <div className="empty-actions"><a className="btn primary" href="/sales">Catat penjualan</a><a className="btn ghost" href="/expenses">Catat biaya</a></div>
          </Empty>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Tanggal</th><th>Jenis</th><th>Referensi</th><th className="num">Jumlah</th></tr></thead>
            <tbody>{items.map((t) => (
              <tr key={t.key}>
                <td>{fmtDate(t.date)}</td>
                <td><Badge tone={t.kind === "sale" ? "pos" : t.kind === "payment" ? "pri" : t.kind === "expense" ? "warn" : "muted"}>{LABEL[t.kind] ?? t.kind}</Badge></td>
                <td>{t.ref !== "–" ? <a className="mono link" href={`/invoices/${t.inv}`}>{t.ref}</a> : <span className="mono">{t.ref}</span>}{t.note && <small className="sub">{t.note}</small>}</td>
                <td className="num">{t.inflow === null ? "" : t.inflow ? "+ " : "− "}{idr(t.amount)}</td>
              </tr>))}
            </tbody>
          </table></div>
        )}
      </Panel>
    </>
  );
}
