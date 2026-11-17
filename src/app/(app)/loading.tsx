/** Kerangka pemuatan agar halaman terasa responsif saat data diambil. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="skeleton sk-title" />
      <div className="skeleton sk-line" />
      <div className="kpis">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton sk-card" />)}</div>
      <div className="skeleton sk-block" />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
