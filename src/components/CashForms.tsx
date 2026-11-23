"use client";
import { toast } from "@/lib/toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";
import { todayJakarta } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";

type Cash = { id: string; name: string };

export function NewCashAccountForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<"cash" | "bank">("bank");
  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [number, setNumber] = useState("");
  const [opening, setOpening] = useState("");
  const [date, setDate] = useState(todayJakarta());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(false);
    setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("create_cash_account", {
      p_business: businessId, p_name: name, p_kind: kind, p_bank_name: kind === "bank" ? bankName : null,
      p_account_number: kind === "bank" ? number : null, p_opening: Number(opening) || 0, p_date: date,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setOk(true); toast("Rekening ditambahkan."); setName(""); setBankName(""); setNumber(""); setOpening("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="form">
      <div className="seg" role="radiogroup" aria-label="Jenis rekening">
        <button type="button" role="radio" aria-checked={kind === "bank"} className={kind === "bank" ? "on" : ""} onClick={() => setKind("bank")}>Rekening bank</button>
        <button type="button" role="radio" aria-checked={kind === "cash"} className={kind === "cash" ? "on" : ""} onClick={() => setKind("cash")}>Kas tunai</button>
      </div>
      <label className="field"><span>Nama rekening</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "bank" ? "Mis. BCA Operasional" : "Mis. Kas Toko"} required maxLength={80} />
      </label>
      {kind === "bank" && (
        <div className="grid-2">
          <label className="field"><span>Nama bank</span><input value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={60} /></label>
          <label className="field"><span>Nomor rekening</span><input value={number} inputMode="numeric" onChange={(e) => setNumber(e.target.value)} maxLength={40} /></label>
        </div>
      )}
      <div className="grid-2">
        <label className="field"><span>Saldo awal</span><MoneyInput value={opening} onChange={setOpening} /></label>
        <label className="field"><span>Per tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
      </div>
      <small className="hint">Saldo awal dijurnal otomatis: debit rekening, kredit Modal Pemilik.</small>
      {error && <div className="alert err" role="alert">{error}</div>}
      {ok && <div className="alert ok" role="status">Rekening ditambahkan.</div>}
      <button className="primary lg" aria-busy={busy} disabled={busy || !name.trim()}>{busy ? "Menyimpan…" : "Tambah rekening"}</button>
    </form>
  );
}

export function TransferForm({ businessId, accounts }: { businessId: string; accounts: Cash[] }) {
  const router = useRouter();
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayJakarta());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(false);
    const n = Number(amount);
    if (!(n > 0)) return setError("Nominal harus lebih dari nol.");
    if (from === to) return setError("Rekening asal dan tujuan harus berbeda.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("record_transfer", {
      p_business: businessId, p_from: from, p_to: to, p_amount: n, p_date: date,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setOk(true); toast("Transaksi dicatat."); setAmount("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="form">
      <div className="grid-2">
        <label className="field"><span>Dari</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </label>
        <label className="field"><span>Ke</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </label>
      </div>
      <div className="grid-2">
        <label className="field"><span>Nominal</span><MoneyInput value={amount} onChange={setAmount} required /></label>
        <label className="field"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
      </div>
      <small className="hint">Transfer antar rekening tidak dihitung sebagai pendapatan maupun beban.</small>
      {error && <div className="alert err" role="alert">{error}</div>}
      {ok && <div className="alert ok" role="status">Transfer dicatat.</div>}
      <button className="primary lg" aria-busy={busy} disabled={busy || !amount}>{busy ? "Memproses…" : "Transfer"}</button>
    </form>
  );
}

type CashBal = { id: string; name: string; balance: number };

/** Setor modal / tarik ke rekening pribadi. Dicatat sebagai modal pemilik atau prive, bukan pendapatan/biaya. */
export function OwnerEquityForm({ businessId, accounts, defaultKind = "capital" }: { businessId: string; accounts: CashBal[]; defaultKind?: "capital" | "drawing" }) {
  const router = useRouter();
  const [kind, setKind] = useState<"capital" | "drawing">(defaultKind);
  const [acc, setAcc] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayJakarta());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const bal = accounts.find((a) => a.id === acc)?.balance ?? 0;   // dalam sen
  const n = Number(amount) || 0;
  const over = kind === "drawing" && Math.round(n * 100) > bal;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null);
    if (!(n > 0)) return setError("Nominal harus lebih dari nol.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("record_owner_equity", {
      p_business: businessId, p_cash_account: acc, p_kind: kind, p_amount: n, p_date: date, p_note: note.trim() || null,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setOk(kind === "capital" ? "Setoran modal dicatat." : "Penarikan pemilik dicatat.");
    setAmount(""); setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="form">
      <div className="seg" role="radiogroup" aria-label="Jenis pencatatan">
        <button type="button" role="radio" aria-checked={kind === "capital"} className={kind === "capital" ? "on" : ""} onClick={() => setKind("capital")}>Setor modal</button>
        <button type="button" role="radio" aria-checked={kind === "drawing"} className={kind === "drawing" ? "on" : ""} onClick={() => setKind("drawing")}>Tarik ke rekening pribadi</button>
      </div>
      <label className="field"><span>{kind === "capital" ? "Masuk ke rekening usaha" : "Diambil dari rekening usaha"}</span>
        <select value={acc} onChange={(e) => setAcc(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      </label>
      <div className="grid-2">
        <label className="field"><span>Nominal</span><MoneyInput value={amount} onChange={setAmount} required /></label>
        <label className="field"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
      </div>
      <label className="field"><span>Catatan (opsional)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder={kind === "capital" ? "Mis. tambahan modal dari tabungan" : "Mis. untuk kebutuhan pribadi"} /></label>
      <small className="hint">{kind === "capital"
        ? "Uang pribadi Anda yang dimasukkan ke usaha. Bukan penjualan, jadi tidak dihitung sebagai pendapatan."
        : "Uang usaha yang Anda ambil untuk pribadi. Bukan biaya usaha, jadi tidak mengurangi laba — tercatat sebagai Prive dan mengurangi modal."}</small>
      {over && <div className="alert err" role="status">Nominal melebihi saldo rekening ini. Pastikan penjualan atau setoran sebelumnya sudah dicatat.</div>}
      {error && <div className="alert err" role="alert">{error}</div>}
      {ok && <div className="alert ok" role="status">{ok}</div>}
      <button className="primary lg" aria-busy={busy} disabled={busy || !amount || !acc}>{busy ? "Menyimpan…" : kind === "capital" ? "Catat setoran modal" : "Catat penarikan"}</button>
    </form>
  );
}
