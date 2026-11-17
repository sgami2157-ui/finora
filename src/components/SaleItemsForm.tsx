"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";
import { todayJakarta } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";
import { parseQty } from "./ProductForms";

type Cash = { id: string; name: string; kind: string };
type Prod = { id: string; name: string; sell_price: number; stock_qty: number };
type Row = { key: number; product: string; qty: string; price: string };

/** Penjualan dari daftar produk: stok berkurang dan HPP dicatat otomatis. */
export default function SaleItemsForm({ businessId, products, cashAccounts, parties }: { businessId: string; products: Prod[]; cashAccounts: Cash[]; parties: string[] }) {
  const router = useRouter(); const uid = useId();
  const first = products.find((p) => p.stock_qty > 0) ?? products[0];
  const [rows, setRows] = useState<Row[]>([{ key: 1, product: first?.id ?? "", qty: "1", price: String(Math.round(first?.sell_price ?? 0)) }]);
  const [date, setDate] = useState(todayJakarta()); const [due, setDue] = useState(""); const [party, setParty] = useState(""); const [discount, setDiscount] = useState(""); const [notes, setNotes] = useState("");
  const [payNow, setPayNow] = useState(cashAccounts.length > 0); const [cash, setCash] = useState(cashAccounts[0]?.id ?? "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null);
  const byId = new Map(products.map((p) => [p.id, p]));
  const subtotal = rows.reduce((s, r) => s + Math.round(parseQty(r.qty) * (Number(r.price) || 0)), 0);
  const total = subtotal - (Number(discount) || 0);

  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  function pick(key: number, id: string) { const p = byId.get(id); set(key, { product: id, price: String(Math.round(p?.sell_price ?? 0)) }); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null);
    for (const r of rows) {
      const p = byId.get(r.product); const q = parseQty(r.qty);
      if (!p) return setError("Pilih produk pada setiap baris.");
      if (q <= 0) return setError(`Jumlah “${p.name}” harus lebih dari nol.`);
      if (!(Number(r.price) > 0)) return setError(`Isi harga jual “${p.name}”.`);
      const same = rows.filter((x) => x.product === r.product).reduce((s, x) => s + parseQty(x.qty), 0);
      if (same > p.stock_qty) return setError(`Stok “${p.name}” tidak cukup (tersisa ${p.stock_qty.toLocaleString("id-ID")}).`);
    }
    if ((Number(discount) || 0) >= subtotal) return setError("Diskon harus lebih kecil dari total belanja.");
    if (payNow && !cash) return setError("Pilih rekening penerima uang.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("create_sale", {
      p_business: businessId, p_date: date, p_due: !payNow && due ? due : null, p_party: party || null,
      p_items: rows.map((r) => ({ product_id: r.product, qty: parseQty(r.qty), unit_price: Number(r.price) })),
      p_discount: Number(discount) || 0, p_notes: notes || null, p_pay_cash: payNow ? cash : null,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setOk("Penjualan tersimpan. Stok berkurang dan modal barang (HPP) dicatat otomatis.");
    setRows([{ key: Date.now(), product: first?.id ?? "", qty: "1", price: String(Math.round(first?.sell_price ?? 0)) }]); setDiscount(""); setNotes(""); setParty(""); setDue("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="form">
      <div className="grid-2">
        <label className="field"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label className="field"><span>Pelanggan</span>
          <input list={`${uid}-p`} value={party} onChange={(e) => setParty(e.target.value)} placeholder="Opsional" maxLength={120} />
          <datalist id={`${uid}-p`}>{parties.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
      </div>
      <div className="field"><span>Barang yang dijual</span>
        <ul className="lines">
          {rows.map((r) => {
            const p = byId.get(r.product);
            return (
              <li key={r.key} className="line">
                <select aria-label="Produk" value={r.product} onChange={(e) => pick(r.key, e.target.value)}>
                  {products.map((x) => <option key={x.id} value={x.id} disabled={x.stock_qty <= 0}>{x.name} (stok {x.stock_qty.toLocaleString("id-ID")})</option>)}
                </select>
                <input aria-label="Jumlah" inputMode="decimal" value={r.qty} onChange={(e) => set(r.key, { qty: e.target.value })} />
                <MoneyInput value={r.price} onChange={(v) => set(r.key, { price: v })} />
                <button type="button" className="ghost sm" aria-label="Hapus baris" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>✕</button>
                {p && <small className="hint line-sub">Subtotal Rp {Math.round(parseQty(r.qty) * (Number(r.price) || 0)).toLocaleString("id-ID")}</small>}
              </li>
            );
          })}
        </ul>
        <button type="button" className="ghost sm" onClick={() => setRows((rs) => [...rs, { key: Date.now(), product: first?.id ?? "", qty: "1", price: String(Math.round(first?.sell_price ?? 0)) }])}>+ Tambah barang</button>
      </div>
      <label className="field"><span>Diskon (opsional)</span><MoneyInput value={discount} onChange={setDiscount} /></label>
      <div className="field"><span>Pembayaran</span>
        <div className="seg" role="radiogroup" aria-label="Status pembayaran">
          <button type="button" role="radio" aria-checked={payNow} className={payNow ? "on" : ""} onClick={() => setPayNow(true)} disabled={cashAccounts.length === 0}>Lunas sekarang</button>
          <button type="button" role="radio" aria-checked={!payNow} className={!payNow ? "on" : ""} onClick={() => setPayNow(false)}>Belum dibayar (piutang)</button>
        </div>
        {cashAccounts.length === 0 && <small className="hint"><a href="/cash"><u>Tambah rekening kas/bank</u></a> dulu untuk mencatat uang masuk langsung.</small>}
      </div>
      {payNow
        ? <label className="field"><span>Uang diterima di</span><select value={cash} onChange={(e) => setCash(e.target.value)}>{cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        : <label className="field"><span>Jatuh tempo (opsional)</span><input type="date" min={date} value={due} onChange={(e) => setDue(e.target.value)} /></label>}
      <label className="field"><span>Catatan (opsional)</span><input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} /></label>
      <div className="total-bar"><span>Total</span><strong>Rp {Math.max(total, 0).toLocaleString("id-ID")}</strong></div>
      {error && <div className="alert err" role="alert">{error}</div>}
      {ok && <div className="alert ok" role="status">{ok}</div>}
      <button className="primary lg" disabled={busy || subtotal <= 0}>{busy ? "Menyimpan…" : "Simpan penjualan"}</button>
    </form>
  );
}
