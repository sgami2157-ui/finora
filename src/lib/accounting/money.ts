/** Semua nominal dihitung dalam sen (bilangan bulat) agar bebas galat floating point. */
export type Cents = number;

export function toCents(amount: number | string): Cents {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) throw new Error("Nominal tidak valid");
  return Math.round(n * 100);
}

export function fromCents(c: Cents): number {
  return c / 100;
}

export function formatIDR(c: Cents): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(fromCents(c));
}
