import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, toCsv } from "../src/lib/csv.ts";

test("csvCell mengutip dan menggandakan tanda kutip", () => assert.equal(csvCell('a"b'), '"a""b"'));
test("csvCell menetralkan formula injection", () => { assert.equal(csvCell("=1+1"), `"'=1+1"`); assert.equal(csvCell("@x"), `"'@x"`); });
test("csvCell tidak merusak angka negatif", () => assert.equal(csvCell(-12.5), '"-12.5"'));
test("csvCell null kosong dan objek jadi JSON", () => { assert.equal(csvCell(null), ""); assert.equal(csvCell({ a: 1 }), '"{""a"":1}"'); });
test("toCsv menyatukan kolom dari semua baris", () => {
  const out = toCsv([{ a: 1 }, { a: 2, b: "x" }]);
  assert.equal(out, '﻿"a","b"\r\n"1",\r\n"2","x"');
});
