import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getCashAccounts, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { fmtDate } from "@/lib/format";
import { NewCashAccountForm, OwnerEquityForm, TransferForm } from "@/components/CashForms";
import { Badge, Empty, Kpi, PageHead, Panel } from "@/components/ui";
import { Icon } from "@/components/Icon";

type Line = { entry_id: string; account_id: string; debit: number | string; credit: number | string };
type Entry = { id: string; entry_date: string; description: string | null; number: string };

export default async function CashPage({ searchParams }: { searchParams: Promise<{ jenis?: string }> }) {
  const { jenis } = await searchParams;
  const biz = await getBusiness();
  if (!biz) {
    return (<><PageHead title="Kas & Bank" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);
  }
  const accounts = await getCashAccounts(biz.id);
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const bankTotal = accounts.filter((a) => a.kind === "bank").reduce((s, a) => s + a.balance, 0);

  // Riwayat setoran modal & penarikan pemilik (nomor jurnal MD-/PV-)
  const sbq = await supabaseServer();
  const { data: eqRows } = await sbq.from("journal_entries").select("id,entry_date,number,description").eq("business_id", biz.id).or("number.like.MD-%,number.like.PV-%").order("entry_date", { ascending: false }).limit(8);
  const eqIds = (eqRows ?? []).map((r) => r.id);
  const { data: eqLines } = eqIds.length ? await sbq.from("journal_lines").select("entry_id,debit,credit").in("entry_id", eqIds).limit(100) : { data: [] as { entry_id: string; debit: number | string; credit: number | string }[] };
  const eqAmt = new Map<string, number>();
  for (const l of eqLines ?? []) eqAmt.set(l.entry_id, Math.max(eqAmt.get(l.entry_id) ?? 0, toCents(Number(l.debit)), toCents(Number(l.credit))));

  // Mutasi terbaru pada rekening kas/bank (tanpa embed, dua query sederhana).
  let moves: { entry: Entry; delta: number; account: string }[] = [];
  if (accounts.length > 0) {
    const sb = await supabaseServer();
    const ids = accounts.map((a) => a.account_id);
    const { data: lines } = await sb.from("journal_lines").select("entry_id,account_id,debit,credit").eq("business_id", biz.id).in("account_id", ids).limit(400);
    const entryIds = Array.from(new Set(((lines ?? []) as Line[]).map((l) => l.entry_id)));
    if (entryIds.length > 0) {
      const { data: entries } = await sb.from("journal_entries").select("id,entry_date,description,number,status").eq("business_id", biz.id).in("id", entryIds).in("status", ["posted", "reversed"]).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(15);
      const eMap = new Map(((entries ?? []) as Entry[]).map((e) => [e.id, e]));
      const nameOf = new Map(accounts.map((a) => [a.account_id, a.name]));
      moves = ((lines ?? []) as Line[]).filter((l) => eMap.has(l.entry_id)).map((l) => ({
        entry: eMap.get(l.entry_id)!, delta: toCents(Number(l.debit)) - toCents(Number(l.credit)), account: nameOf.get(l.account_id) ?? "",
      }));
      moves.sort((a, b) => (a.entry.entry_date < b.entry.entry_date ? 1 : a.entry.entry_date > b.entry.entry_date ? -1 : 0));
    }
  }

  return (
    <>
      <PageHead title="Kas & Bank" desc="Saldo setiap rekening dihitung dari transaksi yang sudah tercatat." />
      <div className="kpis">
        <Kpi label="Total kas & bank" value={idr(total)} icon="wallet" tone="pri" hint={`${accounts.length} rekening aktif`} />
        <Kpi label="Di rekening bank" value={idr(bankTotal)} icon="bank" />
      </div>

      <div className="split">
        <div className="stack">
          <Panel title="Rekening">
            {accounts.length === 0 ? (
              <Empty icon="bank" title="Belum ada rekening" desc="Tambahkan kas tunai atau rekening bank untuk mulai mencatat penerimaan dan pembayaran." />
            ) : (
              <ul className="rows">
                {accounts.map((a) => (
                  <li key={a.id} className="row-card">
                    <div className="row-main">
                      <div className="acc-id">
                        <span className="kpi-ico"><Icon name={a.kind === "bank" ? "bank" : "banknote"} size={18} /></span>
                        <div>
                          <strong>{a.name}</strong>
                          <small className="sub">{a.kind === "bank" ? [a.bank_name, a.account_number].filter(Boolean).join(" · ") || "Rekening bank" : "Kas tunai"}</small>
                        </div>
                      </div>
                      <div className="row-amt"><strong className={a.balance < 0 ? "neg" : ""}>{idr(a.balance)}</strong></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Mutasi terbaru" desc="Pergerakan pada rekening di atas">
            {moves.length === 0 ? (
              <Empty icon="transfer" title="Belum ada mutasi" desc="Penerimaan, pembayaran, dan transfer akan tercatat di sini." />
            ) : (
              <div className="table-wrap"><table>
                <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Rekening</th><th className="num">Jumlah</th></tr></thead>
                <tbody>{moves.slice(0, 15).map((m, i) => (
                  <tr key={m.entry.id + i}>
                    <td>{fmtDate(m.entry.entry_date)}</td>
                    <td>{m.entry.description ?? m.entry.number}</td>
                    <td>{m.account}</td>
                    <td className="num"><Badge tone={m.delta >= 0 ? "pos" : "neg"}>{m.delta >= 0 ? "+" : "−"} {idr(Math.abs(m.delta))}</Badge></td>
                  </tr>))}
                </tbody>
              </table></div>
            )}
          </Panel>
        </div>
        <div className="stack">
          {accounts.length > 0 && (
            <div id="pemilik"><Panel title="Modal & penarikan pemilik" desc="Setor modal ke usaha atau tarik uang ke rekening pribadi">
              <OwnerEquityForm businessId={biz.id} accounts={accounts.map((a) => ({ id: a.id, name: a.name, balance: a.balance }))} defaultKind={jenis === "tarik" ? "drawing" : "capital"} />
              {(eqRows ?? []).length > 0 && (
                <div className="table-wrap" style={{ marginTop: 12 }}><table>
                  <thead><tr><th>Tanggal</th><th>Keterangan</th><th className="num">Jumlah</th></tr></thead>
                  <tbody>{(eqRows ?? []).map((r) => (
                    <tr key={r.id}><td>{fmtDate(r.entry_date)}</td><td>{r.description}</td>
                      <td className="num"><Badge tone={r.number.startsWith("MD-") ? "pos" : "neg"}>{r.number.startsWith("MD-") ? "+" : "−"} {idr(eqAmt.get(r.id) ?? 0)}</Badge></td></tr>
                  ))}</tbody>
                </table></div>
              )}
            </Panel></div>
          )}
          <Panel title="Tambah rekening"><NewCashAccountForm businessId={biz.id} /></Panel>
          {accounts.length >= 2 && <Panel title="Transfer antar rekening"><TransferForm businessId={biz.id} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} /></Panel>}
        </div>
      </div>
    </>
  );
}
