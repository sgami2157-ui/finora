import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, idr, monthRange } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { fmtDate } from "@/lib/format";
import { Badge, Callout, Empty, Kpi, PageHead, Panel, Term } from "@/components/ui";
import PrintSheet from "@/components/PrintSheet";
import PrintButton from "@/components/PrintButton";

const TYPE: Record<string, string> = { asset: "Aset", liability: "Kewajiban", equity: "Ekuitas", revenue: "Pendapatan", cogs: "HPP", expense: "Beban" };
type Row = { ord: number | string; entry_id: string | null; entry_date: string; number: string; description: string | null; memo: string | null; debit: number | string | null; credit: number | string | null; balance: number | string };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ account?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const biz = await getBusiness();
  if (!biz) return <><PageHead title="Buku Besar" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>;
  const sb = await supabaseServer();
  const def = monthRange();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : def.from;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : def.to;

  const { data: accData } = await sb.from("accounts").select("id,code,name,type").eq("business_id", biz.id).eq("is_active", true).order("code");
  const accounts = (accData ?? []) as { id: string; code: string; name: string; type: string }[];
  const acc = accounts.find((a) => a.id === sp.account);
  const res = acc ? await sb.rpc("ledger_report", { p_business: biz.id, p_account: acc.id, p_from: from, p_to: to }) : null;
  const rows = ((res?.data ?? []) as Row[]).map((r) => ({
    ...r, d: toCents(Number(r.debit ?? 0)), c: toCents(Number(r.credit ?? 0)), bal: toCents(Number(r.balance)),
  }));
  const opening = rows.find((r) => Number(r.ord) === 0)?.bal ?? 0;
  const lines = rows.filter((r) => Number(r.ord) !== 0);
  const closing = lines.length ? lines[lines.length - 1].bal : opening;
  const totD = lines.reduce((s, r) => s + r.d, 0), totC = lines.reduce((s, r) => s + r.c, 0);

  return (
    <>
      <div className="screen-only">
        <PageHead title="Buku Besar" desc="Semua catatan pada satu akun, urut tanggal, lengkap dengan saldo berjalan.">
          {acc && <PrintButton />}
        </PageHead>
        <Callout title="Untuk apa?">
          Buku besar menjawab: &ldquo;kenapa saldo akun ini sebesar ini?&rdquo; Pilih akun (misalnya Kas atau Penjualan) untuk melihat setiap transaksi yang membentuk{" "}
          <Term tip="Saldo berjalan: saldo setelah tiap baris transaksi dihitung, sehingga Anda bisa menelusuri dari saldo awal sampai saldo akhir.">saldo berjalan</Term>nya.
        </Callout>
        <form className="filter">
          <label className="field"><span>Akun</span>
            <select name="account" defaultValue={acc?.id ?? ""} required>
              <option value="" disabled>Pilih akun…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Dari</span><input type="date" name="from" defaultValue={from} /></label>
          <label className="field"><span>Sampai</span><input type="date" name="to" defaultValue={to} /></label>
          <button className="primary">Tampilkan</button>
        </form>

        {!acc ? (
          <Empty icon="book" title="Pilih akun terlebih dahulu" desc="Pilih akun dan periode, lalu tekan Tampilkan." />
        ) : res?.error ? (
          <Callout tone="warn">Buku besar belum dapat dimuat. Coba muat ulang halaman.</Callout>
        ) : (
          <>
            <div className="kpis">
              <Kpi label="Saldo awal" value={idr(opening)} icon="clock" hint={fmtDate(from)} />
              <Kpi label="Total debit / kredit" value={`${idr(totD)} / ${idr(totC)}`} icon="transfer" />
              <Kpi label="Saldo akhir" value={idr(closing)} icon="book" tone="pri" hint={<Badge tone="muted">{TYPE[acc.type] ?? acc.type}</Badge>} />
            </div>
            <Panel title={`${acc.code} · ${acc.name}`} desc={`${fmtDate(from)} – ${fmtDate(to)} · ${lines.length} baris`}>
              {lines.length === 0 ? (
                <Empty icon="inbox" title="Tidak ada transaksi pada periode ini" desc="Saldo awal tetap ditampilkan di atas." />
              ) : (
                <div className="table-wrap"><table>
                  <thead><tr><th>Tanggal</th><th>Referensi</th><th>Keterangan</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Saldo</th></tr></thead>
                  <tbody>
                    <tr className="sub"><td colSpan={5}><i>Saldo awal</i></td><td className="num">{idr(opening)}</td></tr>
                    {lines.map((r) => (
                      <tr key={String(r.ord)}>
                        <td>{fmtDate(r.entry_date)}</td>
                        <td><a className="mono link" href="/journal">{r.number}</a></td>
                        <td>{r.description}{r.memo && <small className="sub">{r.memo}</small>}</td>
                        <td className="num">{r.d ? idr(r.d) : ""}</td>
                        <td className="num">{r.c ? idr(r.c) : ""}</td>
                        <td className="num">{idr(r.bal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </Panel>
          </>
        )}
      </div>
      {acc && !res?.error && (
        <PrintSheet business={biz.name} title="BUKU BESAR" subtitle={`${acc.code} ${acc.name} · ${fmtDate(from)} – ${fmtDate(to)}`}>
          <table className="pt">
            <thead><tr><th>Tanggal</th><th>Referensi</th><th>Keterangan</th><th className="num">Debit</th><th className="num">Kredit</th><th className="num">Saldo</th></tr></thead>
            <tbody>
              <tr className="grp"><td colSpan={5}>Saldo awal</td><td className="num">{idr(opening)}</td></tr>
              {lines.map((r) => <tr key={String(r.ord)}><td>{fmtDate(r.entry_date)}</td><td>{r.number}</td><td>{r.description}</td><td className="num">{r.d ? idr(r.d) : ""}</td><td className="num">{r.c ? idr(r.c) : ""}</td><td className="num">{idr(r.bal)}</td></tr>)}
              <tr className="tot"><td colSpan={3}>Total / saldo akhir</td><td className="num">{idr(totD)}</td><td className="num">{idr(totC)}</td><td className="num">{idr(closing)}</td></tr>
            </tbody>
          </table>
        </PrintSheet>
      )}
    </>
  );
}
