import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getCashAccounts, idr, monthRange } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { daysBetween, fmtDate, todayJakarta } from "@/lib/format";
import InvoiceForm, { type Kind } from "./InvoiceForm";
import SaleItemsForm from "./SaleItemsForm";
import SaleSwitcher from "./SaleSwitcher";
import { Badge, Callout, Empty, Kpi, PageHead, Panel } from "./ui";
import type { IconName } from "./Icon";

type Inv = {
  id: string; number: string; issue_date: string; due_date: string | null; total: number | string; paid: number | string;
  notes: string | null; customer_id: string | null; supplier_id: string | null;
};

const CFG: Record<Kind, { title: string; desc: string; icon: IconName; monthLabel: string; openLabel: string; formTitle: string; empty: string; party: string }> = {
  sale: { title: "Penjualan", desc: "Catat penjualan. Jurnal (piutang/kas, pendapatan, diskon) dibuat otomatis.", icon: "cart", monthLabel: "Penjualan bulan ini", openLabel: "Piutang berjalan", formTitle: "Penjualan baru", empty: "Belum ada penjualan. Catat penjualan pertama Anda lewat formulir.", party: "Pelanggan" },
  purchase: { title: "Pembelian", desc: "Catat pembelian barang/bahan. Dicatat ke akun persediaan atau aset yang Anda pilih.", icon: "bag", monthLabel: "Pembelian bulan ini", openLabel: "Utang berjalan", formTitle: "Pembelian baru", empty: "Belum ada pembelian. Catat pembelian pertama Anda lewat formulir.", party: "Pemasok" },
  expense: { title: "Biaya Operasional", desc: "Catat biaya usaha seperti sewa, listrik, gaji, dan transportasi.", icon: "wallet", monthLabel: "Biaya bulan ini", openLabel: "Biaya belum dibayar", formTitle: "Biaya baru", empty: "Belum ada biaya. Catat biaya pertama Anda lewat formulir.", party: "Vendor" },
};

export function payState(total: number, paid: number, due: string | null, today: string) {
  if (paid >= total) return { label: "Lunas", tone: "pos" as const };
  const late = due && daysBetween(due, today) > 0;
  if (late) return { label: paid > 0 ? "Sebagian · terlambat" : "Terlambat", tone: "neg" as const };
  return { label: paid > 0 ? "Sebagian" : "Belum dibayar", tone: "warn" as const };
}

