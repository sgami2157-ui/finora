import { Fragment } from "react";
import { getBusiness, getBalances, idr, sumBy, monthRange } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { Badge, Callout, Empty, Kpi, PageHead, Panel, Term } from "@/components/ui";
import PrintButton from "@/components/PrintButton";
import PrintSheet from "@/components/PrintSheet";
import { supabaseServer } from "@/lib/supabase/server";
import { toCents } from "@/lib/accounting/money";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const biz = await getBusiness();
  if (!biz) return <Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty>;
  const sp = await searchParams;
  const def = monthRange();
  const from = sp.from || def.from;
  const to = sp.to || def.to;

  const sb = await supabaseServer();
  const [period, upto, cfRes] = await Promise.all([
    getBalances(biz.id, from, to), getBalances(biz.id, null, to),
    sb.rpc("cashflow_report", { p_business: biz.id, p_from: from, p_to: to }),
  ]);
  const cf = ((cfRes.data ?? []) as { section: string; label: string; amount: number | string }[]).map((r) => ({ ...r, cents: toCents(Number(r.amount)) }));
  const cfOpen = cf.find((r) => r.label.startsWith("Saldo kas & bank awal"))?.cents ?? 0;
  const cfClose = cf.find((r) => r.label.startsWith("Saldo kas & bank akhir"))?.cents ?? 0;
  const cfSec = (k: string) => cf.filter((r) => r.section === k);
  const cfSum = (k: string) => cfSec(k).reduce((s, r) => s + r.cents, 0);
  const cfNet = cfSum("operasi") + cfSum("investasi") + cfSum("pendanaan");
  const revenue = sumBy(period, "revenue"), cogs = sumBy(period, "cogs"), exp = sumBy(period, "expense");
  const net = revenue - cogs - exp;
  const assets = sumBy(upto, "asset"), liab = sumBy(upto, "liability");
  const eq = sumBy(upto, "equity") + sumBy(upto, "revenue") - sumBy(upto, "cogs") - sumBy(upto, "expense");
  const tbRows = upto.filter((r) => r.cents !== 0);
  const debitNormal = (t: string) => ["asset", "expense", "cogs"].includes(t);
  const tbD = tbRows.reduce((s, r) => s + (debitNormal(r.type) === r.cents >= 0 ? Math.abs(r.cents) : 0), 0);
  const tbC = tbRows.reduce((s, r) => s + (debitNormal(r.type) === r.cents >= 0 ? 0 : Math.abs(r.cents)), 0);

  const row = (l: string, v: number, bold = false, tip?: string) => (
    <tr><td style={{ fontWeight: bold ? 700 : 400 }}>{tip ? <Term tip={tip}>{l}</Term> : l}</td><td className="num" style={{ fontWeight: bold ? 700 : 400 }}>{idr(v)}</td></tr>
  );

  const balanced = assets === liab + eq;
  const pr = (l: string, v: number, bold = false) => <tr className={bold ? "tot" : undefined}><td>{l}</td><td className="num">{idr(v)}</td></tr>;
  return (
    <>
    <div className="screen-only">
      <PageHead title="Laporan Keuangan" desc={`Periode ${fmtDate(from)} – ${fmtDate(to)} · dari jurnal yang sudah diposting.`}>
        <a className="btn ghost" href={`/api/export/balances?from=${from}&to=${to}`} download>Unduh CSV (saldo akun)</a>
        <PrintButton />
      </PageHead>
      <Callout title="Cara membaca laporan ini">
        <b>Laba Rugi</b> menjawab: &ldquo;sepanjang periode ini saya untung atau rugi?&rdquo; <b>Neraca</b> menjawab: &ldquo;apa saja yang dimiliki usaha dan apa yang masih menjadi utang?&rdquo; Anda tidak perlu menghafal istilahnya; tanda <b>?</b> menjelaskan setiap istilah.
      </Callout>
      <form className="filter">
        <label className="field"><span>Dari</span><input type="date" name="from" defaultValue={from} /></label>
        <label className="field"><span>Sampai</span><input type="date" name="to" defaultValue={to} /></label>
        <button className="primary">Terapkan</button>
      </form>
      <div className="kpis">
        <Kpi label="Pendapatan" value={idr(revenue)} icon="trend" tone="pri" />
        <Kpi label="Untung bersih" value={idr(net)} icon="chart" tone={net >= 0 ? "pos" : "neg"} />
        <Kpi label="Total aset" value={idr(assets)} icon="wallet" hint={<Badge tone={balanced ? "pos" : "neg"}>{balanced ? "Neraca seimbang" : "Neraca TIDAK seimbang"}</Badge>} />
      </div>
      <div className="split even">
        <Panel title="Laba Rugi (untung atau rugi)" desc={`${fmtDate(from)} – ${fmtDate(to)}`}>
          <div className="table-wrap"><table><tbody>
            {row("Pendapatan", revenue, false, "Total uang dari penjualan sebelum dikurangi apa pun.")}{row("Harga pokok penjualan", cogs, false, "Modal barang yang sudah terjual (HPP).")}{row("Laba kotor", revenue - cogs, true, "Pendapatan dikurangi modal barang. Belum dikurangi biaya operasional.")}
            {row("Beban operasional", exp, false, "Biaya menjalankan usaha: sewa, listrik, gaji, dll.")}{row("Laba bersih", net, true, "Yang benar-benar tersisa setelah semua biaya. Negatif berarti rugi.")}
          </tbody></table></div>
        </Panel>
        <Panel title="Neraca (kekayaan usaha)" desc={`Per ${fmtDate(to)}`}>
          <div className="table-wrap"><table><tbody>
            {row("Total aset", assets, true, "Semua yang dimiliki usaha: uang, stok barang, tagihan ke pelanggan.")}{row("Total kewajiban", liab, false, "Semua yang masih harus dibayar usaha, misalnya utang ke pemasok.")}{row("Total ekuitas (termasuk laba berjalan)", eq, false, "Bagian kekayaan milik pemilik: modal ditambah untung yang ditahan.")}
            {row("Kewajiban + ekuitas", liab + eq, true)}
          </tbody></table></div>
        </Panel>
      </div>
      <Panel title="Arus Kas (uang masuk dan keluar)" desc={`${fmtDate(from)} – ${fmtDate(to)} · hanya pergerakan kas dan bank`} className="mt">
        {cfRes.error ? <Callout tone="warn">Laporan arus kas belum dapat dimuat. Coba muat ulang halaman.</Callout> : cf.length <= 2 && cfNet === 0 ? (
          <Empty icon="wallet" title="Belum ada uang masuk atau keluar" desc="Arus kas terisi setelah ada transaksi yang melibatkan kas atau bank pada periode ini." />
        ) : (
          <div className="table-wrap"><table><tbody>
            {([["operasi", "Dari kegiatan usaha", "Uang masuk dan keluar dari jualan, beli barang, dan biaya harian."], ["investasi", "Dari investasi", "Membeli atau menjual peralatan jangka panjang."], ["pendanaan", "Dari pendanaan", "Modal yang Anda setor, penarikan pemilik, dan pinjaman."]] as const).map(([k, title, tip]) => cfSec(k).length > 0 && (
              <Fragment key={k}>
                <tr><td colSpan={2}><b><Term tip={tip}>{title}</Term></b></td></tr>
                {cfSec(k).map((r) => <tr key={r.label}><td style={{ paddingLeft: 20 }}>{r.label}</td><td className="num">{idr(r.cents)}</td></tr>)}
              </Fragment>
            ))}
            {row("Perubahan kas bersih", cfNet, true, "Total uang masuk dikurangi total uang keluar pada periode ini.")}
            {row("Saldo kas & bank awal", cfOpen)}
            {row("Saldo kas & bank akhir", cfClose, true)}
          </tbody></table></div>
        )}
        {cfOpen + cfNet !== cfClose && <Callout tone="warn" title="Ada selisih">Saldo awal ditambah perubahan tidak sama dengan saldo akhir; mohon periksa jurnal pada periode ini.</Callout>}
      </Panel>
      <Panel title="Neraca Saldo (untuk akuntan)" desc={`Per ${fmtDate(to)}`} className="mt">
        {tbRows.length === 0 ? <Empty icon="scale" title="Belum ada saldo" desc="Neraca saldo terisi setelah ada jurnal yang diposting." /> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
            <tbody>
              {tbRows.map((r) => {
                const isD = debitNormal(r.type) === r.cents >= 0;
                return <tr key={r.account_id}><td><span className="mono">{r.code}</span> {r.name}</td><td className="num">{isD ? idr(Math.abs(r.cents)) : ""}</td><td className="num">{!isD ? idr(Math.abs(r.cents)) : ""}</td></tr>;
              })}
              <tr><td><b>Total</b></td><td className="num"><b>{idr(tbD)}</b></td><td className="num"><b>{idr(tbC)}</b></td></tr>
            </tbody>
          </table></div>
        )}
      </Panel>
      <p className="note-foot">Belum tersedia: buku besar per akun, ekspor Excel, dan simpan ke Google Drive. Untuk PDF, gunakan Cetak lalu pilih “Simpan sebagai PDF”.</p>
    </div>
    <PrintSheet business={biz.name} title="LAPORAN KEUANGAN" subtitle={`${fmtDate(from)} – ${fmtDate(to)}`}>
      <h3 className="pd-h">Laba Rugi</h3>
      <table className="pt"><tbody>
        {pr("Pendapatan", revenue)}{pr("Harga pokok penjualan", cogs)}{pr("Laba kotor", revenue - cogs, true)}{pr("Beban operasional", exp)}{pr("Laba bersih", net, true)}
      </tbody></table>
      <h3 className="pd-h">Neraca per {fmtDate(to)}</h3>
      <table className="pt"><tbody>
        {pr("Total aset", assets, true)}{pr("Total kewajiban", liab)}{pr("Total ekuitas (termasuk laba berjalan)", eq)}{pr("Kewajiban + ekuitas", liab + eq, true)}
      </tbody></table>
      <h3 className="pd-h">Arus Kas</h3>
      <table className="pt"><tbody>
        {(["operasi", "investasi", "pendanaan"] as const).map((k) => cfSec(k).length > 0 && (
          <Fragment key={k}>
            <tr className="grp"><td colSpan={2}>{k === "operasi" ? "Dari kegiatan usaha" : k === "investasi" ? "Dari investasi" : "Dari pendanaan"}</td></tr>
            {cfSec(k).map((r) => <tr key={r.label}><td className="ind">{r.label}</td><td className="num">{idr(r.cents)}</td></tr>)}
          </Fragment>
        ))}
        {pr("Perubahan kas bersih", cfNet, true)}{pr("Saldo kas & bank awal", cfOpen)}{pr("Saldo kas & bank akhir", cfClose, true)}
      </tbody></table>
      {tbRows.length > 0 && (
        <>
          <h3 className="pd-h">Neraca Saldo per {fmtDate(to)}</h3>
          <table className="pt">
            <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
            <tbody>
              {tbRows.map((r) => { const isD = debitNormal(r.type) === r.cents >= 0; return <tr key={r.account_id}><td>{r.code} {r.name}</td><td className="num">{isD ? idr(Math.abs(r.cents)) : ""}</td><td className="num">{!isD ? idr(Math.abs(r.cents)) : ""}</td></tr>; })}
              <tr className="tot"><td>Total</td><td className="num">{idr(tbD)}</td><td className="num">{idr(tbC)}</td></tr>
            </tbody>
          </table>
        </>
      )}
    </PrintSheet>
    </>
  );
}
