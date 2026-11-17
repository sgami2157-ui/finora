import { compactIDR, fmtDate } from "@/lib/format";
import { idr, type Gran, type PeriodPoint } from "@/lib/data";

const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function lab(p: string, g: Gran) {
  const [y, m, d] = p.split("-").map(Number);
  if (g === "year") return String(y);
  if (g === "month") return `${MON[m - 1]}${m === 1 ? " " + String(y).slice(2) : ""}`;
  return `${d} ${MON[m - 1]}`;
}

/** Pendapatan, pengeluaran (batang) dan arus kas bersih (garis). SVG server; tooltip lewat <title> saat hover/sentuh. */
export default function CashflowChart({ points, gran }: { points: PeriodPoint[]; gran: Gran }) {
  const W = 640, H = 250, L = 54, R = 10, T = 14, B = 30;
  const rows = points.map((p) => ({ ...p, exp: p.cogs + p.expense }));
  const vals = rows.flatMap((r) => [r.revenue, r.exp, r.cashNet]).map((v) => v / 100);
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(max, -min))));
  const step = mag / 2;
  const top = Math.ceil(max / step) * step, bot = Math.floor(min / step) * step;
  const iw = W - L - R, ih = H - T - B;
  const y = (v: number) => T + ih - ((v - bot) / (top - bot || 1)) * ih;
  const band = iw / rows.length, bw = Math.min(22, band / 3.2);
  const ticks = [bot, (bot + top) / 2, top];
  const line = rows.map((r, i) => `${i ? "L" : "M"}${(L + band * i + band / 2).toFixed(1)},${y(r.cashNet / 100).toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Arus kas ${rows.length} periode. ` + rows.map((r) => `${lab(r.period, gran)}: pendapatan ${compactIDR(r.revenue / 100)}, pengeluaran ${compactIDR(r.exp / 100)}, arus kas bersih ${compactIDR(r.cashNet / 100)}`).join("; ")}>
        {ticks.map((t) => (
          <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid-line" /><text x={L - 8} y={y(t) + 4} textAnchor="end" className="axis">{compactIDR(t)}</text></g>
        ))}
        {rows.map((r, i) => {
          const cx = L + band * i + band / 2;
          return (
            <g key={r.period} className="cf-col" tabIndex={0}>
              <title>{`${fmtDate(r.period)}\nPendapatan ${idr(r.revenue)}\nPengeluaran ${idr(r.exp)}\nArus kas bersih ${idr(r.cashNet)}`}</title>
              <rect x={cx - band / 2} y={T} width={band} height={ih} className="cf-hit" />
              <rect x={cx - bw - 1} y={y(r.revenue / 100)} width={bw} height={Math.max(0, y(0) - y(r.revenue / 100))} rx={3} className="bar-rev" />
              <rect x={cx + 1} y={y(r.exp / 100)} width={bw} height={Math.max(0, y(0) - y(r.exp / 100))} rx={3} className="bar-exp" />
              <text x={cx} y={H - 9} textAnchor="middle" className="axis">{lab(r.period, gran)}</text>
            </g>
          );
        })}
        <path d={line} className="cf-line" fill="none" />
        {rows.map((r, i) => <circle key={r.period} cx={L + band * i + band / 2} cy={y(r.cashNet / 100)} r={3.5} className="cf-dot" />)}
      </svg>
      <div className="legend"><span><i className="dot rev" />Pendapatan</span><span><i className="dot exp" />Pengeluaran (HPP + beban)</span><span><i className="dot net" />Arus kas bersih</span></div>
    </div>
  );
}
