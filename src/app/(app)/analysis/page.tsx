import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getBalances, getMonthly, idr, sumBy } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { daysBetween, monthShort, todayJakarta } from "@/lib/format";
import { loadHealth } from "@/lib/health";
import { Empty, Kpi, PageHead, Panel, Badge, Callout } from "@/components/ui";
import { Insights } from "@/components/Insights";

type Inv = { type: string; total: number | string; paid: number | string; due_date: string | null; customer_id: string | null; supplier_id: string | null };
type Prod = { name: string; sell_price: number | string; stock_qty: number | string; stock_value: number | string; min_stock: number | string };

const BUCKETS = ["Belum jatuh tempo", "Terlambat 1–30 hari", "Terlambat 31–60 hari", "Terlambat > 60 hari"] as const;
const bucketOf = (late: number) => (late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3);
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "–");

export default async function AnalysisPage() {
  const biz = await getBusiness();
  if (!biz) return (<><PageHead title="Analisis Bisnis" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);
  const sb = await supabaseServer();
  const today = todayJakarta();
  const [health, series, bal, inv, prod, cust, supp] = await Promise.all([
    loadHealth(biz.id),
    getMonthly(biz.id, 6),
    getBalances(biz.id, null, null),
    sb.from("invoices").select("type,total,paid,due_date,customer_id,supplier_id").eq("business_id", biz.id).is("deleted_at", null),
    sb.from("products").select("name,sell_price,stock_qty,stock_value,min_stock").eq("business_id", biz.id).is("deleted_at", null).limit(1000),
    sb.from("customers").select("id,name").eq("business_id", biz.id).limit(2000),
    sb.from("suppliers").select("id,name").eq("business_id", biz.id).limit(2000),
  ]);

  // Rasio dari 6 bulan terakhir (angka jurnal terposting)
  const rev = series.reduce((s, p) => s + p.revenue, 0), cogs = series.reduce((s, p) => s + p.cogs, 0), exp = series.reduce((s, p) => s + p.expense, 0);
  const gross = rev - cogs, net = rev - cogs - exp;

  // Umur piutang/utang + pihak dengan tagihan terbesar
  const aging = { sale: [0, 0, 0, 0], purchase: [0, 0, 0, 0] } as Record<string, number[]>;
  const owed = { sale: new Map<string, number>(), purchase: new Map<string, number>() };
  for (const i of (inv.data ?? []) as Inv[]) {
    const left = toCents(Number(i.total)) - toCents(Number(i.paid));
    if (left <= 0) continue;
    const side = i.type === "sale" ? "sale" : "purchase";
    aging[side][bucketOf(i.due_date ? daysBetween(i.due_date, today) : 0)] += left;
    const pid = side === "sale" ? i.customer_id : i.supplier_id;
    const key = pid ?? "";
    owed[side].set(key, (owed[side].get(key) ?? 0) + left);
  }
  const names = new Map<string, string>([...(cust.data ?? []), ...(supp.data ?? [])].map((r: { id: string; name: string }) => [r.id, r.name]));
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, c]) => ({ name: id ? names.get(id) ?? "(tanpa nama)" : "Tanpa pelanggan/pemasok", c }));

  // Biaya terbesar (saldo akun beban)
  const expenses = bal.filter((r) => r.type === "expense" && r.cents > 0).sort((a, b) => b.cents - a.cents).slice(0, 6);
  const expTotal = sumBy(bal, "expense");

  // Produk: margin dan stok
  const products = ((prod.data ?? []) as Prod[]).map((p) => {
    const q = Number(p.stock_qty), v = Number(p.stock_value), price = Number(p.sell_price);
    const cost = q > 0 ? v / q : null;
    return { name: p.name, q, price, cost, margin: cost != null && price > 0 ? (price - cost) / price : null, low: Number(p.min_stock) > 0 && q <= Number(p.min_stock) };
  });
  const withMargin = products.filter((p) => p.margin != null).sort((a, b) => (a.margin as number) - (b.margin as number));
  const low = products.filter((p) => p.low);

  const hasData = series.some((p) => p.revenue || p.cogs || p.expense) || health.ar > 0 || health.ap > 0 || products.length > 0;
  if (!hasData) return (<><PageHead title="Analisis Bisnis" desc="Ringkasan kondisi usaha dari data Anda." /><Empty icon="chart" title="Belum ada data untuk dianalisis" desc="Catat penjualan, pembelian, atau biaya — analisis muncul otomatis di sini."><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);

  const agingTable = (title: string, rows: number[], empty: string) => (
    <Panel title={title}>
      {rows.every((x) => x === 0) ? <p className="muted sm">{empty}</p> : (
        <div className="table-wrap"><table><thead><tr><th>Umur tagihan</th><th className="num">Jumlah</th></tr></thead><tbody>
          {rows.map((c, k) => <tr key={k}><td>{BUCKETS[k]}</td><td className="num">{idr(c)}</td></tr>)}
          <tr><th>Total</th><th className="num">{idr(rows.reduce((s, x) => s + x, 0))}</th></tr>
        </tbody></table></div>
      )}
    </Panel>
  );
  const topTable = (title: string, rows: { name: string; c: number }[]) => rows.length > 0 && (
    <Panel title={title}><div className="table-wrap"><table><tbody>{rows.map((r, k) => <tr key={k}><td>{r.name}</td><td className="num">{idr(r.c)}</td></tr>)}</tbody></table></div></Panel>
  );

  return (
    <>
      <PageHead title="Analisis Bisnis" desc="Kondisi usaha Anda dibaca langsung dari jurnal dan faktur yang sudah tercatat. Tanpa AI dan tanpa biaya tambahan." />
      <Panel title="Perlu perhatian" desc="Diperbarui setiap halaman dibuka"><Insights items={health.insights} /></Panel>

      <div className="kpis kpis-4 mt">
        <Kpi label="Margin laba kotor (6 bln)" value={pct(gross, rev)} icon="trend" tone={gross >= 0 ? "pos" : "neg"} hint="Sisa dari penjualan setelah modal barang" />
        <Kpi label="Margin laba bersih (6 bln)" value={pct(net, rev)} icon="chart" tone={net >= 0 ? "pos" : "neg"} hint="Sisa setelah semua biaya" />
        <Kpi label="Biaya terhadap penjualan" value={pct(exp, rev)} icon="wallet" hint="Makin kecil makin sehat" />
        <Kpi label="Kas vs utang" value={health.ap > 0 ? `${(health.cash / health.ap).toFixed(1).replace(".", ",")}×` : "Tanpa utang"} icon="coin" tone={health.ap > 0 && health.cash < health.ap ? "neg" : "pos"} hint="Kas dan bank dibanding utang usaha" />
      </div>

      <Panel title="Tren 6 bulan" className="mt" desc="Penjualan, modal barang, biaya, dan laba per bulan">
        <div className="table-wrap"><table><thead><tr><th>Bulan</th><th className="num">Penjualan</th><th className="num">Modal barang</th><th className="num">Biaya</th><th className="num">Laba</th></tr></thead><tbody>
          {series.map((p) => { const n = p.revenue - p.cogs - p.expense; return (
            <tr key={p.month}><td>{monthShort(p.month)}</td><td className="num">{idr(p.revenue)}</td><td className="num">{idr(p.cogs)}</td><td className="num">{idr(p.expense)}</td><td className={`num ${n < 0 ? "neg" : ""}`}>{idr(n)}</td></tr>
          ); })}
        </tbody></table></div>
      </Panel>

      <div className="split mt">
        {agingTable("Umur piutang", aging.sale, "Tidak ada piutang berjalan.")}
        {agingTable("Umur utang", aging.purchase, "Tidak ada utang berjalan.")}
      </div>
      <div className="split mt">
        {topTable("Pelanggan dengan tagihan terbesar", top(owed.sale))}
        {topTable("Pemasok dengan tagihan terbesar", top(owed.purchase))}
      </div>

      {expenses.length > 0 && (
        <Panel title="Biaya terbesar" className="mt" desc="Dari seluruh pencatatan sampai hari ini">
          <div className="table-wrap"><table><thead><tr><th>Jenis biaya</th><th className="num">Jumlah</th><th className="num">Porsi</th></tr></thead><tbody>
            {expenses.map((e) => <tr key={e.account_id}><td>{e.name}</td><td className="num">{idr(e.cents)}</td><td className="num">{pct(e.cents, expTotal)}</td></tr>)}
          </tbody></table></div>
        </Panel>
      )}

      {products.length > 0 && (
        <Panel title="Produk" className="mt" desc="Margin = selisih harga jual dan modal rata-rata, dibanding harga jual">
          {withMargin.length > 0 && (
            <div className="table-wrap"><table><thead><tr><th>Produk</th><th className="num">Harga jual</th><th className="num">Modal rata-rata</th><th className="num">Margin</th></tr></thead><tbody>
              {withMargin.slice(0, 8).map((p, k) => (
                <tr key={k}><td>{p.name}</td><td className="num">{idr(toCents(p.price))}</td><td className="num">{idr(toCents(p.cost as number))}</td>
                  <td className="num">{(p.margin as number) < 0 ? <Badge tone="neg">{pct((p.margin as number) * 100, 100)}</Badge> : pct((p.margin as number) * 100, 100)}</td></tr>
              ))}
            </tbody></table></div>
          )}
          {low.length > 0 && <Callout tone="warn" title="Stok menipis">{low.map((p) => p.name).join(", ")}. <a href="/products">Kelola stok</a></Callout>}
        </Panel>
      )}
    </>
  );
}
