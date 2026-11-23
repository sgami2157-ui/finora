"use client";
import { toast } from "@/lib/toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";
import { todayJakarta } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";

type Cash = { id: string; name: string; kind: string };
type Prod = { id: string; name: string; sku: string | null; sell_price: number; stock_qty: number; stock_value: number };

/** "1,5" atau "1.5" -> 1.5 ; kosong/tidak valid -> 0 */
export function parseQty(s: string): number {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
const qtyFmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 4 });

function Msg({ error, ok }: { error: string | null; ok: string | null }) {
  return (<>{error && <div className="alert err" role="alert">{error}</div>}{ok && <div className="alert ok" role="status">{ok}</div>}</>);
}

function NewProduct({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [name, setName] = useState(""); const [sku, setSku] = useState(""); const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null); setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("create_product", { p_business: businessId, p_name: name, p_sku: sku || null, p_price: Number(price) || 0 });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    toast("Produk ditambahkan."); setOk("Produk ditambahkan. Lanjut isi stoknya di tab “Tambah stok”."); setName(""); setSku(""); setPrice(""); router.refresh();
  }
  return (
    <form onSubmit={submit} className="form">
      <label className="field"><span>Nama produk</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis. Kopi Arabika 250 gr" required maxLength={120} /></label>
      <div className="grid-2">
        <label className="field"><span>Harga jual</span><MoneyInput value={price} onChange={setPrice} /></label>
        <label className="field"><span>Kode / SKU (opsional)</span><input value={sku} onChange={(e) => setSku(e.target.value)} maxLength={40} /></label>
      </div>
      <small className="hint">Stok awal diisi lewat “Tambah stok” supaya nilai persediaan tercatat dengan benar.</small>
      <Msg error={error} ok={ok} />
      <button className="primary lg" aria-busy={busy} disabled={busy || !name.trim()}>{busy ? "Menyimpan…" : "Simpan produk"}</button>
    </form>
  );
}

function StockIn({ businessId, products, cashAccounts }: { businessId: string; products: Prod[]; cashAccounts: Cash[] }) {
  const router = useRouter();
  const [product, setProduct] = useState(products[0]?.id ?? ""); const [qty, setQty] = useState(""); const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayJakarta()); const [supplier, setSupplier] = useState(""); const [due, setDue] = useState("");
  const [payNow, setPayNow] = useState(cashAccounts.length > 0); const [cash, setCash] = useState(cashAccounts[0]?.id ?? "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null);
  const q = parseQty(qty); const total = Math.round(q * (Number(cost) || 0));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null);
    if (q <= 0) return setError("Jumlah barang harus lebih dari nol.");
    if (!(Number(cost) > 0)) return setError("Isi harga beli per barang.");
    if (payNow && !cash) return setError("Pilih rekening untuk pembayaran.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("stock_in", {
      p_business: businessId, p_product: product, p_qty: q, p_unit_cost: Number(cost), p_date: date,
      p_supplier: supplier || null, p_due: !payNow && due ? due : null, p_pay_cash: payNow ? cash : null,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    toast("Stok bertambah."); setOk("Stok bertambah dan pembelian sudah dicatat."); setQty(""); setCost(""); setSupplier(""); setDue(""); router.refresh();
  }
  return (
    <form onSubmit={submit} className="form">
      <label className="field"><span>Produk</span>
        <select value={product} onChange={(e) => setProduct(e.target.value)} required>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </label>
      <div className="grid-2">
        <label className="field"><span>Jumlah masuk</span><input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" required /></label>
        <label className="field"><span>Harga beli per barang</span><MoneyInput value={cost} onChange={setCost} required /></label>
      </div>
      <div className="grid-2">
        <label className="field"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label className="field"><span>Pemasok (opsional)</span><input value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={120} /></label>
      </div>
      <div className="field"><span>Pembayaran</span>
        <div className="seg" role="radiogroup" aria-label="Status pembayaran">
          <button type="button" role="radio" aria-checked={payNow} className={payNow ? "on" : ""} onClick={() => setPayNow(true)} disabled={cashAccounts.length === 0}>Sudah dibayar</button>
          <button type="button" role="radio" aria-checked={!payNow} className={!payNow ? "on" : ""} onClick={() => setPayNow(false)}>Belum dibayar (utang)</button>
        </div>
        {cashAccounts.length === 0 && <small className="hint"><a href="/cash"><u>Tambah rekening kas/bank</u></a> dulu untuk mencatat pembayaran langsung.</small>}
      </div>
      {payNow
        ? <label className="field"><span>Dibayar dari</span><select value={cash} onChange={(e) => setCash(e.target.value)}>{cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        : <label className="field"><span>Jatuh tempo (opsional)</span><input type="date" min={date} value={due} onChange={(e) => setDue(e.target.value)} /></label>}
      <div className="total-bar"><span>Total pembelian</span><strong>Rp {total.toLocaleString("id-ID")}</strong></div>
      <Msg error={error} ok={ok} />
      <button className="primary lg" aria-busy={busy} disabled={busy || q <= 0}>{busy ? "Menyimpan…" : "Tambah stok"}</button>
    </form>
  );
}

