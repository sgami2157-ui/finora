import type { Account, JournalEntry, JournalLine } from "./types.ts";

export class JournalError extends Error {}

export function totals(lines: JournalLine[]) {
  let debit = 0;
  let credit = 0;
  for (const l of lines) {
    debit += l.debit;
    credit += l.credit;
  }
  return { debit, credit };
}

/** Validasi jurnal sebelum diposting. Melempar JournalError jika tidak valid. */
export function validateForPosting(entry: JournalEntry, accounts: Account[]): void {
  if (entry.status !== "draft") {
    throw new JournalError("Hanya jurnal draft yang dapat diposting");
  }
  if (entry.lines.length < 2) {
    throw new JournalError("Jurnal minimal memiliki dua baris");
  }
  const known = new Set(accounts.map((a) => a.id));
  for (const l of entry.lines) {
    if (!Number.isInteger(l.debit) || !Number.isInteger(l.credit)) {
      throw new JournalError("Nominal harus bilangan bulat (sen)");
    }
    if (l.debit < 0 || l.credit < 0) {
      throw new JournalError("Nominal tidak boleh negatif");
    }
    if ((l.debit > 0) === (l.credit > 0)) {
      throw new JournalError("Setiap baris harus berisi tepat satu sisi: debit ATAU kredit");
    }
    if (!known.has(l.accountId)) {
      throw new JournalError(`Akun tidak dikenal: ${l.accountId}`);
    }
  }
  const t = totals(entry.lines);
  if (t.debit !== t.credit) {
    throw new JournalError(`Jurnal tidak seimbang: debit ${t.debit} ≠ kredit ${t.credit}`);
  }
  if (t.debit === 0) throw new JournalError("Total jurnal tidak boleh nol");
}

export function post(entry: JournalEntry, accounts: Account[]): JournalEntry {
  validateForPosting(entry, accounts);
  return { ...entry, status: "posted" };
}

/** Koreksi jurnal yang sudah diposting: buat jurnal pembalik (debit/kredit ditukar). */
export function reverse(
  entry: JournalEntry,
  newId: string,
  newNumber: string,
  date: string,
): { original: JournalEntry; reversal: JournalEntry } {
  if (entry.status !== "posted") {
    throw new JournalError("Hanya jurnal posted yang dapat dibalik");
  }
  const reversal: JournalEntry = {
    id: newId,
    number: newNumber,
    date,
    description: `Pembalikan ${entry.number}: ${entry.description}`,
    status: "posted",
    reversesId: entry.id,
    lines: entry.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
  };
  return { original: { ...entry, status: "reversed" }, reversal };
}

/** Jurnal posted tidak boleh diubah. */
export function assertEditable(entry: JournalEntry): void {
  if (entry.status !== "draft") {
    throw new JournalError("Jurnal yang sudah diposting tidak dapat diedit; gunakan pembalikan");
  }
}

// --- Pembantu pembuatan jurnal umum untuk transaksi sehari-hari ---

export function transferEntry(
  base: Pick<JournalEntry, "id" | "number" | "date">,
  fromCashId: string,
  toCashId: string,
  amount: number,
): JournalEntry {
  if (fromCashId === toCashId) throw new JournalError("Rekening asal dan tujuan harus berbeda");
  return {
    ...base,
    description: "Transfer antar rekening",
    status: "draft",
    lines: [
      { accountId: toCashId, debit: amount, credit: 0 },
      { accountId: fromCashId, debit: 0, credit: amount },
    ],
  };
}
