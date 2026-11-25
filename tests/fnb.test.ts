import test from "node:test";
import assert from "node:assert/strict";
import { matchDish, pricePerBase, recipeTotals, formatQty, DISHES } from "../src/lib/fnb-recipes.ts";

test("matchDish mengenali menu umum dan memilih kata kunci terpanjang", () => {
  assert.equal(matchDish("Pecel Lele Komplit")?.id, "pecel-lele");
  assert.equal(matchDish("Nasi goreng spesial")?.id, "nasi-goreng");
  assert.equal(matchDish("Es Teh Manis Jumbo")?.id, "es-teh");
  assert.equal(matchDish("Sate Ayam Madura")?.id, "sate-ayam");
  assert.equal(matchDish("Kopi Susu Aren")?.id, "kopi-susu");
  assert.equal(matchDish("Keripik Singkong"), null);
});
test("pecel lele menyertakan bahan pokok lele dan beras", () => {
  const d = matchDish("pecel lele")!;
  const pokok = d.items.filter((i) => i.pokok).map((i) => i.name);
  assert.ok(pokok.includes("Lele segar") && pokok.includes("Beras"));
  assert.equal(d.items.find((i) => i.name === "Lele segar")?.qty, 180);
});
test("semua takaran valid (>0, satuan g/ml/pcs, tanpa nama ganda)", () => {
  for (const d of DISHES) {
    const names = new Set<string>();
    for (const i of d.items) {
      assert.ok(i.qty > 0 && ["g", "ml", "pcs"].includes(i.unit), `${d.id}/${i.name}`);
      assert.ok(!names.has(i.name.toLowerCase()), `ganda ${d.id}/${i.name}`); names.add(i.name.toLowerCase());
    }
  }
});
test("harga per kg dikonversi ke per gram dan HPP dihitung dari bahan yang berharga saja", () => {
  assert.equal(pricePerBase("g", 40000), 40);
  assert.equal(pricePerBase("pcs", 2500), 2500);
  const t = recipeTotals([{ name: "Lele", qty: 180, unit: "g", price: 32 }, { name: "Beras", qty: 90, unit: "g", price: null }, { name: "Telur", qty: 1, unit: "pcs", price: 2500 }]);
  assert.equal(t.cost, 180 * 32 + 2500); assert.equal(t.priced, 2); assert.equal(t.missing, 1);
});
test("formatQty memakai kg/liter untuk jumlah besar", () => {
  assert.equal(formatQty(1800, "g"), "1,8 kg"); assert.equal(formatQty(250, "ml"), "250 ml"); assert.equal(formatQty(3, "pcs"), "3 pcs");
});
