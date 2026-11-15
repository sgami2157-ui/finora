import type { Cents } from "./money.ts";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "cogs"
  | "expense";

export type NormalBalance = "debit" | "credit";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  /** true untuk akun kas/bank (dipakai laporan arus kas) */
  isCash?: boolean;
}

export interface JournalLine {
  accountId: string;
  debit: Cents;
  credit: Cents;
  memo?: string;
}

export type JournalStatus = "draft" | "posted" | "reversed";

export interface JournalEntry {
  id: string;
  number: string;
  date: string; // YYYY-MM-DD
  description: string;
  status: JournalStatus;
  lines: JournalLine[];
  reversesId?: string;
}

export const NORMAL_BALANCE: Record<AccountType, NormalBalance> = {
  asset: "debit",
  expense: "debit",
  cogs: "debit",
  liability: "credit",
  equity: "credit",
  revenue: "credit",
};
