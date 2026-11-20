/** Garis tren mini (SVG murni) dari deret angka nyata. Tidak digambar bila data kurang dari 2 titik atau seluruhnya nol. */
export default function Sparkline({ values, tone = "pri", label }: { values: number[]; tone?: "pri" | "pos" | "neg"; label: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const W = 120, H = 32, P = 3;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [P + (i * (W - 2 * P)) / (values.length - 1), H - P - ((v - min) / span) * (H - 2 * P)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className={`spark ${tone}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
      <path d={`${d} L${last[0]} ${H} L${pts[0][0]} ${H} Z`} className="spark-fill" />
      <path d={d} className="spark-line" fill="none" />
      <circle cx={last[0]} cy={last[1]} r="2.6" className="spark-dot" />
    </svg>
  );
}
