import { getBusiness, getBalances, idr, sumBy, monthRange } from "@/lib/data";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const biz = await getBusiness();
  if (!biz) return <p>Buat bisnis terlebih dahulu di <a href="/dashboard"><u>Dashboard</u></a>.</p>;
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

  const row = (l: string, v: number, bold = false) => (
    <tr><td style={{ fontWeight: bold ? 700 : 400 }}>{l}</td><td className="num" style={{ fontWeight: bold ? 700 : 400 }}>{idr(v)}</td></tr>
  );

  return (
    <>
      <h1>Laporan Keuangan</h1>
      <form style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="date" name="from" defaultValue={from} /><input type="date" name="to" defaultValue={to} />
        <button className="primary">Terapkan</button>
      </form>
      <h2>Laba Rugi ({from} – {to})</h2>
      <table><tbody>
        {row("Pendapatan", revenue)}{row("Harga pokok penjualan", cogs)}{row("Laba kotor", revenue - cogs, true)}
        {row("Beban operasional", exp)}{row("Laba bersih", net, true)}
      </tbody></table>
      <h2>Neraca per {to}</h2>
      <table><tbody>
        {row("Total aset", assets, true)}{row("Total kewajiban", liab)}{row("Total ekuitas (termasuk laba berjalan)", eq)}
        {row("Kewajiban + ekuitas", liab + eq, true)}
      </tbody></table>
      <p className={assets === liab + eq ? "pos" : "neg"}>{assets === liab + eq ? "✓ Neraca seimbang" : "✗ Neraca TIDAK seimbang — periksa data"}</p>
      <h2>Neraca Saldo per {to}</h2>
      <table>
        <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
        <tbody>
          {tbRows.map((r) => {
            const isD = debitNormal(r.type) === r.cents >= 0;
            return <tr key={r.account_id}><td>{r.code} {r.name}</td><td className="num">{isD ? idr(Math.abs(r.cents)) : ""}</td><td className="num">{!isD ? idr(Math.abs(r.cents)) : ""}</td></tr>;
          })}
          <tr><td><b>Total</b></td><td className="num"><b>{idr(tbD)}</b></td><td className="num"><b>{idr(tbC)}</b></td></tr>
        </tbody>
      </table>
      <p style={{ color: "var(--secondary)" }}>Belum tersedia: arus kas, buku besar, ekspor PDF/Excel/CSV, simpan ke Google Drive.</p>
    </>
  );
}
