import { compactIDR, monthShort } from "@/lib/format";
import type { MonthPoint } from "@/lib/data";

/** Grafik batang pendapatan vs biaya per bulan (SVG murni, dirender di server). Nilai dalam sen. */
export default function MonthlyChart({ points }: { points: MonthPoint[] }) {
  const W = 600, H = 230, L = 52, R = 8, T = 12, B = 28;
  const rows = points.map((p) => ({ m: p.month, rev: p.revenue / 100, exp: (p.cogs + p.expense) / 100 }));
  const raw = Math.max(1, ...rows.flatMap((r) => [r.rev, r.exp]));
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = mag / 2;
  const top = Math.ceil(raw / step) * step;
  const iw = W - L - R, ih = H - T - B;
  const y = (v: number) => T + ih - (v / top) * ih;
  const band = iw / rows.length, bw = Math.min(26, band / 3);
  const ticks = [0, 0.5, 1].map((t) => t * top);
  const summary = rows.map((r) => `${monthShort(r.m)}: pendapatan ${compactIDR(r.rev)}, biaya ${compactIDR(r.exp)}`).join("; ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Pendapatan dan biaya ${rows.length} bulan terakhir. ${summary}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="axis">{compactIDR(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = L + band * i + band / 2;
          return (
            <g key={r.m}>
              <rect x={cx - bw - 2} y={y(r.rev)} width={bw} height={Math.max(0, T + ih - y(r.rev))} rx={4} className="bar-rev" />
              <rect x={cx + 2} y={y(r.exp)} width={bw} height={Math.max(0, T + ih - y(r.exp))} rx={4} className="bar-exp" />
              <text x={cx} y={H - 8} textAnchor="middle" className="axis">{monthShort(r.m)}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend"><span><i className="dot rev" />Pendapatan</span><span><i className="dot exp" />Biaya (HPP + beban)</span></div>
    </div>
  );
}
