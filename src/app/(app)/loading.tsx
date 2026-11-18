import BrandLoader from "@/components/BrandLoader";

/** Tampilan pemuatan halaman: loader FINORA di area konten, lalu kerangka agar tata letak tidak melompat. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="page-loading"><BrandLoader label="Memuat…" /></div>
      <div className="skeleton sk-title" />
      <div className="kpis">{[0, 1, 2].map((i) => <div key={i} className="skeleton sk-card" />)}</div>
    </div>
  );
}