function Adjust({ businessId, products }: { businessId: string; products: Prod[] }) {
  const router = useRouter();
  const [product, setProduct] = useState(products[0]?.id ?? ""); const [count, setCount] = useState(""); const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayJakarta()); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null);
  const cur = products.find((p) => p.id === product);
  const n = count === "" ? null : parseQty(count);
  const grows = cur != null && n != null && n > cur.stock_qty;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null);
    if (n == null || n < 0) return setError("Isi jumlah stok hasil hitung fisik.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().rpc("adjust_stock", {
      p_business: businessId, p_product: product, p_new_qty: n, p_unit_cost: grows && Number(cost) > 0 ? Number(cost) : null, p_date: date, p_reason: reason || null,
    });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    toast("Stok disesuaikan."); setOk("Stok disesuaikan dan selisihnya dicatat."); setCount(""); setCost(""); setReason(""); router.refresh();
  }
  return (
    <form onSubmit={submit} className="form">
      <small className="hint">Pakai ini setelah menghitung barang di rak/gudang dan hasilnya berbeda dari catatan (rusak, hilang, atau salah hitung).</small>
      <label className="field"><span>Produk</span>
        <select value={product} onChange={(e) => setProduct(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </label>
      <div className="grid-2">
        <label className="field"><span>Stok tercatat</span><input value={cur ? qtyFmt(cur.stock_qty) : ""} readOnly aria-readonly="true" /></label>
        <label className="field"><span>Hasil hitung fisik</span><input inputMode="decimal" value={count} onChange={(e) => setCount(e.target.value)} placeholder="0" required /></label>
      </div>
      {grows && (cur?.stock_qty ?? 0) === 0 && <label className="field"><span>Harga per barang</span><MoneyInput value={cost} onChange={setCost} required /></label>}
      <div className="grid-2">
        <label className="field"><span>Tanggal</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label className="field"><span>Alasan (opsional)</span><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="Mis. rusak, hilang" /></label>
      </div>
      <Msg error={error} ok={ok} />
      <button className="primary lg" aria-busy={busy} disabled={busy || n == null}>{busy ? "Menyimpan…" : "Simpan penyesuaian"}</button>
    </form>
  );
}

export function ProductActions({ businessId, products, cashAccounts }: { businessId: string; products: Prod[]; cashAccounts: Cash[] }) {
  const [tab, setTab] = useState<"new" | "in" | "adj">(products.length === 0 ? "new" : "in");
  const has = products.length > 0;
  return (
    <div className="form">
      <div className="seg" role="tablist" aria-label="Tindakan produk">
        <button type="button" role="tab" aria-selected={tab === "new"} className={tab === "new" ? "on" : ""} onClick={() => setTab("new")}>Produk baru</button>
        <button type="button" role="tab" aria-selected={tab === "in"} className={tab === "in" ? "on" : ""} onClick={() => setTab("in")} disabled={!has}>Tambah stok</button>
        <button type="button" role="tab" aria-selected={tab === "adj"} className={tab === "adj" ? "on" : ""} onClick={() => setTab("adj")} disabled={!has}>Hitung ulang</button>
      </div>
      {tab === "new" && <NewProduct businessId={businessId} />}
      {tab === "in" && has && <StockIn businessId={businessId} products={products} cashAccounts={cashAccounts} />}
      {tab === "adj" && has && <Adjust businessId={businessId} products={products} />}
    </div>
  );
}

/** Ubah harga jual, batas stok minimum, atau arsipkan produk (tidak menyentuh stok). */
export function ProductRowActions({ id, name, price, minStock }: { id: string; name: string; price: number; minStock: number }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false); const [val, setVal] = useState(String(Math.round(price)));
  const [min, setMin] = useState(minStock > 0 ? String(minStock) : "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function save() {
    const m = min.trim() === "" ? 0 : Number(min.replace(",", "."));
    if (!Number.isFinite(m) || m < 0) return setError("Batas stok minimum harus berupa angka, 0 atau lebih.");
    setBusy(true); setError(null);
    const { error: err } = await supabaseBrowser().from("products").update({ sell_price: Number(val) || 0, min_stock: m, updated_at: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setEdit(false); router.refresh();
  }
  async function archive() {
    if (!confirm(`Sembunyikan “${name}” dari daftar? Riwayat transaksinya tetap tersimpan.`)) return;
    setBusy(true);
    const { error: err } = await supabaseBrowser().from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    router.refresh();
  }
  if (edit) {
    return (
      <div className="inline-edit wrap">
        <label className="mini">Harga jual<MoneyInput value={val} onChange={setVal} /></label>
        <label className="mini">Stok minimum<input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="mis. 5" aria-label="Stok minimum" /></label>
        <button type="button" className="primary sm" onClick={save} aria-busy={busy} disabled={busy}>Simpan</button>
        <button type="button" className="ghost sm" onClick={() => { setEdit(false); setError(null); }}>Batal</button>
        {error && <small className="neg">{error}</small>}
      </div>
    );
  }
  return (
    <div className="inline-edit">
      <button type="button" className="ghost sm" onClick={() => setEdit(true)}>Ubah</button>
      <button type="button" className="ghost sm" onClick={archive} aria-busy={busy} disabled={busy}>Sembunyikan</button>
      {error && <small className="neg">{error}</small>}
    </div>
  );
}
