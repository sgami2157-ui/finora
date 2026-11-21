/** Kerangka dashboard dengan efek kilau: ukuran sama dengan konten asli agar tidak ada lonjakan tata letak. */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Memuat dashboard">
      <div className="skeleton sk-title" />
      <div className="skeleton" style={{ height: 76, marginBottom: 16 }} />
      <div className="kpis kpis-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton sk-card" style={{ height: 132 }} />)}</div>
      <div className="skeleton" style={{ height: 300, marginTop: 16 }} />
    </div>
  );
}
