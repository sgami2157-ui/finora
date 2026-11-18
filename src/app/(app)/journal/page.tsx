import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import JournalForm from "./JournalForm";
import ReverseButton from "./ReverseButton";
import { fmtDate } from "@/lib/format";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";

export default async function JournalPage() {
  const biz = await getBusiness();
  if (!biz) return <Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty>;
  const sb = await supabaseServer();
  const [{ data: accounts }, { data: entries }] = await Promise.all([
    sb.from("accounts").select("id,code,name").eq("business_id", biz.id).eq("is_active", true).order("code"),
    sb.from("journal_entries")
      .select("id,number,entry_date,description,status,journal_lines(debit,credit)")
      .eq("business_id", biz.id).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(100),
  ]);

  const tone = (st: string) => (st === "posted" ? "pos" : st === "reversed" ? "neg" : "muted") as "pos" | "neg" | "muted";
  const label = (st: string) => (st === "posted" ? "Tercatat" : st === "reversed" ? "Dibalik" : st === "draft" ? "Draf" : st);
  return (
    <>
      <PageHead title="Jurnal Akuntansi" desc="Catatan lengkap semua transaksi. Total debit harus sama dengan kredit sebelum disimpan." />
      <JournalForm businessId={biz.id} accounts={accounts ?? []} />
      <Panel title="Riwayat jurnal" desc="100 jurnal terbaru, termasuk yang dibuat otomatis dari modul lain">
        {(entries ?? []).length === 0 ? (
          <Empty icon="book" title="Belum ada jurnal" desc="Jurnal muncul di sini setelah Anda memposting jurnal manual atau mencatat transaksi di modul lain." />
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Nomor</th><th>Tanggal</th><th>Keterangan</th><th>Status</th><th className="num">Total</th><th /></tr></thead>
            <tbody>
              {(entries ?? []).map((e) => {
                const total = (e.journal_lines ?? []).reduce((s: number, l: { debit: number | string }) => s + toCents(Number(l.debit)), 0);
                return (
                  <tr key={e.id}>
                    <td><span className="mono">{e.number}</span></td><td>{fmtDate(e.entry_date)}</td><td>{e.description}</td>
                    <td><Badge tone={tone(e.status)}>{label(e.status)}</Badge></td>
                    <td className="num">{idr(total)}</td>
                    <td>{e.status === "posted" && <ReverseButton id={e.id} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </Panel>
    </>
  );
}
