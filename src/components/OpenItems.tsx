import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getCashAccounts, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { daysBetween, fmtDate, todayJakarta } from "@/lib/format";
import PayForm from "./PayForm";
import { Badge, Empty, Kpi, PageHead, Panel } from "./ui";

type Row = { id: string; number: string; issue_date: string; due_date: string | null; total: number | string; paid: number | string; customer_id: string | null; supplier_id: string | null; type: string };

/** Piutang (penjualan belum lunas) atau utang (pembelian/biaya belum lunas), lengkap dengan umur dan form pelunasan. */
export default async function OpenItems({ side }: { side: "receivable" | "payable" }) {
  const isAR = side === "receivable";
  const title = isAR ? "Piutang" : "Utang";
  const desc = isAR ? "Tagihan pelanggan yang belum lunas." : "Kewajiban ke pemasok dan vendor yang belum dibayar.";
  const biz = await getBusiness();
  if (!biz) {
    return (<><PageHead title={title} desc={desc} /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);
  }

  const sb = await supabaseServer();
  const today = todayJakarta();
  const q = sb.from("invoices").select("id,number,issue_date,due_date,total,paid,customer_id,supplier_id,type")
    .eq("business_id", biz.id).is("deleted_at", null);
  const [cashAccounts, invRes, partyRes] = await Promise.all([
    getCashAccounts(biz.id),
    (isAR ? q.eq("type", "sale") : q.in("type", ["purchase", "expense"])).order("due_date", { ascending: true, nullsFirst: false }).order("issue_date").limit(500),
    sb.from(isAR ? "customers" : "suppliers").select("id,name").eq("business_id", biz.id).limit(1000),
  ]);

  const nameOf = new Map(((partyRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const items = ((invRes.data ?? []) as Row[])
    .map((r) => {
      const total = toCents(Number(r.total)), paid = toCents(Number(r.paid));
      return { ...r, totalC: total, paidC: paid, left: total - paid };
    })
    .filter((r) => r.left > 0);

  const late = (r: { due_date: string | null }) => !!r.due_date && daysBetween(r.due_date, today) > 0;
  const sum = (rows: { left: number }[]) => rows.reduce((s, r) => s + r.left, 0);
  const overdue = items.filter(late);

  return (
    <>
      <PageHead title={title} desc={desc} />
      <div className="kpis">
        <Kpi label={`Total ${title.toLowerCase()}`} value={idr(sum(items))} icon={isAR ? "banknote" : "wallet"} tone="pri" hint={`${items.length} tagihan terbuka`} />
        <Kpi label="Lewat jatuh tempo" value={idr(sum(overdue))} icon="alert" tone={overdue.length ? "neg" : "pos"} hint={overdue.length ? `${overdue.length} tagihan terlambat` : "Tidak ada yang terlambat"} />
      </div>

      <Panel title={`Daftar ${title.toLowerCase()}`} desc="Diurutkan dari jatuh tempo terdekat">
        {items.length === 0 ? (
          <Empty icon="check" title={`Tidak ada ${title.toLowerCase()} terbuka`}
            desc={isAR ? "Penjualan yang belum dibayar akan muncul di sini." : "Pembelian atau biaya yang belum dibayar akan muncul di sini."} />
        ) : (
          <ul className="rows">
            {items.map((r) => {
              const pid = r.customer_id ?? r.supplier_id;
              const d = r.due_date ? daysBetween(r.due_date, today) : null;
              return (
                <li key={r.id} className="row-card">
                  <div className="row-main">
                    <div>
                      <strong>{pid ? nameOf.get(pid) ?? "Tanpa nama" : "Tanpa nama"}</strong>
                      <small className="sub"><a className="mono link" href={`/invoices/${r.id}`}>{r.number}</a> · {fmtDate(r.issue_date)}</small>
                    </div>
                    <div className="row-amt">
                      <strong>{idr(r.left)}</strong>
                      {r.paidC > 0 && <small className="sub">dari {idr(r.totalC)}</small>}
                    </div>
                  </div>
                  <div className="row-foot">
                    {d === null ? <Badge>Tanpa jatuh tempo</Badge>
                      : d > 0 ? <Badge tone="neg">Terlambat {d} hari</Badge>
                      : d === 0 ? <Badge tone="warn">Jatuh tempo hari ini</Badge>
                      : <Badge tone="muted">Jatuh tempo {fmtDate(r.due_date)}</Badge>}
                    <PayForm invoiceId={r.id} outstanding={r.left / 100} cashAccounts={cashAccounts} direction={isAR ? "in" : "out"} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
