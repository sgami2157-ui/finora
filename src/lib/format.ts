/** Format & tanggal yang aman dipakai di server maupun klien. Zona waktu aplikasi: Asia/Jakarta. */

const TZ = "Asia/Jakarta";

/** Tanggal hari ini (YYYY-MM-DD) menurut Asia/Jakarta, bukan UTC. */
export function todayJakarta(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "2026-11-16" -> "16 Nov 2026" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const [y, m, d] = iso.slice(0, 10).split("-");
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11 || !d) return iso;
  return `${Number(d)} ${MONTHS[mi]} ${y}`;
}

/** "2026-11-01" -> "Nov" */
export function monthShort(iso: string): string {
  return MONTHS[Number(iso.slice(5, 7)) - 1] ?? iso;
}

/** Selisih hari kalender (b - a) antara dua tanggal YYYY-MM-DD. */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b.slice(0, 10) + "T00:00:00Z") - Date.parse(a.slice(0, 10) + "T00:00:00Z");
  return Math.round(ms / 86_400_000);
}

/** Rupiah ringkas untuk sumbu grafik: 1.250.000 -> "1,3 jt". */
export function compactIDR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const f = (v: number, s: string) => `${sign}${(Math.round(v * 10) / 10).toString().replace(".", ",")} ${s}`;
  if (abs >= 1e12) return f(abs / 1e12, "T");
  if (abs >= 1e9) return f(abs / 1e9, "M");
  if (abs >= 1e6) return f(abs / 1e6, "jt");
  if (abs >= 1e3) return f(abs / 1e3, "rb");
  return `${sign}${abs}`;
}

/** Sapaan menurut jam Jakarta. */
export function greeting(d = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(d)) % 24;
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}
