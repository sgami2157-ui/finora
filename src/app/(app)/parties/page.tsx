import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { Badge, Callout, Empty, Kpi, PageHead, Panel } from "@/components/ui";
import { AddPartyForm, PartyRowActions, type PartyTable } from "@/components/PartyForms";

type Party = { id: string; name: string; phone: string | null; email: string | null; address: string | null };
type Inv = { total: number | string; paid: number | string; customer_id: string | null; supplier_id: string | null };

export default async function PartiesPage({ searchParams }: { searchParams: Promise<{ t?: string; q?: string }> }) {
  const sp = await searchParams;
  const biz = await getBusiness();
  if (!biz) return <><PageHead title="Pelanggan & Pemasok" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>;
  const table: PartyTable = sp.t === "suppliers" ? "suppliers" : "customers";
  const isCus = table === "customers";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const sb = await supabaseServer();
  const [pRes, iRes] = await Promise.all([
    sb.from(table).select("id,name,phone,email,address").eq("business_id", biz.id).is("deleted_at", null).order("name").limit(500),
    sb.from("invoices").select("total,paid,customer_id,supplier_id").eq("business_id", biz.id).eq("type", isCus ? "sale" : "purchase").is("deleted_at", null).limit(5000),
  ]);
  const all = (pRes.data ?? []) as Party[];
  const owed = new Map<string, { n: number; left: number }>();
  for (const i of (iRes.data ?? []) as Inv[]) {
    const id = isCus ? i.customer_id : i.supplier_id; if (!id) continue;
    const cur = owed.get(id) ?? { n: 0, left: 0 };
    cur.n += 1; cur.left += toCents(Number(i.total)) - toCents(Number(i.paid)); owed.set(id, cur);
  }
  const rows = all.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.phone ?? "").includes(q));
  const totalLeft = [...owed.values()].reduce((s, v) => s + v.left, 0);
  const withDebt = [...owed.values()].filter((v) => v.left > 0).length;
  const lbl = isCus ? "Pelanggan" : "Pemasok";

  return (
    <>
      <PageHead title="Pelanggan & Pemasok" desc="Daftar kontak usaha Anda beserta tagihan yang belum lunas. Nama baru juga otomatis masuk saat Anda mencatat transaksi." />
      <nav className="chips">
        <a className={isCus ? "on" : ""} href="/parties?t=customers">Pelanggan</a>
        <a className={!isCus ? "on" : ""} href="/parties?t=suppliers">Pemasok</a>
      </nav>
      <div className="kpis">
        <Kpi label={`Jumlah ${lbl.toLowerCase()}`} value={String(all.length)} icon="folder" tone="pri" />
        <Kpi label={isCus ? "Total piutang" : "Total utang"} value={idr(totalLeft)} icon={isCus ? "coin" : "banknote"} tone={totalLeft > 0 ? "neg" : "pos"} hint={withDebt > 0 ? `${withDebt} ${lbl.toLowerCase()} belum lunas` : "Semua lunas"} />
      </div>
      <div className="split">
        <Panel title={`Tambah ${lbl.toLowerCase()}`}><AddPartyForm businessId={biz.id} table={table} /></Panel>
        <Panel title={`Daftar ${lbl.toLowerCase()}`} action={
          <form className="filter inline"><input type="hidden" name="t" value={table} /><input type="search" name="q" defaultValue={q} placeholder="Cari nama/telepon" aria-label="Cari" /><button className="ghost sm">Cari</button></form>
        }>
          {pRes.error ? <Callout tone="warn">Daftar belum dapat dimuat. Coba muat ulang.</Callout> : rows.length === 0 ? (
            <Empty icon="folder" title={q ? "Tidak ditemukan" : `Belum ada ${lbl.toLowerCase()}`} desc={q ? "Coba kata kunci lain." : `Tambah lewat formulir, atau otomatis saat Anda mencatat ${isCus ? "penjualan" : "pembelian"} dengan nama baru.`} />
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Nama</th><th>Kontak</th><th className="num">{isCus ? "Piutang" : "Utang"}</th><th></th></tr></thead>
              <tbody>{rows.map((p) => {
                const o = owed.get(p.id);
                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong>{p.address && <small className="sub">{p.address}</small>}{o && <small className="sub">{o.n} transaksi</small>}</td>
                    <td>{p.phone ?? "–"}{p.email && <small className="sub">{p.email}</small>}</td>
                    <td className="num">{o && o.left > 0 ? <Badge tone="warn">{idr(o.left)}</Badge> : <span className="muted">Lunas</span>}</td>
                    <td><PartyRowActions id={p.id} table={table} name={p.name} phone={p.phone} email={p.email} address={p.address} /></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </Panel>
      </div>
    </>
  );
}
