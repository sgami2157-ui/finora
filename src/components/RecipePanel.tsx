"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";
import { toast } from "@/lib/toast";
import { DISHES, formatQty, matchDish, packFromBase, packLabel, pricePerBase, recipeTotals, type Dish, type Unit } from "@/lib/fnb-recipes";

export type SavedRow = { name: string; unit: Unit; qty: number; price: number | null };
type Prod = { id: string; name: string; sell_price: number };
type Row = { key: number; name: string; qty: string; unit: Unit; pack: string; pokok?: boolean; note?: string };

const num = (s: string) => { const n = Number(s.replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const rp = (n: number) => "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));
let seq = 1;

function fromSaved(rows: SavedRow[]): Row[] {
  return rows.map((r) => ({ key: seq++, name: r.name, qty: String(r.qty), unit: r.unit, pack: r.price ? String(packFromBase(r.unit, r.price)) : "" }));
}
function fromDish(d: Dish): Row[] {
  return d.items.map((i) => ({ key: seq++, name: i.name, qty: String(i.qty), unit: i.unit, pack: "", pokok: i.pokok, note: i.note }));
}

/** Resep per produk dengan saran takaran umum F&B, perhitungan HPP, harga jual saran, dan rencana kebutuhan bahan. */
export default function RecipePanel({ businessId, products, saved }: { businessId: string; products: Prod[]; saved: Record<string, SavedRow[]> }) {
  const router = useRouter();
  const [pid, setPid] = useState(products[0]?.id ?? "");
  const prod = products.find((p) => p.id === pid);
  const [rows, setRows] = useState<Row[]>(() => (products[0] && saved[products[0].id]?.length ? fromSaved(saved[products[0].id]) : []));
  const [dishId, setDishId] = useState<string>("");
  const [portions, setPortions] = useState("50");
  const [target, setTarget] = useState("40");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suggested = useMemo(() => (prod ? matchDish(prod.name) : null), [prod]);
  const dish = DISHES.find((d) => d.id === dishId) ?? suggested;
  const hasSaved = !!(pid && saved[pid]?.length);

  function choose(id: string) {
    setPid(id); setErr(null); setDishId("");
    setRows(saved[id]?.length ? fromSaved(saved[id]) : []);
  }
  const upd = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const calc = rows.map((r) => ({ name: r.name, qty: num(r.qty), unit: r.unit, price: num(r.pack) > 0 ? pricePerBase(r.unit, num(r.pack)) : null }));
  const t = recipeTotals(calc);
  const sell = prod?.sell_price ?? 0;
  const margin = sell > 0 && t.priced > 0 ? ((sell - t.cost) / sell) * 100 : null;
  const tgt = Math.min(90, Math.max(5, num(target) || 40));
  const suggestPrice = t.cost > 0 ? Math.ceil(t.cost / (1 - tgt / 100) / 500) * 500 : null;
  const n = Math.min(10000, Math.max(1, Math.floor(num(portions)) || 1));

  async function save() {
    if (!prod) return;
    setErr(null);
    const items = rows.filter((r) => r.name.trim());
    if (items.length === 0) return setErr("Tambahkan minimal satu bahan.");
    if (items.some((r) => num(r.qty) <= 0)) return setErr("Takaran setiap bahan harus lebih dari 0.");
    setBusy(true);
    const payload = items.map((r) => ({ name: r.name.trim(), unit: r.unit, qty: num(r.qty), ref_price: num(r.pack) > 0 ? pricePerBase(r.unit, num(r.pack)) : null }));
    const { error } = await supabaseBrowser().rpc("save_recipe", { p_business: businessId, p_product: prod.id, p_items: payload });
    setBusy(false);
    if (error) { setErr(friendlyError(error.message)); return; }
    toast("Resep tersimpan."); router.refresh();
  }

  if (products.length === 0) return <p className="muted">Tambahkan produk dulu (panel “Kelola stok”), lalu atur resepnya di sini.</p>;

  return (
    <div className="recipe">
      <label className="recipe-pick">Pilih produk
        <select value={pid} onChange={(e) => choose(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </label>

      <div className="recipe-hint" role="note">
        {hasSaved && rows.length > 0 && !dishId ? <>Resep tersimpan. Ubah takaran atau harga lalu simpan lagi.</> : suggested ? (
          <>Saran untuk <strong>{suggested.label}</strong> ({suggested.portion}).</>
        ) : <>Menu “{prod?.name}” belum punya saran otomatis. Pilih menu yang mirip sebagai titik awal, atau isi bahan sendiri.</>}
        {!suggested && (
          <select aria-label="Pilih menu mirip" value={dishId} onChange={(e) => setDishId(e.target.value)}>
            <option value="">— pilih menu mirip —</option>{DISHES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        )}
        {dish && <button type="button" className="ghost sm" onClick={() => setRows(fromDish(dish))}>{rows.length ? "Ganti dengan saran takaran" : "Pakai saran takaran"}</button>}
        <small>Perkiraan umum di lapangan, bukan resep resmi. Takaran bervariasi menurut ukuran porsi dan selera; timbang untuk memastikan.</small>
      </div>

      {rows.length > 0 && (<>
        <div className="recipe-rows" role="group" aria-label="Bahan per porsi">
          <div className="recipe-row head" aria-hidden="true"><span>Bahan (per 1 porsi)</span><span>Takaran</span><span>Harga beli</span><span /></div>
          {rows.map((r) => (
            <div className="recipe-row" key={r.key}>
              <span className="rn">
                <input aria-label="Nama bahan" value={r.name} maxLength={80} onChange={(e) => upd(r.key, { name: e.target.value })} />
                {r.pokok && <b className="pokok">Bahan pokok</b>}
                {r.note && <small>{r.note}</small>}
              </span>
              <span className="rq">
                <input aria-label="Takaran" inputMode="decimal" value={r.qty} onChange={(e) => upd(r.key, { qty: e.target.value })} />
                <select aria-label="Satuan" value={r.unit} onChange={(e) => upd(r.key, { unit: e.target.value as Unit })}><option value="g">g</option><option value="ml">ml</option><option value="pcs">pcs</option></select>
              </span>
              <span className="rp">
                <input aria-label={`Harga per ${packLabel(r.unit)}`} inputMode="numeric" placeholder={`Rp / ${packLabel(r.unit)}`} value={r.pack} onChange={(e) => upd(r.key, { pack: e.target.value.replace(/[^\d.,]/g, "") })} />
              </span>
              <button type="button" className="bell-x" aria-label={`Hapus ${r.name || "bahan"}`} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="ghost sm" onClick={() => setRows((x) => [...x, { key: seq++, name: "", qty: "", unit: "g", pack: "" }])}>+ Tambah bahan</button>

        <div className="recipe-sum">
          <div><small>Biaya bahan per porsi</small><b>{t.priced ? rp(t.cost) : "–"}</b>{t.missing > 0 && <em>{t.missing} bahan belum diberi harga, jadi biaya belum lengkap</em>}</div>
          <div><small>Harga jual</small><b>{sell > 0 ? rp(sell) : "belum diisi"}</b>{margin != null && <em className={margin >= 30 ? "pos" : margin >= 0 ? "" : "neg"}>Margin {Math.round(margin)}%</em>}</div>
          <div><small>Harga jual saran</small><b>{suggestPrice ? rp(suggestPrice) : "–"}</b>
            <em><label>agar margin <input aria-label="Target margin persen" className="mini" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, "").slice(0, 2))} />%</label></em></div>
        </div>

        <div className="recipe-plan">
          <label>Rencana bahan untuk <input aria-label="Jumlah porsi" className="mini" inputMode="numeric" value={portions} onChange={(e) => setPortions(e.target.value.replace(/\D/g, "").slice(0, 5))} /> porsi</label>
          <ul>{rows.filter((r) => r.name.trim() && num(r.qty) > 0).map((r) => <li key={r.key}><span>{r.name}</span><b>{formatQty(num(r.qty) * n, r.unit)}</b></li>)}</ul>
          {t.priced > 0 && <p className="muted sm">Perkiraan biaya bahan: <strong>{rp(t.cost * n)}</strong>{t.missing > 0 ? " (belum termasuk bahan tanpa harga)" : ""}</p>}
        </div>

        {err && <div className="alert err" role="alert">{err}</div>}
        <button type="button" className="primary" disabled={busy} aria-busy={busy} onClick={save}>{busy ? "Menyimpan…" : "Simpan resep"}</button>
        <small className="muted">Resep dipakai untuk memperkirakan biaya dan kebutuhan bahan. Pengurangan stok bahan otomatis saat penjualan belum aktif; stok produk tetap dicatat seperti biasa.</small>
      </>)}
    </div>
  );
}