export default async function InvoiceModule({ kind }: { kind: Kind }) {
  const cfg = CFG[kind];
  const biz = await getBusiness();
  if (!biz) {
    return (
      <>
        <PageHead title={cfg.title} desc={cfg.desc} />
        <Empty icon="inbox" title="Buat bisnis terlebih dahulu" desc="Modul ini butuh bisnis dan bagan akun.">
          <a className="btn primary" href="/dashboard">Ke Dashboard</a>
        </Empty>
      </>
    );
  }

  const sb = await supabaseServer();
  const today = todayJakarta();
  const { from, to } = monthRange();
  const partyTable = kind === "sale" ? "customers" : "suppliers";

  const [cashAccounts, accRes, listRes, monthRes, openRes, partyRes, prodRes] = await Promise.all([
    getCashAccounts(biz.id),
    sb.from("accounts").select("id,code,name,type").eq("business_id", biz.id).eq("is_active", true).order("code"),
    sb.from("invoices").select("id,number,issue_date,due_date,total,paid,notes,customer_id,supplier_id")
      .eq("business_id", biz.id).eq("type", kind).is("deleted_at", null)
      .order("issue_date", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    sb.from("invoices").select("total").eq("business_id", biz.id).eq("type", kind).is("deleted_at", null).gte("issue_date", from).lte("issue_date", to),
    sb.from("invoices").select("total,paid").eq("business_id", biz.id).eq("type", kind).is("deleted_at", null),
    sb.from(partyTable).select("id,name").eq("business_id", biz.id).is("deleted_at", null).order("name").limit(500),
    kind === "sale"
      ? sb.from("products").select("id,name,sell_price,stock_qty").eq("business_id", biz.id).is("deleted_at", null).order("name").limit(500)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const products = ((prodRes.data ?? []) as { id: string; name: string; sell_price: number | string; stock_qty: number | string }[])
    .map((p) => ({ id: p.id, name: p.name, sell_price: Number(p.sell_price), stock_qty: Number(p.stock_qty) }));

  const accounts = ((accRes.data ?? []) as { id: string; code: string; name: string; type: string }[]).filter((a) =>
    kind === "purchase"
      ? a.type === "asset" && !a.code.startsWith("1-11") && !a.code.startsWith("1-12") && a.code !== "1-1300"
      : kind === "expense" ? a.type === "expense" : false,
  );
  const invoices = (listRes.data ?? []) as Inv[];
  const parties = (partyRes.data ?? []) as { id: string; name: string }[];
  const nameOf = new Map(parties.map((p) => [p.id, p.name]));

  const monthTotal = ((monthRes.data ?? []) as { total: number | string }[]).reduce((s, r) => s + toCents(Number(r.total)), 0);
  const open = ((openRes.data ?? []) as { total: number | string; paid: number | string }[])
    .reduce((s, r) => s + toCents(Number(r.total)) - toCents(Number(r.paid)), 0);

  return (
    <>
      <PageHead title={cfg.title} desc={cfg.desc} />
      {kind === "purchase" && (
        <Callout title="Membeli barang untuk dijual lagi?">
          Gunakan <a href="/products">Produk &amp; Persediaan → Tambah stok</a> agar stok dan modal barang (HPP) terhitung otomatis. Halaman ini untuk pembelian lain, misalnya peralatan.
        </Callout>
      )}
      <div className="kpis">
        <Kpi label={cfg.monthLabel} value={idr(monthTotal)} icon={cfg.icon} tone="pri" hint={`${monthRes.data?.length ?? 0} transaksi`} />
        <Kpi label={cfg.openLabel} value={idr(open)} icon="clock" tone={open > 0 ? undefined : "pos"} hint={open > 0 ? "Menunggu pelunasan" : "Semua lunas"} />
      </div>

      <div className="split">
        <Panel title={cfg.formTitle}>
          {kind === "sale" && products.some((p) => p.stock_qty > 0) ? (
            <SaleSwitcher
              items={<SaleItemsForm businessId={biz.id} products={products} cashAccounts={cashAccounts} parties={parties.map((p) => p.name)} />}
              plain={<InvoiceForm kind={kind} businessId={biz.id} cashAccounts={cashAccounts} accounts={accounts} parties={parties.map((p) => p.name)} />}
            />
          ) : (
            <InvoiceForm kind={kind} businessId={biz.id} cashAccounts={cashAccounts} accounts={accounts} parties={parties.map((p) => p.name)} />
          )}
        </Panel>
        <Panel title="Riwayat" desc="100 transaksi terbaru">
          {invoices.length === 0 ? (
            <Empty icon={cfg.icon} title="Belum ada data" desc={cfg.empty} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nomor</th><th>Tanggal</th><th>{cfg.party}</th><th className="num">Total</th><th>Status</th></tr></thead>
                <tbody>
                  {invoices.map((i) => {
                    const total = toCents(Number(i.total)), paid = toCents(Number(i.paid));
                    const st = payState(total, paid, i.due_date, today);
                    const pid = i.customer_id ?? i.supplier_id;
                    return (
                      <tr key={i.id}>
                        <td><a href={`/invoices/${i.id}`} className="mono link">{i.number}</a>{i.notes && <small className="sub">{i.notes}</small>}</td>
                        <td>{fmtDate(i.issue_date)}</td>
                        <td>{pid ? nameOf.get(pid) ?? "–" : "–"}</td>
                        <td className="num">{idr(total)}</td>
                        <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
