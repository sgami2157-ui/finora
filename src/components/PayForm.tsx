"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";
import { todayJakarta } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";

type Cash = { id: string; name: string; kind: string };

/** Catat pembayaran sebagian/penuh untuk satu tagihan (piutang atau utang). */
export default function PayForm({
  invoiceId, outstanding, cashAccounts, direction,
}: { invoiceId: string; outstanding: number; cashAccounts: Cash[]; direction: "in" | "out" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.round(outstanding)));
  const [date, setDate] = useState(todayJakarta());
  const [cash, setCash] = useState(cashAccounts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cashAccounts.length === 0) {
    return <small className="hint"><a href="/cash"><u>Tambah rekening kas/bank</u></a> untuk mencatat pembayaran.</small>;
  }
  if (!open) {
    return <button type="button" className="btn ghost sm" onClick={() => setOpen(true)}>{direction === "in" ? "Catat penerimaan" : "Catat pembayaran"}</button>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(amount);
    if (!(n > 0)) return setError("Nominal harus lebih dari nol.");
    if (n > outstanding) return setError("Nominal melebihi sisa tagihan.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("record_payment", {
      p_invoice: invoiceId, p_cash_account: cash, p_amount: n, p_date: date,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setOpen(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="pay-form">
      <label className="field"><span>Nominal</span><MoneyInput value={amount} onChange={setAmount} required /></label>
      <label className="field"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
      <label className="field"><span>{direction === "in" ? "Masuk ke" : "Dibayar dari"}</span>
        <select value={cash} onChange={(e) => setCash(e.target.value)}>
          {cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      {error && <div className="alert err" role="alert">{error}</div>}
      <div className="pay-actions">
        <button className="primary" aria-busy={busy} disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>Batal</button>
      </div>
    </form>
  );
}
