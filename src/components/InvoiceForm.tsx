"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";
import { todayJakarta } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";

export type Kind = "sale" | "purchase" | "expense";
type Cash = { id: string; name: string; kind: string };
type Acc = { id: string; code: string; name: string };

const COPY: Record<Kind, { party: string; partyPh: string; submit: string; ok: string; payNow: string; payLater: string; account?: string }> = {
  sale: { party: "Pelanggan", partyPh: "Opsional", submit: "Simpan penjualan", ok: "Penjualan tersimpan dan dijurnal.", payNow: "Lunas sekarang", payLater: "Belum dibayar (piutang)" },
  purchase: { party: "Pemasok", partyPh: "Opsional", submit: "Simpan pembelian", ok: "Pembelian tersimpan dan dijurnal.", payNow: "Lunas sekarang", payLater: "Belum dibayar (utang)", account: "Dicatat sebagai" },
  expense: { party: "Penerima / vendor", partyPh: "Opsional", submit: "Simpan biaya", ok: "Biaya tersimpan dan dijurnal.", payNow: "Dibayar sekarang", payLater: "Belum dibayar (utang)", account: "Kategori biaya" },
};

export default function InvoiceForm({
  kind, businessId, cashAccounts, accounts, parties,
}: { kind: Kind; businessId: string; cashAccounts: Cash[]; accounts: Acc[]; parties: string[] }) {
  const router = useRouter();
  const c = COPY[kind];
  const uid = useId();
  const [date, setDate] = useState(todayJakarta());
  const [due, setDue] = useState("");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [account, setAccount] = useState(kind === "expense" ? "" : accounts[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [payNow, setPayNow] = useState(cashAccounts.length > 0);
  const [cash, setCash] = useState(cashAccounts[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const subtotal = Number(amount) || 0;
  const disc = Number(discount) || 0;
  const total = subtotal - disc;
  const idr = (n: number) => "Rp " + n.toLocaleString("id-ID");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null);
    if (subtotal <= 0) return setError("Nominal harus lebih dari nol.");
    if (disc >= subtotal) return setError("Diskon harus lebih kecil dari subtotal.");
    if (kind === "expense" && !account) return setError("Pilih kategori biaya.");
    if (payNow && !cash) return setError("Pilih rekening kas/bank untuk pembayaran.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("create_invoice", {
      p_business: businessId, p_type: kind, p_date: date, p_due: !payNow && due ? due : null,
      p_party_name: party || null, p_subtotal: subtotal, p_discount: disc,
      p_account: account || null, p_notes: notes || null, p_pay_cash: payNow ? cash : null,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setOk(c.ok);
    setAmount(""); setDiscount(""); setNotes(""); setParty(""); setDue("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="form">
      <div className="grid-2">
        <label className="field"><span>Tanggal</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field"><span>{c.party}</span>
          <input list={`${uid}-parties`} value={party} onChange={(e) => setParty(e.target.value)} placeholder={c.partyPh} maxLength={120} />
          <datalist id={`${uid}-parties`}>{parties.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
      </div>

      {c.account && (
        <label className="field"><span>{c.account}</span>
          <select value={account} onChange={(e) => setAccount(e.target.value)} required>
            {kind === "expense" && <option value="">Pilih kategori…</option>}
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      )}

      <div className="grid-2">
        <label className="field"><span>{kind === "sale" ? "Nilai penjualan" : "Nominal"}</span>
          <MoneyInput value={amount} onChange={setAmount} required />
        </label>
        {kind !== "expense" && (
          <label className="field"><span>Diskon (opsional)</span>
            <MoneyInput value={discount} onChange={setDiscount} />
          </label>
        )}
      </div>

      <div className="field"><span>Pembayaran</span>
        <div className="seg" role="radiogroup" aria-label="Status pembayaran">
          <button type="button" role="radio" aria-checked={payNow} className={payNow ? "on" : ""} onClick={() => setPayNow(true)} disabled={cashAccounts.length === 0}>{c.payNow}</button>
          <button type="button" role="radio" aria-checked={!payNow} className={!payNow ? "on" : ""} onClick={() => setPayNow(false)}>{c.payLater}</button>
        </div>
        {cashAccounts.length === 0 && (
          <small className="hint">Belum ada rekening kas/bank. <a href="/cash"><u>Tambahkan rekening</u></a> untuk mencatat pembayaran langsung.</small>
        )}
      </div>

      {payNow ? (
        <label className="field"><span>{kind === "sale" ? "Diterima di" : "Dibayar dari"}</span>
          <select value={cash} onChange={(e) => setCash(e.target.value)} required>
            {cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.kind === "bank" ? "Bank" : "Kas"}</option>)}
          </select>
        </label>
      ) : (
        <label className="field"><span>Jatuh tempo (opsional)</span>
          <input type="date" value={due} min={date} onChange={(e) => setDue(e.target.value)} />
        </label>
      )}

      <label className="field"><span>Catatan (opsional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="Mis. nomor nota, keterangan barang" />
      </label>

      <div className="total-bar">
        <span>Total {disc > 0 ? <small>(setelah diskon)</small> : null}</span>
        <strong>{idr(Math.max(total, 0))}</strong>
      </div>

      {error && <div className="alert err" role="alert">{error}</div>}
      {ok && <div className="alert ok" role="status">{ok}</div>}
      <button className="primary lg" aria-busy={busy} disabled={busy || subtotal <= 0}>{busy ? "Menyimpan…" : c.submit}</button>
    </form>
  );
}
