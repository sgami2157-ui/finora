import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import JournalForm from "./JournalForm";
import ReverseButton from "./ReverseButton";

export default async function JournalPage() {
  const biz = await getBusiness();
  if (!biz) return <p>Buat bisnis terlebih dahulu di <a href="/dashboard"><u>Dashboard</u></a>.</p>;
  const sb = await supabaseServer();
  const [{ data: accounts }, { data: entries }] = await Promise.all([
    sb.from("accounts").select("id,code,name").eq("business_id", biz.id).eq("is_active", true).order("code"),
    sb.from("journal_entries")
      .select("id,number,entry_date,description,status,journal_lines(debit,credit)")
      .eq("business_id", biz.id).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <>
      <h1>Jurnal Akuntansi</h1>
      <JournalForm businessId={biz.id} accounts={accounts ?? []} />
      <h2>Riwayat jurnal</h2>
      {(entries ?? []).length === 0 ? <p>Belum ada jurnal.</p> : (
        <table>
          <thead><tr><th>Nomor</th><th>Tanggal</th><th>Keterangan</th><th>Status</th><th className="num">Total</th><th /></tr></thead>
          <tbody>
            {(entries ?? []).map((e) => {
              const total = (e.journal_lines ?? []).reduce((s: number, l: { debit: number | string }) => s + toCents(Number(l.debit)), 0);
              return (
                <tr key={e.id}>
                  <td>{e.number}</td><td>{e.entry_date}</td><td>{e.description}</td><td>{e.status}</td>
                  <td className="num">{idr(total)}</td>
                  <td>{e.status === "posted" && <ReverseButton id={e.id} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
