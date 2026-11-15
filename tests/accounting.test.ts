import { test } from "node:test";
import assert from "node:assert/strict";
import { toCents } from "../src/lib/accounting/money.ts";
import type { Account, JournalEntry } from "../src/lib/accounting/types.ts";
import { post, reverse, assertEditable, transferEntry, JournalError } from "../src/lib/accounting/journal.ts";
import {
  trialBalance, incomeStatement, balanceSheet, cashFlow, cashReconciles, generalLedger, breakEvenRevenue,
} from "../src/lib/accounting/reports.ts";
import { receive, issue, recipeCost, marginPct } from "../src/lib/accounting/inventory.ts";

const A = (id: string, name: string, type: Account["type"], isCash = false): Account => ({
  id, code: id, name, type, isCash,
  normalBalance: type === "asset" || type === "expense" || type === "cogs" ? "debit" : "credit",
});
const accounts: Account[] = [
  A("kas", "Kas", "asset", true),
  A("bank", "Bank BCA", "asset", true),
  A("piutang", "Piutang Usaha", "asset"),
  A("persediaan", "Persediaan", "asset"),
  A("utang", "Utang Usaha", "liability"),
  A("modal", "Modal Pemilik", "equity"),
  A("jual", "Penjualan", "revenue"),
  A("hpp", "HPP", "cogs"),
  A("sewa", "Beban Sewa", "expense"),
];

let n = 0;
const E = (date: string, description: string, lines: [string, number, number][]): JournalEntry =>
  ({ id: `j${++n}`, number: `JU-${n}`, date, description, status: "draft",
     lines: lines.map(([accountId, debit, credit]) => ({ accountId, debit: toCents(debit), credit: toCents(credit) })) });

const posted = (e: JournalEntry) => post(e, accounts);

function sample(): JournalEntry[] {
  return [
    posted(E("2026-01-01", "Setoran modal", [["kas", 10_000_000, 0], ["modal", 0, 10_000_000]])),
    posted(E("2026-01-02", "Pembelian stok kredit", [["persediaan", 4_000_000, 0], ["utang", 0, 4_000_000]])),
    posted(E("2026-01-10", "Penjualan tunai", [["kas", 3_000_000, 0], ["jual", 0, 3_000_000]])),
    posted(E("2026-01-10", "HPP", [["hpp", 1_800_000, 0], ["persediaan", 0, 1_800_000]])),
    posted(E("2026-01-15", "Penjualan kredit", [["piutang", 2_000_000, 0], ["jual", 0, 2_000_000]])),
    posted(E("2026-01-20", "Bayar sewa", [["sewa", 1_000_000, 0], ["kas", 0, 1_000_000]])),
  ];
}

test("jurnal tidak seimbang ditolak", () => {
  const bad = E("2026-01-01", "x", [["kas", 100, 0], ["jual", 0, 90]]);
  assert.throws(() => post(bad, accounts), JournalError);
});

test("baris dengan debit dan kredit sekaligus ditolak", () => {
  const bad = E("2026-01-01", "x", [["kas", 100, 100], ["jual", 0, 0]]);
  assert.throws(() => post(bad, accounts), JournalError);
});

test("akun tidak dikenal ditolak", () => {
  const bad = E("2026-01-01", "x", [["kas", 100, 0], ["zzz", 0, 100]]);
  assert.throws(() => post(bad, accounts), JournalError);
});

test("jurnal posted tidak bisa diedit, hanya dibalik", () => {
  const e = posted(E("2026-01-01", "x", [["kas", 100, 0], ["jual", 0, 100]]));
  assert.throws(() => assertEditable(e), JournalError);
  const { original, reversal } = reverse(e, "r1", "JU-R1", "2026-01-02");
  assert.equal(original.status, "reversed");
  assert.equal(reversal.lines[0].credit, e.lines[0].debit);
});

test("pembalikan menetralkan saldo", () => {
  const e = posted(E("2026-01-01", "x", [["kas", 100, 0], ["jual", 0, 100]]));
  const { original, reversal } = reverse(e, "r1", "JU-R1", "2026-01-02");
  const tb = trialBalance(accounts, [original, reversal]);
  assert.equal(tb.rows.length, 0);
});

test("draft tidak mempengaruhi laporan", () => {
  const draft = E("2026-01-01", "x", [["kas", 100, 0], ["jual", 0, 100]]);
  assert.equal(trialBalance(accounts, [draft]).rows.length, 0);
});

test("neraca saldo seimbang", () => {
  const tb = trialBalance(accounts, sample());
  assert.equal(tb.balanced, true);
  assert.equal(tb.totalDebit, tb.totalCredit);
});

