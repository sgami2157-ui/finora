import type { Account, JournalEntry } from "./types.ts";

export interface Period {
  from?: string; // inklusif
  to?: string; // inklusif
}

function inPeriod(date: string, p: Period): boolean {
  if (p.from && date < p.from) return false;
  if (p.to && date > p.to) return false;
  return true;
}

/** Hanya jurnal posted (dan reversed asli, yang telah dinetralkan pembaliknya) dihitung. */
function countable(e: JournalEntry): boolean {
  return e.status === "posted" || e.status === "reversed";
}

export interface TrialBalanceRow {
  account: Account;
  debit: number;
  credit: number;
}

/** Saldo bersih per akun dalam sisi normalnya (sen). */
export function accountBalances(
  accounts: Account[],
  entries: JournalEntry[],
  period: Period = {},
): Map<string, number> {
  const net = new Map<string, number>(); // debit - kredit
  for (const e of entries) {
    if (!countable(e) || !inPeriod(e.date, period)) continue;
    for (const l of e.lines) {
      net.set(l.accountId, (net.get(l.accountId) ?? 0) + l.debit - l.credit);
    }
  }
  const out = new Map<string, number>();
  for (const a of accounts) {
    const n = net.get(a.id) ?? 0;
    out.set(a.id, a.normalBalance === "debit" ? n : -n);
  }
  return out;
}

export function trialBalance(accounts: Account[], entries: JournalEntry[], period: Period = {}) {
  const bal = accountBalances(accounts, entries, period);
  const rows: TrialBalanceRow[] = [];
  let debit = 0;
  let credit = 0;
  for (const a of accounts) {
    const b = bal.get(a.id) ?? 0;
    if (b === 0) continue;
    // b dalam sisi normal; jika negatif, pindah ke sisi lawan
    const onNormal = b >= 0;
    const isDebit = (a.normalBalance === "debit") === onNormal;
    const amt = Math.abs(b);
    rows.push({ account: a, debit: isDebit ? amt : 0, credit: isDebit ? 0 : amt });
    if (isDebit) debit += amt;
    else credit += amt;
  }
  return { rows, totalDebit: debit, totalCredit: credit, balanced: debit === credit };
}

export function incomeStatement(accounts: Account[], entries: JournalEntry[], period: Period) {
  const bal = accountBalances(accounts, entries, period);
  const sum = (t: Account["type"]) =>
    accounts.filter((a) => a.type === t).reduce((s, a) => s + (bal.get(a.id) ?? 0), 0);
  const revenue = sum("revenue");
  const cogs = sum("cogs");
  const expenses = sum("expense");
  return {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    expenses,
    netIncome: revenue - cogs - expenses,
  };
}

/**
 * Neraca per tanggal. Laba berjalan (semua pendapatan - beban s.d. tanggal itu)
 * dimasukkan ke ekuitas sehingga persamaan Aset = Kewajiban + Ekuitas terpenuhi
 * sebelum jurnal penutup dibuat.
 */
export function balanceSheet(accounts: Account[], entries: JournalEntry[], asOf: string) {
  const bal = accountBalances(accounts, entries, { to: asOf });
  const sum = (t: Account["type"]) =>
    accounts.filter((a) => a.type === t).reduce((s, a) => s + (bal.get(a.id) ?? 0), 0);
  const assets = sum("asset");
  const liabilities = sum("liability");
  const equityAccounts = sum("equity");
  const currentEarnings = sum("revenue") - sum("cogs") - sum("expense");
  const equity = equityAccounts + currentEarnings;
  return {
    assets,
    liabilities,
    equityAccounts,
    currentEarnings,
    equity,
    balanced: assets === liabilities + equity,
  };
}

/**
 * Arus kas metode langsung: pergerakan akun kas/bank dikelompokkan berdasarkan
 * akun lawan. Transfer antar akun kas dikeluarkan (net nol, bukan operasional).
 */
export function cashFlow(accounts: Account[], entries: JournalEntry[], period: Period) {
  const cashIds = new Set(accounts.filter((a) => a.isCash).map((a) => a.id));
  const byId = new Map(accounts.map((a) => [a.id, a]));
  let operating = 0;
  let investing = 0;
  let financing = 0;
  for (const e of entries) {
    if (!countable(e) || !inPeriod(e.date, period)) continue;
    const cashNet = e.lines
      .filter((l) => cashIds.has(l.accountId))
      .reduce((s, l) => s + l.debit - l.credit, 0);
    if (cashNet === 0) continue; // termasuk transfer internal
    const others = e.lines.filter((l) => !cashIds.has(l.accountId));
    const hasEquityOrDebt = others.some((l) => {
      const t = byId.get(l.accountId)?.type;
      return t === "equity";
    });
    const hasFixedAsset = others.some((l) => byId.get(l.accountId)?.name.toLowerCase().includes("peralatan"));
    if (hasEquityOrDebt) financing += cashNet;
    else if (hasFixedAsset) investing += cashNet;
    else operating += cashNet;
  }
  const openingEntries = entries.filter((e) => period.from && e.date < period.from);
  const opening = [...accountBalances(accounts.filter((a) => a.isCash), openingEntries).values()].reduce((s, v) => s + v, 0);
  const net = operating + investing + financing;
  return { operating, investing, financing, net, opening, closing: opening + net };
}

/** Rekonsiliasi: saldo akhir arus kas harus sama dengan total saldo akun kas di neraca saldo. */
export function cashReconciles(accounts: Account[], entries: JournalEntry[], period: Period): boolean {
  const cf = cashFlow(accounts, entries, period);
  const bal = accountBalances(accounts.filter((a) => a.isCash), entries, { to: period.to });
  const total = [...bal.values()].reduce((s, v) => s + v, 0);
  return cf.closing === total;
}

/** Buku besar satu akun dengan saldo berjalan. */
export function generalLedger(account: Account, entries: JournalEntry[], period: Period = {}) {
  let running = 0;
  const rows: { date: string; number: string; description: string; debit: number; credit: number; balance: number }[] = [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
  for (const e of sorted) {
    if (!countable(e)) continue;
    for (const l of e.lines.filter((x) => x.accountId === account.id)) {
      const delta = account.normalBalance === "debit" ? l.debit - l.credit : l.credit - l.debit;
      running += delta;
      if (inPeriod(e.date, period)) {
        rows.push({ date: e.date, number: e.number, description: e.description, debit: l.debit, credit: l.credit, balance: running });
      }
    }
  }
  return rows;
}

/** Impas (BEP) dalam rupiah omzet: biaya tetap / margin kontribusi. Null jika data tidak cukup. */
export function breakEvenRevenue(fixedCosts: number, revenue: number, variableCosts: number): number | null {
  if (revenue <= 0) return null;
  const cm = (revenue - variableCosts) / revenue;
  if (cm <= 0) return null;
  return Math.ceil(fixedCosts / cm);
}
