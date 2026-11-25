import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, getCashAccounts, getBalances, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { fmtDate } from "@/lib/format";
import { ProductActions, ProductRowActions } from "@/components/ProductForms";
import { Badge, Callout, Empty, Kpi, PageHead, Panel, Term } from "@/components/ui";
import BusinessTypeSwitch, { type BusinessType } from "@/components/BusinessTypeSwitch";
import RecipePanel, { type SavedRow } from "@/components/RecipePanel";

type P = { id: string; name: string; sku: string | null; sell_price: number | string; stock_qty: number | string; stock_value: number | string; min_stock: number | string };
type M = { id: string; product_id: string | null; movement: string; qty: number | string; total_cost: number | string; moved_on: string };

const qtyFmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 4 });
const MOV: Record<string, { label: string; tone: "pos" | "neg" | "warn" }> = {
  in: { label: "Masuk", tone: "pos" }, out: { label: "Terjual", tone: "neg" }, adjustment: { label: "Penyesuaian", tone: "warn" },
};

export default async function ProductsPage() {
  const biz = await getBusiness();
  if (!biz) return (<><PageHead title="Produk & Persediaan" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);

  const sb = await supabaseServer();
  const [cash, pRes, mRes, bal, setRes, ingRes, recRes] = await Promise.all([
    getCashAccounts(biz.id),
    sb.from("products").select("id,name,sku,sell_price,stock_qty,stock_value,min_stock").eq("business_id", biz.id).is("deleted_at", null).order("name").limit(500),
    sb.from("inventory_movements").select("id,product_id,movement,qty,total_cost,moved_on").eq("business_id", biz.id).not("product_id", "is", null).order("moved_on", { ascending: false }).order("created_at", { ascending: false }).limit(15),
    getBalances(biz.id, null, null),
    sb.from("business_settings").select("business_type").eq("business_id", biz.id).maybeSingle(),
    sb.from("ingredients").select("id,name,unit,ref_price").eq("business_id", biz.id).is("deleted_at", null).limit(1000),
    sb.from("recipe_items").select("product_id,ingredient_id,qty").eq("business_id", biz.id).limit(5000),
  ]);
  const bizType: BusinessType = (setRes.data as { business_type?: string } | null)?.business_type === "fnb" ? "fnb" : "umum";
  const ingById = new Map(((ingRes.data ?? []) as { id: string; name: string; unit: string; ref_price: number | string | null }[]).map((i) => [i.id, i]));
  const saved: Record<string, SavedRow[]> = {};
  for (const r of (recRes.data ?? []) as { product_id: string; ingredient_id: string; qty: number | string }[]) {
    const ing = ingById.get(r.ingredient_id); if (!ing) continue;
    (saved[r.product_id] ??= []).push({ name: ing.name, unit: ing.unit as SavedRow["unit"], qty: Number(r.qty), price: ing.ref_price == null ? null : Number(ing.ref_price) });
  }
  const products = ((pRes.data ?? []) as P[]).map((p) => ({
    id: p.id, name: p.name, sku: p.sku, sell_price: Number(p.sell_price), stock_qty: Number(p.stock_qty), stock_value: Number(p.stock_value), min_stock: Number(p.min_stock),
  }));
  const moves = (mRes.data ?? []) as M[];
  const nameOf = new Map(products.map((p) => [p.id, p.name]));

  const stockValue = products.reduce((s, p) => s + toCents(p.stock_value), 0);
  const empty = products.filter((p) => p.stock_qty <= 0).length;
  const low = products.filter((p) => p.stock_qty > 0 && p.min_stock > 0 && p.stock_qty <= p.min_stock).length;
  const glInv = bal.find((r) => r.code === "1-1400")?.cents ?? 0;
  const gap = glInv - stockValue;

  return (
    <>
      <PageHead title="Produk & Persediaan" desc={bizType === "fnb" ? "Menu, stok, dan resep. Sistem memberi saran takaran bahan yang lazim dipakai di lapangan." : "Daftar barang dagangan, jumlah stok, dan modalnya. Saat barang terjual, modalnya (HPP) dicatat otomatis."}>
        <BusinessTypeSwitch businessId={biz.id} value={bizType} />
      </PageHead>
      {bizType === "umum" && products.length === 0 && (
        <Callout title="Usaha makanan atau minuman?">Pilih <strong>Makanan &amp; Minuman</strong> di kanan atas. Anda akan mendapat saran takaran bahan per porsi (misalnya untuk pecel lele, nasi goreng, es teh), perhitungan biaya per porsi, dan rencana belanja bahan.</Callout>
      )}
      <div className="kpis">
        <Kpi label="Jumlah produk" value={String(products.length)} icon="box" tone="pri" hint={empty > 0 ? `${empty} produk stoknya habis` : "Semua punya stok"} />
        <Kpi label="Stok menipis" value={String(low)} icon="alert" tone={low > 0 ? "neg" : "pos"} hint={low > 0 ? "Sudah di bawah batas minimum" : "Tidak ada yang di bawah batas"} />
        <Kpi label="Nilai stok (modal)" value={idr(stockValue)} icon="coin" hint="Harga beli × jumlah stok" />
      </div>
      {Math.abs(gap) >= 1 && products.length > 0 && (
        <Callout tone="warn" title="Nilai stok berbeda dengan catatan keuangan">
          Catatan keuangan (Persediaan Barang) menunjukkan {idr(glInv)}, sedangkan nilai stok produk {idr(stockValue)}. Biasanya ini karena ada pembelian yang dicatat lewat menu Pembelian, bukan lewat “Tambah stok”. Untuk barang dagangan, gunakan “Tambah stok” di halaman ini.
        </Callout>
      )}
      {bizType === "fnb" && (
        <Panel title="Resep & takaran bahan" desc="Saran takaran per porsi untuk menu umum, hitung biaya per porsi, dan rencanakan belanja bahan">
          <RecipePanel key={products.map((p) => p.id).join(",")} businessId={biz.id} products={products.map((p) => ({ id: p.id, name: p.name, sell_price: p.sell_price }))} saved={saved} />
        </Panel>
      )}
      <div className="split">
        <Panel title="Kelola stok"><ProductActions businessId={biz.id} products={products} cashAccounts={cash.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))} /></Panel>
        <div className="stack">
          <Panel title="Daftar produk">
            {products.length === 0 ? (
              <Empty icon="box" title="Belum ada produk" desc="Tambahkan produk pertama Anda di panel kiri, lalu isi stoknya." />
            ) : (
              <div className="table-wrap"><table>
                <thead><tr>
                  <th>Produk</th><th className="num"><Term tip="Jumlah barang yang tersedia. Atur Stok minimum lewat tombol Ubah; Anda diberi tanda saat stok menipis.">Stok</Term></th>
                  <th className="num"><Term tip="Rata-rata harga beli per barang. Dipakai menghitung modal saat barang terjual.">Modal/unit</Term></th>
                  <th className="num">Harga jual</th><th className="num"><Term tip="Keuntungan per barang dibanding harga jualnya. Contoh: modal 10.000, jual 15.000 → margin 33%.">Margin</Term></th><th />
                </tr></thead>
                <tbody>{products.map((p) => {
                  const unit = p.stock_qty > 0 ? p.stock_value / p.stock_qty : 0;
                  const margin = p.sell_price > 0 && unit > 0 ? Math.round(((p.sell_price - unit) / p.sell_price) * 100) : null;
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong>{p.sku && <small className="sub">{p.sku}</small>}</td>
                      <td className="num">{p.stock_qty <= 0 ? <Badge tone="neg">Habis</Badge> : <>{qtyFmt(p.stock_qty)}{p.min_stock > 0 && p.stock_qty <= p.min_stock && <> <Badge tone="warn">Menipis</Badge></>}</>}{p.min_stock > 0 && <small className="sub">Min. {qtyFmt(p.min_stock)}</small>}</td>
                      <td className="num">{unit > 0 ? idr(toCents(unit)) : "–"}</td>
                      <td className="num">{idr(toCents(p.sell_price))}</td>
                      <td className="num">{margin == null ? "–" : <Badge tone={margin >= 20 ? "pos" : margin >= 0 ? "warn" : "neg"}>{margin}%</Badge>}</td>
                      <td><ProductRowActions id={p.id} name={p.name} price={p.sell_price} minStock={p.min_stock} /></td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            )}
          </Panel>
          <Panel title="Pergerakan stok terbaru">
            {moves.length === 0 ? <p className="muted sm">Belum ada pergerakan stok.</p> : (
              <div className="table-wrap"><table>
                <thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th className="num">Jumlah</th><th className="num">Nilai</th></tr></thead>
                <tbody>{moves.map((m) => {
                  const t = MOV[m.movement] ?? { label: m.movement, tone: "warn" as const };
                  const q = Number(m.qty);
                  return (
                    <tr key={m.id}><td>{fmtDate(m.moved_on)}</td><td>{m.product_id ? nameOf.get(m.product_id) ?? "(disembunyikan)" : "–"}</td>
                      <td><Badge tone={t.tone}>{t.label}</Badge></td><td className="num">{qtyFmt(q)}</td><td className="num">{idr(toCents(Number(m.total_cost)))}</td></tr>
                  );
                })}</tbody>
              </table></div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
