"use client";
import { toast } from "@/lib/toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";

type Opt = { value: string; label: string };

function useAction(onDone: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, success: string) {
    setBusy(true); setError(null); setOk(null);
    const { error: err } = await fn();
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setOk(success); toast(success); onDone(); router.refresh();
  }
  return { busy, error, ok, run };
}

function Confirm({ text, label, busy, onYes, onNo, danger }: { text: string; label: string; busy: boolean; onYes: () => void; onNo: () => void; danger?: boolean }) {
  return (
    <div className={`alert ${danger ? "err" : ""}`} role="alertdialog" aria-label="Konfirmasi">
      <p style={{ margin: "0 0 10px" }}>{text}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="primary" onClick={onYes} aria-busy={busy} disabled={busy}>{busy ? "Memproses…" : label}</button>
        <button type="button" className="ghost" onClick={onNo} disabled={busy}>Batal</button>
      </div>
    </div>
  );
}

export function CloseMonthForm({ businessId, months }: { businessId: string; months: Opt[] }) {
  const [m, setM] = useState(months[0]?.value ?? "");
  const [confirm, setConfirm] = useState(false);
  const a = useAction(() => setConfirm(false));
  const label = months.find((x) => x.value === m)?.label ?? "";
  return (
    <div className="form">
      <label className="field"><span>Kunci sampai akhir bulan</span>
        <select value={m} onChange={(e) => { setM(e.target.value); setConfirm(false); }}>{months.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </label>
      <small className="hint">Setelah dikunci, transaksi bertanggal pada atau sebelum akhir bulan itu tidak bisa ditambah atau dibalik. Sistem memeriksa dulu bahwa pembukuan seimbang dan tidak ada jurnal draft.</small>
      {!confirm && <button type="button" className="primary lg" onClick={() => setConfirm(true)} disabled={!m}>Tutup bulan…</button>}
      {confirm && <Confirm text={`Kunci pembukuan sampai akhir ${label}? Pemilik masih bisa membukanya kembali dengan alasan tercatat.`} label="Ya, kunci" busy={a.busy} onNo={() => setConfirm(false)}
        onYes={() => a.run(() => supabaseBrowser().rpc("close_month", { p_business: businessId, p_month: m }), `Pembukuan dikunci sampai akhir ${label}.`)} />}
      {a.error && <div className="alert err" role="alert">{a.error}</div>}
      {a.ok && <div className="alert ok" role="status">{a.ok}</div>}
    </div>
  );
}

export function CloseYearForm({ businessId, year, netIncome }: { businessId: string; year: number; netIncome: string }) {
  const [confirm, setConfirm] = useState(false);
  const a = useAction(() => setConfirm(false));
  return (
    <div className="form">
      <p style={{ margin: 0 }}>Tahun <strong>{year}</strong> · hasil usaha: <strong>{netIncome}</strong></p>
      <small className="hint">Saldo pendapatan, modal barang terjual, biaya, dan prive tahun {year} dipindahkan ke Laba Ditahan lewat satu jurnal penutup, lalu pembukuan dikunci sampai 31 Desember {year}. Laporan laba rugi tahun itu tetap menampilkan angka aslinya, dan neraca tetap seimbang.</small>
      {!confirm && <button type="button" className="primary lg" onClick={() => setConfirm(true)}>Tutup tahun {year}…</button>}
      {confirm && <Confirm text={`Tutup tahun ${year}? Dibuat jurnal penutup dan pembukuan dikunci sampai 31 Desember ${year}.`} label="Ya, tutup tahun" busy={a.busy} onNo={() => setConfirm(false)}
        onYes={() => a.run(() => supabaseBrowser().rpc("close_year", { p_business: businessId, p_year: year }), `Tahun ${year} ditutup.`)} />}
      {a.error && <div className="alert err" role="alert">{a.error}</div>}
      {a.ok && <div className="alert ok" role="status">{a.ok}</div>}
    </div>
  );
}

export function ReopenForm({ businessId, targets, closedYearEnds }: { businessId: string; targets: Opt[]; closedYearEnds: string[] }) {
  const [to, setTo] = useState(targets[0]?.value ?? "");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const a = useAction(() => { setConfirm(false); setNote(""); });
  const reverses = closedYearEnds.filter((d) => to === "" || d > to);
  return (
    <div className="form">
      <label className="field"><span>Buka kembali mulai setelah</span>
        <select value={to} onChange={(e) => { setTo(e.target.value); setConfirm(false); }}>{targets.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </label>
      <label className="field"><span>Alasan (wajib, tercatat di riwayat)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Mis. koreksi biaya yang salah catat" /></label>
      {reverses.length > 0 && <div className="alert err" role="status">Penutupan tahun {reverses.map((d) => d.slice(0, 4)).join(", ")} akan dibatalkan (jurnal penutup dibalik) dan harus ditutup ulang setelah koreksi.</div>}
      {!confirm && <button type="button" className="lg" onClick={() => setConfirm(true)} disabled={note.trim().length < 5}>Buka kembali…</button>}
      {confirm && <Confirm danger text="Periode akan dibuka sehingga transaksi bisa diubah lagi. Tindakan ini tercatat di riwayat. Lanjutkan?" label="Ya, buka kembali" busy={a.busy} onNo={() => setConfirm(false)}
        onYes={() => a.run(() => supabaseBrowser().rpc("reopen_period", { p_business: businessId, p_to: to || null, p_note: note.trim() }), "Periode dibuka kembali.")} />}
      {a.error && <div className="alert err" role="alert">{a.error}</div>}
      {a.ok && <div className="alert ok" role="status">{a.ok}</div>}
    </div>
  );
}
