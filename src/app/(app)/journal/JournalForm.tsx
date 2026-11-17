"use client";
import { todayJakarta } from "@/lib/format";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type Acc = { id: string; code: string; name: string };
type Line = { account_id: string; debit: string; credit: string };
const empty = (): Line => ({ account_id: "", debit: "", credit: "" });

export default function JournalForm({ businessId, accounts }: { businessId: string; accounts: Acc[] }) {
  const router = useRouter();
  const today = todayJakarta();
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([empty(), empty()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const d = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const c = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = d > 0 && Math.round(d * 100) === Math.round(c * 100);

  const set = (i: number, patch: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!balanced) return setError("Total debit harus sama dengan total kredit.");
    setBusy(true);
    const number = `JU-${date.replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { error } = await supabaseBrowser().rpc("create_journal_entry", {
      p_business: businessId, p_number: number, p_date: date, p_description: description, p_kind: "general", p_post: true,
      p_lines: lines.filter((l) => l.account_id).map((l) => ({
        account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0,
      })),
    });
    setBusy(false);
    if (error) return setError(error.message);
    setDescription(""); setLines([empty(), empty()]);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Jurnal baru</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input style={{ flex: 1, minWidth: 200 }} placeholder="Keterangan" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select style={{ flex: 2, minWidth: 180 }} value={l.account_id} onChange={(e) => set(i, { account_id: e.target.value })}>
            <option value="">Pilih akun…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select>
          <input style={{ flex: 1, minWidth: 110 }} inputMode="decimal" placeholder="Debit" value={l.debit}
                 onChange={(e) => set(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })} />
          <input style={{ flex: 1, minWidth: 110 }} inputMode="decimal" placeholder="Kredit" value={l.credit}
                 onChange={(e) => set(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })} />
        </div>
      ))}
      <button type="button" onClick={() => setLines([...lines, empty()])}>+ Tambah baris</button>
      <p className={balanced ? "pos" : "neg"}>Debit {d.toLocaleString("id-ID")} · Kredit {c.toLocaleString("id-ID")} {balanced ? "✓ seimbang" : "✗ belum seimbang"}</p>
      {error && <div className="err">{error}</div>}
      <button className="primary" disabled={busy || !balanced}>{busy ? "Memposting…" : "Posting jurnal"}</button>
    </form>
  );
}
