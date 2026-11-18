import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getCashAccounts, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { daysBetween, fmtDate, todayJakarta } from "@/lib/format";
import { Badge, Callout, Empty, Kpi, PageHead, Panel, Term } from "@/components/ui";
import PayForm from "@/components/PayForm";
import PrintButton from "@/components/PrintButton";

const KIND: Record<string, { label: string; back: string; party: string; dir: "in" | "out"; pay: string }> = {
  sale: { label: "Penjualan", back: "/sales", party: "Pelanggan", dir: "in", pay: "Pembayaran diterima" },
  purchase: { label: "Pembelian", back: "/purchases", party: "Pemasok", dir: "out", pay: "Pembayaran dilakukan" },
  expense: { label: "Biaya", back: "/expenses", party: "Vendor", dir: "out", pay: "Pembayaran dilakukan" },
};

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const biz = await getBusiness();
  if (!biz) return <Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty>;
  const sb = await supabaseServer();
  const { data: inv } = await sb.from("invoices")
    .select("id,type,number,issue_date,due_date,customer_id,supplier_id,subtotal,discount,total,paid,notes,journal_entry_id,created_at")
    .eq("id", id).eq("business_id", biz.id).is("deleted_at", null).maybeSingle();
  if (!inv) notFound();
  const k = KIND[inv.type as string] ?? KIND.sale;
  const partyId = (inv.customer_id ?? inv.supplier_id) as string | null;

  const [partyRes, payRes, cash, entryRes] = await Promise.all([
    partyId ? sb.from(inv.type === "sale" ? "customers" : "suppliers").select("name").eq("id", partyId).maybeSingle() : Promise.resolve({ data: null }),
    sb.from("payments").select("id,amount,paid_on,cash_account_id,created_at").eq("business_id", biz.id).eq("invoice_id", id).order("paid_on").order("created_at"),
    getCashAccounts(biz.id),
    inv.journal_entry_id
      ? sb.from("journal_entries").select("id,number,entry_date,description,status").eq("id", inv.journal_entry_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const lines = inv.journal_entry_id
    ? ((await sb.from("journal_lines").select("id,debit,credit,memo,account_id").eq("business_id", biz.id).eq("entry_id", inv.journal_entry_id)).data ?? []) as { id: string; debit: number | string; credit: number | string; memo: string | null; account_id: string }[]
    : [];
  const accIds = lines.map((l) => l.account_id);
  const accs = accIds.length ? ((await sb.from("accounts").select("id,code,name").eq("business_id", biz.id).in("id", accIds)).data ?? []) as { id: string; code: string; name: string }[] : [];
  const accOf = new Map(accs.map((a) => [a.id, a]));
  const cashName = new Map(cash.map((c) => [c.id, c.name]));

  const total = toCents(Number(inv.total)), paid = toCents(Number(inv.paid)), left = total - paid;
  const today = todayJakarta();
  const late = left > 0 && inv.due_date && daysBetween(inv.due_date as string, today) > 0;
  const badge = left <= 0 ? <Badge tone="pos">Lunas</Badge> : late ? <Badge tone="neg">Terlambat {daysBetween(inv.due_date as string, today)} hari</Badge> : <Badge tone="warn">{paid > 0 ? "Dibayar sebagian" : "Belum dibayar"}</Badge>;
  const payments = (payRes.data ?? []) as { id: string; amount: number | string; paid_on: string; cash_account_id: string }[];
  const entry = entryRes.data as { id: string; number: string; entry_date: string; description: string; status: string } | null;

  return (
    <div className="print-area">
      <PageHead title={`${k.label} ${inv.number}`} desc={`Tanggal ${fmtDate(inv.issue_date as string)}${inv.due_date ? ` · jatuh tempo ${fmtDate(inv.due_date as string)}` : ""}`}>
        <a className="btn ghost" href={k.back}>← Kembali</a>
        <PrintButton label="Cetak / simpan PDF" />
      </PageHead>
      <div className="kpis">
        <Kpi label="Total tagihan" value={idr(total)} icon="coin" tone="pri" hint={badge} />
        <Kpi label={k.pay} value={idr(paid)} icon="check" tone="pos" />
        <Kpi label="Sisa" value={idr(left)} icon="clock" tone={left > 0 ? "neg" : "pos"} hint={left > 0 ? "Belum dilunasi" : "Sudah lunas"} />
      </div>
      <div className="split">
        <Panel title="Rincian">
          <dl className="detail">
            <div><dt>{k.party}</dt><dd>{(partyRes.data as { name: string } | null)?.name ?? "–"}</dd></div>
            <div><dt>Subtotal</dt><dd>{idr(toCents(Number(inv.subtotal)))}</dd></div>
            <div><dt>Diskon</dt><dd>{idr(toCents(Number(inv.discount)))}</dd></div>
            <div><dt>Total</dt><dd><b>{idr(total)}</b></dd></div>
            {inv.notes && <div><dt>Catatan</dt><dd>{inv.notes as string}</dd></div>}
          </dl>
          {left > 0 && (
            <div className="noprint" style={{ marginTop: 14 }}>
              <PayForm invoiceId={id} outstanding={left / 100} cashAccounts={cash.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))} direction={k.dir} />
            </div>
          )}
        </Panel>
        <Panel title="Riwayat pembayaran">
          {payments.length === 0 ? <p className="muted sm">Belum ada pembayaran.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Tanggal</th><th>Rekening</th><th className="num">Jumlah</th></tr></thead>
              <tbody>{payments.map((p) => <tr key={p.id}><td>{fmtDate(p.paid_on)}</td><td>{cashName.get(p.cash_account_id) ?? "–"}</td><td className="num">{idr(toCents(Number(p.amount)))}</td></tr>)}</tbody>
            </table></div>
          )}
        </Panel>
      </div>
      <Panel title="Catatan akuntansi (jurnal)" desc={entry ? `${entry.number} · ${fmtDate(entry.entry_date)}` : undefined} className="mt">
        {!entry || lines.length === 0 ? <p className="muted sm">Tidak ada jurnal terkait.</p> : (
          <>
            <Callout title="Apa ini?">
              Setiap transaksi dicatat otomatis dalam dua sisi, <Term tip="Debit menambah aset/biaya; kredit menambah pendapatan/utang/modal. Totalnya selalu sama.">debit dan kredit</Term>, agar pembukuan seimbang. Anda tidak perlu mengisinya sendiri. <a href="/journal">Lihat semua jurnal</a>.
            </Callout>
            <div className="table-wrap"><table>
              <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
              <tbody>{lines.map((l) => {
                const a = accOf.get(l.account_id); const d = toCents(Number(l.debit)), c = toCents(Number(l.credit));
                return <tr key={l.id}><td><span className="mono">{a?.code}</span> {a?.name ?? "–"}</td><td className="num">{d ? idr(d) : ""}</td><td className="num">{c ? idr(c) : ""}</td></tr>;
              })}</tbody>
            </table></div>
          </>
        )}
      </Panel>
    </div>
  );
}
