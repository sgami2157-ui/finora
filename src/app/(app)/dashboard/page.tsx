import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getBalances, getMonthly, getPeriods, GRAN_COUNT, idr, sumBy, monthRange, type Gran } from "@/lib/data";
import { fmtDate, greeting, todayJakarta } from "@/lib/format";
import { toCents } from "@/lib/accounting/money";
import CashflowChart from "@/components/CashflowChart";
import HideToggle from "@/components/HideToggle";
import BellMenu from "@/components/BellMenu";
import { Badge, Empty, Kpi, PageHead, Panel, Term } from "@/components/ui";
import { payState } from "@/components/InvoiceModule";
import { Insights } from "@/components/Insights";
import { loadHealth } from "@/lib/health";
import { Icon } from "@/components/Icon";

async function createBusiness(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sb = await supabaseServer();
  const { error } = await sb.rpc("create_business", { p_name: name });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

function delta(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? null : { text: "baru bulan ini", up: cur > 0 };
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  return { text: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(pct))}% vs bulan lalu`, up: pct >= 0 };
}

const RANGES: [Gran, string][] = [["day", "Harian"], ["week", "Mingguan"], ["month", "Bulanan"], ["year", "Tahunan"]];
const KIND: Record<string, string> = { sale: "Penjualan", purchase: "Pembelian", expense: "Biaya" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const gran: Gran = RANGES.some(([k]) => k === sp.range) ? (sp.range as Gran) : "month";
  const biz = await getBusiness();
  if (!biz) {
    return (
      <div className="welcome">
        <Panel>
          <h1>Selamat datang di FINORA</h1>
          <p className="muted">Buat bisnis pertama Anda. Bagan akun standar akan dibuat otomatis, lalu Anda bisa langsung mencatat transaksi.</p>
          <form action={createBusiness} className="form">
            <label className="field"><span>Nama bisnis</span><input name="name" placeholder="Mis. Toko Maju Jaya" required maxLength={80} /></label>
            <button className="primary lg">Buat bisnis</button>
          </form>
        </Panel>
      </div>
    );
  }

  const { from, to } = monthRange();
  const sb = await supabaseServer();
  const cnt = (type: string) => sb.from("invoices").select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("type", type).is("deleted_at", null);
  const [month, all, series, nSale, nExp, nCash, periodsAll, recentRes, userRes] = await Promise.all([
    getBalances(biz.id, from, to), getBalances(biz.id, null, to), getMonthly(biz.id, 6),
    cnt("sale"), cnt("expense"),
    sb.from("accounts").select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("is_active", true).or("code.like.1-11%,code.like.1-12%"),
    getPeriods(biz.id, gran),
    sb.from("invoices").select("id,type,number,issue_date,due_date,total,paid,notes").eq("business_id", biz.id).is("deleted_at", null).order("issue_date", { ascending: false }).order("created_at", { ascending: false }).limit(6),
    sb.auth.getUser(),
  ]);
  const meta = (userRes.data?.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const who = meta.full_name || meta.name || (userRes.data?.user?.email ?? "").split("@")[0] || "";
  const n = GRAN_COUNT[gran];
  const cur = periodsAll.slice(-n), prevP = periodsAll.slice(0, -n);
  const tot = (a: typeof cur, f: (x: (typeof cur)[number]) => number) => a.reduce((t, x) => t + f(x), 0);
  const cfRev = tot(cur, (x) => x.revenue), cfExp = tot(cur, (x) => x.cogs + x.expense), cfNet = tot(cur, (x) => x.cashNet);
  const dCf = delta(cfRev, tot(prevP, (x) => x.revenue));
  const recent = (recentRes.data ?? []) as { id: string; type: string; number: string; issue_date: string; due_date: string | null; total: number | string; paid: number | string; notes: string | null }[];
  const todayStr = todayJakarta();
  const health = await loadHealth(biz.id, { series });
  const steps = [
    { done: (nCash.count ?? 0) > 1, t: "Tambah rekening kas/bank", s: "Tempat uang usaha Anda disimpan. Boleh dengan saldo awal.", href: "/cash" },
    { done: (nSale.count ?? 0) > 0, t: "Catat penjualan pertama", s: "Cukup isi tanggal, pembeli, dan jumlah uang.", href: "/sales" },
    { done: (nExp.count ?? 0) > 0, t: "Catat satu biaya", s: "Mis. sewa, listrik, atau gaji.", href: "/expenses" },
    { done: false, t: "Lihat Laporan Keuangan", s: "Lihat untung atau rugi usaha Anda.", href: "/reports" },
  ];
  const doneCount = steps.slice(0, 3).filter((x) => x.done).length;

  const revenue = sumBy(month, "revenue");
  const cogs = sumBy(month, "cogs");
  const expenses = sumBy(month, "expense");
  const net = revenue - cogs - expenses;
  const kas = all.filter((r) => r.code.startsWith("1-11")).reduce((s, r) => s + r.cents, 0);
  const bank = all.filter((r) => r.code.startsWith("1-12")).reduce((s, r) => s + r.cents, 0);
  const ar = all.find((r) => r.code === "1-1300")?.cents ?? 0;
  const ap = all.find((r) => r.code === "2-1100")?.cents ?? 0;
  const prev = series.length >= 2 ? series[series.length - 2] : null;
  const prevNet = prev ? prev.revenue - prev.cogs - prev.expense : 0;
  const dRev = delta(revenue, prev?.revenue ?? 0);
  const dNet = delta(net, prevNet);

  const topExpenses = month.filter((r) => r.type === "expense" && r.cents > 0).sort((a, b) => b.cents - a.cents).slice(0, 5);
  const maxExp = topExpenses[0]?.cents ?? 1;

  return (
    <>
      <PageHead title={`${greeting()}${who ? ", " + who : ""}`} desc={`${biz.name} · Periode ${fmtDate(from)} – ${fmtDate(to)}`}>
        <HideToggle />
        <BellMenu count={health.insights.length}><Insights items={health.insights} limit={5} /></BellMenu>
      </PageHead>

      <Panel className="summary">
        <p className="summary-text">
          Bulan ini usaha Anda {net >= 0 ? "untung" : "rugi"} <strong className={`amt ${net >= 0 ? "pos" : "neg"}`}>{idr(Math.abs(net))}</strong>
          {revenue > 0 ? <> dari penjualan {idr(revenue)}</> : <> (belum ada penjualan tercatat)</>}.
          {" "}Uang di kas &amp; bank saat ini <strong className="amt">{idr(kas + bank)}</strong>.
        </p>
      </Panel>

      {doneCount < 3 && (
        <Panel className="onboard" title="Mulai dari sini" desc={`${doneCount} dari 3 langkah selesai`}>
          <ol className="steps">
            {steps.map((x, i) => (
              <li key={x.t} className={x.done ? "done" : ""}><span>{x.done ? "✓" : i + 1}</span><div><strong>{x.t}</strong><small>{x.s}</small></div><a className="btn ghost sm" href={x.href}>{x.done ? "Lihat" : "Buka"}</a></li>
            ))}
          </ol>
        </Panel>
      )}

      <div className="kpis kpis-4">
        <Kpi label="Pendapatan bulan ini" value={idr(revenue)} icon="trend" tone="pri" trend={series.map((x) => x.revenue)} hint={dRev && <span className={dRev.up ? "pos" : "neg"}>{dRev.text}</span>} />
        <Kpi label="Untung bersih" value={idr(net)} icon="chart" tone={net >= 0 ? "pos" : "neg"} trend={series.map((x) => x.revenue - x.cogs - x.expense)} hint={dNet && <span className={dNet.up ? "pos" : "neg"}>{dNet.text}</span>} />
        <Kpi label="Kas & bank" value={idr(kas + bank)} icon="wallet" hint={<a href="/cash">Lihat rekening →</a>} />
        <Kpi label="Pengeluaran bulan ini" value={idr(expenses + cogs)} icon="banknote" trend={series.map((x) => x.cogs + x.expense)} />
      </div>

      {revenue > 0 && (() => {
        const pct = (v: number) => Math.max(0, Math.min(100, (v / revenue) * 100));
        const pc = pct(cogs), pe = Math.min(pct(expenses), 100 - pc), pp = Math.max(0, 100 - pc - pe);
        const seg = [["Harga pokok", pc, "cogs", cogs], ["Biaya operasional", pe, "opex", expenses], [net >= 0 ? "Untung" : "", pp, "profit", Math.max(net, 0)]] as const;
        return (
          <Panel title="Ke mana pendapatan bulan ini?" desc="Porsi dari penjualan, berdasarkan jurnal terposting">
            <div className="compose" role="img" aria-label={`Harga pokok ${Math.round(pc)}%, biaya ${Math.round(pe)}%, untung ${Math.round(pp)}% dari pendapatan`}>
              {seg.map(([, w, k]) => w > 0 && <span key={k} className={`seg ${k}`} style={{ width: `${w}%` }} />)}
            </div>
            <ul className="compose-legend">
              {seg.filter(([l, w]) => l && (w as number) > 0).map(([l, w, k, v]) => (
                <li key={k}><i className={`dot ${k}`} />{l} <b>{Math.round(w as number)}%</b> <span className="muted amt">{idr(v as number)}</span></li>
              ))}
            </ul>
            {net < 0 && <p className="muted sm" style={{ marginTop: 8 }}>Pengeluaran melebihi pendapatan bulan ini sehingga tidak ada bagian untung.</p>}
          </Panel>
        );
      })()}

      <div className="split wide-left">
        <Panel title="Arus kas" desc={`${RANGES.find(([k]) => k === gran)![1]} · ${n} periode terakhir`}
          action={<nav className="chips tight" aria-label="Rentang grafik">{RANGES.map(([k, l]) => <a key={k} href={`/dashboard?range=${k}`} className={gran === k ? "on" : ""} aria-current={gran === k ? "true" : undefined}>{l}</a>)}</nav>}>
          {periodsAll.some((p) => p.revenue || p.cogs || p.expense || p.cashNet)
            ? <>
                <div className="cf-sum">
                  <div><small>Pendapatan</small><strong className="amt">{idr(cfRev)}</strong>{dCf && <em className={dCf.up ? "pos" : "neg"}>{dCf.text.replace("bulan lalu", "periode lalu")}</em>}</div>
                  <div><small>Pengeluaran</small><strong className="amt">{idr(cfExp)}</strong></div>
                  <div><small>Arus kas bersih</small><strong className={`amt ${cfNet >= 0 ? "pos" : "neg"}`}>{idr(cfNet)}</strong></div>
                </div>
                <CashflowChart points={cur} gran={gran} />
              </>
            : <Empty icon="chart" title="Belum ada data untuk grafik" desc="Grafik terisi otomatis setelah ada penjualan atau biaya yang tercatat." />}
        </Panel>
        <div className="stack">
          <Panel title="Perlu perhatian" action={<a className="btn ghost sm" href="/analysis">Analisis lengkap</a>}>
            <Insights items={health.insights} limit={3} />
          </Panel>
          <Panel title="Piutang & utang">
            <div className="duo">
              <a href="/receivables" className="duo-item"><small><Term tip="Uang pelanggan yang belum dibayarkan kepada Anda.">Piutang</Term></small><strong className="amt">{idr(ar)}</strong></a>
              <a href="/payables" className="duo-item"><small><Term tip="Tagihan yang masih harus Anda bayar ke pemasok.">Utang</Term></small><strong className="amt">{idr(ap)}</strong></a>
            </div>
          </Panel>
          <Panel title="Biaya terbesar bulan ini">
            {topExpenses.length === 0 ? <p className="muted sm">Belum ada biaya bulan ini.</p> : (
              <ul className="hbars">
                {topExpenses.map((r) => (
                  <li key={r.account_id}>
                    <div><span>{r.name}</span><strong>{idr(r.cents)}</strong></div>
                    <i style={{ width: `${Math.max(4, Math.round((r.cents / maxExp) * 100))}%` }} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <div className="split even mt">
        <Panel title="Transaksi terbaru" action={<a className="btn ghost sm" href="/transactions">Lihat semua</a>}>
          {recent.length === 0 ? <Empty icon="transfer" title="Belum ada transaksi" desc="Transaksi pertama Anda akan muncul di sini." /> : (
            <ul className="txn">
              {recent.map((i) => {
                const st = payState(toCents(Number(i.total)), toCents(Number(i.paid)), i.due_date, todayStr);
                return (
                  <li key={i.id}>
                    <div><strong>{i.notes || KIND[i.type] || i.type}</strong><small>{fmtDate(i.issue_date)} · {KIND[i.type] ?? i.type} · <span className="mono">{i.number}</span></small></div>
                    <div className="txn-r"><span className="amt">{i.type === "sale" ? "+" : "−"} {idr(toCents(Number(i.total)))}</span><Badge tone={st.tone}>{st.label}</Badge></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Aksi cepat">
          <div className="qa">
            {([["/sales", "cart", "Tambah penjualan"], ["/purchases", "bag", "Tambah pembelian"], ["/expenses", "wallet", "Tambah pengeluaran"], ["/receivables", "coin", "Terima pembayaran"], ["/cash", "transfer", "Transfer kas"], ["/journal", "book", "Buat jurnal"]] as const).map(([h, ic, l]) => (
              <a key={h} href={h}><span className="kpi-ico"><Icon name={ic} size={18} /></span>{l}</a>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