test("laba rugi", () => {
  const is = incomeStatement(accounts, sample(), { from: "2026-01-01", to: "2026-01-31" });
  assert.equal(is.revenue, toCents(5_000_000));
  assert.equal(is.cogs, toCents(1_800_000));
  assert.equal(is.grossProfit, toCents(3_200_000));
  assert.equal(is.expenses, toCents(1_000_000));
  assert.equal(is.netIncome, toCents(2_200_000));
});

test("neraca seimbang (Aset = Kewajiban + Ekuitas)", () => {
  const bs = balanceSheet(accounts, sample(), "2026-01-31");
  assert.equal(bs.balanced, true);
  assert.equal(bs.assets, toCents(10_000_000 + 3_000_000 - 1_000_000 + 4_000_000 - 1_800_000 + 2_000_000));
  assert.equal(bs.currentEarnings, toCents(2_200_000));
});

test("arus kas: operasional vs pendanaan, dan rekonsiliasi dengan saldo kas", () => {
  const cf = cashFlow(accounts, sample(), { from: "2026-01-01", to: "2026-01-31" });
  assert.equal(cf.financing, toCents(10_000_000));
  assert.equal(cf.operating, toCents(3_000_000 - 1_000_000));
  assert.equal(cf.closing, toCents(12_000_000));
  assert.equal(cashReconciles(accounts, sample(), { from: "2026-01-01", to: "2026-01-31" }), true);
});

test("transfer antar rekening bukan pendapatan/beban dan tidak mengubah arus kas bersih", () => {
  const entries = [
    ...sample(),
    post(transferEntry({ id: "t1", number: "TF-1", date: "2026-01-25" }, "kas", "bank", toCents(5_000_000)), accounts),
  ];
  const is = incomeStatement(accounts, entries, { from: "2026-01-01", to: "2026-01-31" });
  assert.equal(is.netIncome, toCents(2_200_000));
  const cf = cashFlow(accounts, entries, { from: "2026-01-01", to: "2026-01-31" });
  assert.equal(cf.closing, toCents(12_000_000));
  assert.equal(cashReconciles(accounts, entries, { from: "2026-01-01", to: "2026-01-31" }), true);
});

test("transfer ke rekening yang sama ditolak", () => {
  assert.throws(() => transferEntry({ id: "t", number: "t", date: "2026-01-01" }, "kas", "kas", 1), JournalError);
});

test("pembayaran sebagian piutang menurunkan saldo piutang", () => {
  const entries = [
    ...sample(),
    posted(E("2026-02-01", "Terima pembayaran sebagian", [["bank", 800_000, 0], ["piutang", 0, 800_000]])),
  ];
  const { rows } = trialBalance(accounts, entries);
  const piutang = rows.find((r) => r.account.id === "piutang")!;
  assert.equal(piutang.debit, toCents(1_200_000));
});

test("pembayaran sebagian utang menurunkan saldo utang", () => {
  const entries = [
    ...sample(),
    posted(E("2026-02-01", "Bayar supplier sebagian", [["utang", 1_500_000, 0], ["kas", 0, 1_500_000]])),
  ];
  const { rows } = trialBalance(accounts, entries);
  const utang = rows.find((r) => r.account.id === "utang")!;
  assert.equal(utang.credit, toCents(2_500_000));
});

test("buku besar dengan saldo berjalan", () => {
  const rows = generalLedger(accounts.find((a) => a.id === "kas")!, sample());
  assert.equal(rows.at(-1)!.balance, toCents(12_000_000));
});

test("HPP rata-rata tertimbang", () => {
  let s = { qty: 0, value: 0 };
  s = receive(s, 100, toCents(10)); // 100 @ 10
  s = receive(s, 100, toCents(20)); // 100 @ 20 -> rata-rata 15
  const r = issue(s, 50);
  assert.equal(r.cogs, toCents(15) * 50);
  assert.equal(r.state.qty, 150);
  assert.throws(() => issue(r.state, 1000));
});

test("HPP resep dan margin", () => {
  const cost = recipeCost([{ qty: 0.2, unitCost: toCents(50_000) }, { qty: 2, unitCost: toCents(1_000) }]);
  assert.equal(cost, toCents(10_000 + 2_000));
  assert.equal(marginPct(toCents(25_000), cost)!.toFixed(1), "52.0");
});

test("BEP", () => {
  assert.equal(breakEvenRevenue(1_000_000, 5_000_000, 1_800_000), Math.ceil(1_000_000 / 0.64));
  assert.equal(breakEvenRevenue(1, 0, 0), null);
});
