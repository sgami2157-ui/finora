import { getBusiness, getBalances, idr, sumBy, monthRange } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { Badge, Callout, Empty, Kpi, PageHead, Panel, Term } from "@/components/ui";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const biz = await getBusiness();
  if (!biz) return <Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty>;
  const sp = await searchParams;
  const def = monthRange();
  const from = sp.from || def.from;
  const to = sp.to || def.to;

  const [period, upto] = await Promise.all([getBalances(biz.id, from, to), getBalances(biz.id, null, to)]);
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
  return (
    <>
      <PageHead title="Laporan Keuangan" desc={`Periode ${fmtDate(from)} – ${fmtDate(to)} · dari jurnal yang sudah diposting.`} />
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
      <p className="note-foot">Belum tersedia: arus kas, buku besar, ekspor PDF/Excel/CSV, simpan ke Google Drive.</p>
    </>
  );
}
