import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getBalances, getMonthly, idr, sumBy, monthRange } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import MonthlyChart from "@/components/MonthlyChart";
import { Empty, Kpi, PageHead, Panel } from "@/components/ui";
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

export default async function Dashboard() {
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
  const [month, all, series] = await Promise.all([getBalances(biz.id, from, to), getBalances(biz.id, null, to), getMonthly(biz.id, 6)]);

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
  const hasActivity = series.some((p) => p.revenue || p.cogs || p.expense) || sumBy(all, "asset") !== 0;

  const topExpenses = month.filter((r) => r.type === "expense" && r.cents > 0).sort((a, b) => b.cents - a.cents).slice(0, 5);
  const maxExp = topExpenses[0]?.cents ?? 1;

  return (
    <>
      <PageHead title="Dashboard" desc={`${biz.name} · ${fmtDate(from)} – ${fmtDate(to)} · dari jurnal yang sudah diposting`}>
        <a className="btn primary" href="/sales"><Icon name="plus" size={16} />Penjualan</a>
        <a className="btn ghost" href="/expenses"><Icon name="plus" size={16} />Biaya</a>
      </PageHead>

      {!hasActivity && (
        <Panel className="onboard">
          <h2>Mulai dari sini</h2>
          <ol className="steps">
            <li><span>1</span><div><strong>Tambah rekening kas/bank</strong><small>Dengan saldo awal bila ada.</small></div><a className="btn ghost sm" href="/cash">Buka</a></li>
            <li><span>2</span><div><strong>Catat penjualan atau biaya pertama</strong><small>Jurnal dibuat otomatis dan seimbang.</small></div><a className="btn ghost sm" href="/sales">Buka</a></li>
            <li><span>3</span><div><strong>Lihat Laporan Keuangan</strong><small>Laba rugi, neraca, dan arus kas.</small></div><a className="btn ghost sm" href="/reports">Buka</a></li>
          </ol>
        </Panel>
      )}

      <div className="kpis kpis-4">
        <Kpi label="Pendapatan bulan ini" value={idr(revenue)} icon="trend" tone="pri" hint={dRev && <span className={dRev.up ? "pos" : "neg"}>{dRev.text}</span>} />
        <Kpi label="Laba bersih" value={idr(net)} icon="chart" tone={net >= 0 ? "pos" : "neg"} hint={dNet && <span className={dNet.up ? "pos" : "neg"}>{dNet.text}</span>} />
        <Kpi label="Kas & bank" value={idr(kas + bank)} icon="wallet" hint={<a href="/cash">Lihat rekening →</a>} />
        <Kpi label="Beban bulan ini" value={idr(expenses + cogs)} icon="banknote" />
      </div>

      <div className="split wide-left">
        <Panel title="Pendapatan vs biaya" desc="6 bulan terakhir">
          {series.some((p) => p.revenue || p.cogs || p.expense)
            ? <MonthlyChart points={series} />
            : <Empty icon="chart" title="Belum ada data untuk grafik" desc="Grafik terisi otomatis setelah ada penjualan atau biaya yang tercatat." />}
        </Panel>
        <div className="stack">
          <Panel title="Piutang & utang">
            <div className="duo">
              <a href="/receivables" className="duo-item"><small>Piutang</small><strong>{idr(ar)}</strong></a>
              <a href="/payables" className="duo-item"><small>Utang</small><strong>{idr(ap)}</strong></a>
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
    </>
  );
}
