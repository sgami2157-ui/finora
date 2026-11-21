"use client";
import { useMemo, useState } from "react";
import { Icon } from "./Icon";

/**
 * Simulasi pembukuan untuk halaman awal. Berjalan sepenuhnya di perangkat pengunjung: tidak ada data yang dikirim
 * atau disimpan, dan bukan data usaha nyata. Aturannya sama dengan aplikasi: setiap transaksi = jurnal debit/kredit seimbang.
 */
type Acc = "Kas" | "Piutang Usaha" | "Persediaan" | "Modal Pemilik" | "Penjualan" | "Harga Pokok" | "Biaya";
type Line = { acc: Acc; dr: number; cr: number };
type Entry = { id: number; desc: string; lines: Line[] };

const START: Entry[] = [{ id: 0, desc: "Setoran modal awal (simulasi)", lines: [{ acc: "Kas", dr: 5_000_000, cr: 0 }, { acc: "Modal Pemilik", dr: 0, cr: 5_000_000 }] }];
const rp = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);
const COST_RATIO = 0.6;
type Kind = "beli" | "jual" | "biaya" | "terima";

export default function LandingDemo() {
  const [entries, setEntries] = useState<Entry[]>(START);
  const [kind, setKind] = useState<Kind>("beli");
  const [amount, setAmount] = useState("1000000");
  const [credit, setCredit] = useState(false);
  const [expense, setExpense] = useState("Sewa tempat");
  const [view, setView] = useState<"jurnal" | "laba" | "neraca">("laba");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);

  const bal = useMemo(() => {
    const b: Record<Acc, number> = { Kas: 0, "Piutang Usaha": 0, Persediaan: 0, "Modal Pemilik": 0, Penjualan: 0, "Harga Pokok": 0, Biaya: 0 };
    let dr = 0, cr = 0;
    for (const e of entries) for (const l of e.lines) { dr += l.dr; cr += l.cr; b[l.acc] += l.dr - l.cr; }
    return { b, dr, cr };
  }, [entries]);
  const b = bal.b;
  const revenue = -b.Penjualan, cogs = b["Harga Pokok"], exp = b.Biaya, profit = revenue - cogs - exp;
  const assets = b.Kas + b["Piutang Usaha"] + b.Persediaan, equity = -b["Modal Pemilik"] + profit;

  const n = Math.max(0, Math.min(1_000_000_000, Math.floor(Number(amount) || 0)));
  const label: Record<Kind, string> = { beli: "Beli stok barang", jual: "Catat penjualan", biaya: "Catat biaya", terima: "Terima pembayaran piutang" };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    if (n <= 0) return setNote("Isi nominal lebih dari 0.");
    let desc = "", lines: Line[] = [];
    if (kind === "beli") {
      if (n > b.Kas) return setNote("Kas tidak cukup. Coba nominal lebih kecil.");
      desc = "Beli stok barang"; lines = [{ acc: "Persediaan", dr: n, cr: 0 }, { acc: "Kas", dr: 0, cr: n }];
    } else if (kind === "jual") {
      desc = credit ? "Penjualan kredit" : "Penjualan tunai";
      lines = [{ acc: credit ? "Piutang Usaha" : "Kas", dr: n, cr: 0 }, { acc: "Penjualan", dr: 0, cr: n }];
      const hpp = Math.round(n * COST_RATIO);
      if (b.Persediaan >= hpp && hpp > 0) lines.push({ acc: "Harga Pokok", dr: hpp, cr: 0 }, { acc: "Persediaan", dr: 0, cr: hpp });
      else setNote("Stok barang belum cukup, jadi harga pokok tidak ikut dicatat. Coba “Beli stok” dulu.");
    } else if (kind === "biaya") {
      if (n > b.Kas) return setNote("Kas tidak cukup. Coba nominal lebih kecil.");
      desc = expense; lines = [{ acc: "Biaya", dr: n, cr: 0 }, { acc: "Kas", dr: 0, cr: n }];
    } else {
      if (b["Piutang Usaha"] <= 0) return setNote("Belum ada piutang. Catat penjualan kredit dulu.");
      const v = Math.min(n, b["Piutang Usaha"]);
      desc = "Pelanggan melunasi"; lines = [{ acc: "Kas", dr: v, cr: 0 }, { acc: "Piutang Usaha", dr: 0, cr: v }];
    }
    setEntries((p) => [...p, { id: p.length, desc, lines }]);
    setDone((d) => ({ ...d, [kind]: true })); setFlash((f) => f + 1);
  }
  function reset() { setEntries(START); setDone({}); setNote(null); setFlash((f) => f + 1); }

  const balanced = bal.dr === bal.cr;
  const progress = (["beli", "jual", "biaya"] as Kind[]).filter((k) => done[k]).length;

  return (
    <div className="demo" id="coba-simulasi">
      <div className="demo-note"><Icon name="shield" size={16} /> Simulasi — berjalan di perangkat Anda, tidak disimpan, dan bukan data usaha nyata.</div>
      <ol className="demo-steps" aria-label="Langkah mencoba">
        {([["beli", "Beli stok"], ["jual", "Jual barang"], ["biaya", "Catat biaya"]] as [Kind, string][]).map(([k, t], i) => (
          <li key={k} className={done[k] ? "ok" : ""}><span>{done[k] ? "✓" : i + 1}</span>{t}</li>
        ))}
      </ol>

      <div className="demo-grid">
        <form className="demo-form" onSubmit={submit}>
          <div className="demo-tabs" role="tablist" aria-label="Jenis transaksi">
            {(Object.keys(label) as Kind[]).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => { setKind(k); setNote(null); }}>{label[k]}</button>
            ))}
          </div>
          {kind === "biaya" && (
            <label>Jenis biaya
              <select value={expense} onChange={(e) => setExpense(e.target.value)}>{["Sewa tempat", "Listrik & air", "Gaji karyawan", "Iklan"].map((x) => <option key={x}>{x}</option>)}</select>
            </label>
          )}
          <label>Nominal (Rp)
            <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 10))} aria-describedby="demo-amt" />
          </label>
          <div className="demo-chips" id="demo-amt">{[500_000, 1_000_000, 2_500_000].map((v) => <button key={v} type="button" className="chip-btn" onClick={() => setAmount(String(v))}>{rp(v)}</button>)}</div>
          {kind === "jual" && (
            <label className="demo-check"><input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} /> Dibayar nanti (kredit / piutang)</label>
          )}
          {note && <div className="demo-warn" role="status">{note}</div>}
          <button className="primary" type="submit">{label[kind]} →</button>
          <button className="ghost sm" type="button" onClick={reset}>Ulangi dari awal</button>
        </form>

        <div className="demo-out">
          <div className="demo-kpis" key={flash}>
            <div><small>Kas</small><b>{rp(b.Kas)}</b></div>
            <div><small>Stok barang</small><b>{rp(b.Persediaan)}</b></div>
            <div><small>Piutang</small><b>{rp(b["Piutang Usaha"])}</b></div>
            <div><small>{profit >= 0 ? "Untung" : "Rugi"}</small><b className={profit >= 0 ? "pos" : "neg"}>{rp(Math.abs(profit))}</b></div>
          </div>
          <div className="demo-tabs sm" role="tablist" aria-label="Laporan">
            {([["laba", "Laba rugi"], ["neraca", "Neraca"], ["jurnal", "Jurnal"]] as const).map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{t}</button>)}
          </div>
          <div className="demo-panel" key={view + flash}>
            {view === "laba" && (<dl className="demo-rep">
              <div><dt>Penjualan</dt><dd>{rp(revenue)}</dd></div><div><dt>Harga pokok</dt><dd>− {rp(cogs)}</dd></div>
              <div><dt>Biaya</dt><dd>− {rp(exp)}</dd></div><div className="tot"><dt>{profit >= 0 ? "Untung bersih" : "Rugi bersih"}</dt><dd className={profit >= 0 ? "pos" : "neg"}>{rp(Math.abs(profit))}</dd></div>
            </dl>)}
            {view === "neraca" && (<dl className="demo-rep">
              <div><dt>Kas</dt><dd>{rp(b.Kas)}</dd></div><div><dt>Piutang</dt><dd>{rp(b["Piutang Usaha"])}</dd></div><div><dt>Stok barang</dt><dd>{rp(b.Persediaan)}</dd></div>
              <div className="tot"><dt>Total harta</dt><dd>{rp(assets)}</dd></div>
              <div><dt>Modal pemilik</dt><dd>{rp(-b["Modal Pemilik"])}</dd></div><div><dt>Laba berjalan</dt><dd>{rp(profit)}</dd></div>
              <div className="tot"><dt>Total modal</dt><dd>{rp(equity)}</dd></div>
            </dl>)}
            {view === "jurnal" && (<ul className="demo-journal">
              {[...entries].reverse().map((e) => (
                <li key={e.id}><b>{e.desc}</b>
                  <table><tbody>{e.lines.map((l, i) => <tr key={i} className={l.cr ? "cr" : ""}><td>{l.acc}</td><td className="num">{l.dr ? rp(l.dr) : ""}</td><td className="num">{l.cr ? rp(l.cr) : ""}</td></tr>)}</tbody></table>
                </li>
              ))}
            </ul>)}
          </div>
          <div className={`demo-bal ${balanced && assets === equity ? "ok" : "bad"}`}>
            {balanced && assets === equity ? <>✓ Seimbang: total debit {rp(bal.dr)} = total kredit {rp(bal.cr)}; harta = modal</> : "Tidak seimbang"}
          </div>
        </div>
      </div>
      {progress === 3 && <div className="demo-cta"><b>Itu dia — laporan tersusun sendiri.</b> Di FINORA yang asli, semua ini tersimpan aman dan bisa dicetak. <a className="btn primary" href="/register">Buat akun gratis <Icon name="arrow" /></a></div>}
    </div>
  );
}
