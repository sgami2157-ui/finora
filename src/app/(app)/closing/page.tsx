import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness, idr } from "@/lib/data";
import { toCents } from "@/lib/accounting/money";
import { fmtDate, todayJakarta } from "@/lib/format";
import { Badge, Callout, Empty, PageHead, Panel } from "@/components/ui";
import { CloseMonthForm, CloseYearForm, ReopenForm } from "@/components/ClosingForms";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m 1..12
const monthEnd = (y: number, m: number) => `${y}-${pad(m)}-${pad(lastDay(y, m))}`;
const ACTION: Record<string, string> = { close_month: "Tutup bulan", close_year: "Tutup tahun", reopen: "Buka kembali" };

export default async function ClosingPage() {
  const biz = await getBusiness();
  if (!biz) return (<><PageHead title="Tutup Buku" /><Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty></>);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const today = todayJakarta();
  const [ty, tm] = today.split("-").map(Number);

  const [{ data: st }, { data: first }, { data: closed }, { data: log }, { data: me }] = await Promise.all([
    sb.from("business_settings").select("locked_until").eq("business_id", biz.id).maybeSingle(),
    sb.from("journal_entries").select("entry_date").eq("business_id", biz.id).in("status", ["posted", "reversed"]).neq("kind", "closing").order("entry_date", { ascending: true }).limit(1).maybeSingle(),
    sb.from("journal_entries").select("entry_date").eq("business_id", biz.id).eq("kind", "closing").eq("status", "posted").is("reverses_id", null).order("entry_date"),
    sb.from("period_closings").select("id,action,locked_until,period_year,net_income,note,created_at").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(15),
    sb.from("business_members").select("role").eq("business_id", biz.id).eq("user_id", user?.id ?? "").maybeSingle(),
  ]);
  const lock: string | null = st?.locked_until ?? null;
  const role = me?.role as string | undefined;
  const canClose = role === "owner" || role === "admin";
  const closedYearEnds = (closed ?? []).map((c) => c.entry_date as string);
  const closedYears = new Set(closedYearEnds.map((d) => Number(d.slice(0, 4))));

  // Bulan yang bisa dikunci: setelah batas kunci (atau bulan transaksi pertama) sampai bulan lalu.
  const firstDate = first?.entry_date as string | undefined;
  let y = firstDate ? Number(firstDate.slice(0, 4)) : ty, m = firstDate ? Number(firstDate.slice(5, 7)) : tm;
  if (lock) { const [ly, lm] = lock.split("-").map(Number); if (lm === 12) { y = ly + 1; m = 1; } else { y = ly; m = lm + 1; } }
  const months: { value: string; label: string }[] = [];
  while ((y < ty || (y === ty && m < tm)) && months.length < 60) { months.push({ value: `${y}-${pad(m)}-01`, label: `${MONTHS[m - 1]} ${y}` }); m++; if (m > 12) { m = 1; y++; } }

  // Tahun berikutnya yang bisa ditutup (urut dari yang tertua).
  const fy = firstDate ? Number(firstDate.slice(0, 4)) : ty;
  let yearToClose: number | null = null;
  for (let yy = fy; yy < ty; yy++) if (!closedYears.has(yy)) { yearToClose = yy; break; }
  let yearNet = 0;
  if (yearToClose) { const { data: n } = await sb.rpc("pnl_net", { p_business: biz.id, p_from: `${yearToClose}-01-01`, p_to: `${yearToClose}-12-31` }); yearNet = toCents(Number(n ?? 0)); }

  // Target pembukaan kembali: akhir bulan sebelum batas kunci, terbaru dulu.
  const targets: { value: string; label: string }[] = [];
  if (lock) {
    let [ry, rm] = lock.split("-").map(Number);
    rm -= 1; if (rm < 1) { rm = 12; ry -= 1; }
    while (targets.length < 24 && (!firstDate || monthEnd(ry, rm) >= firstDate.slice(0, 7) + "-01")) { targets.push({ value: monthEnd(ry, rm), label: `Akhir ${MONTHS[rm - 1]} ${ry} (buka mulai ${MONTHS[rm % 12]} ${rm === 12 ? ry + 1 : ry})` }); rm -= 1; if (rm < 1) { rm = 12; ry -= 1; } }
    targets.push({ value: "", label: "Buka semua periode" });
  }

  return (
    <>
      <PageHead title="Tutup Buku" desc="Kunci bulan yang sudah selesai agar angkanya tidak berubah, dan tutup tahun untuk memindahkan laba ke modal." />
      <Callout title="Apa gunanya?">
        Setelah sebuah bulan <b>dikunci</b>, tidak ada transaksi yang bisa ditambahkan atau diubah di bulan itu, sehingga laporan yang sudah Anda pakai (pajak, bank, investor) tetap sama. <b>Tutup tahun</b> memindahkan laba atau rugi tahun itu ke Laba Ditahan supaya tahun baru mulai dari nol.
      </Callout>
      <div className="kpis mt">
        <Panel title="Status">
          {lock ? <p style={{ margin: 0 }}><Badge tone="pos">Terkunci</Badge> pembukuan sampai <strong>{fmtDate(lock)}</strong></p> : <p style={{ margin: 0 }} className="muted">Belum ada periode yang dikunci.</p>}
          <p className="muted sm" style={{ marginBottom: 0 }}>Tahun ditutup: {closedYears.size ? [...closedYears].sort().join(", ") : "belum ada"}</p>
        </Panel>
      </div>
      {!canClose ? (
        <Panel title="Akses terbatas" className="mt"><p className="muted sm" style={{ margin: 0 }}>Hanya pemilik atau admin usaha yang dapat menutup periode.</p></Panel>
      ) : (
        <div className="split mt">
          <div className="stack">
            <Panel title="Tutup bulan" desc="Kunci pembukuan sampai akhir bulan yang sudah selesai">
              {months.length === 0 ? <p className="muted sm" style={{ margin: 0 }}>Belum ada bulan selesai yang perlu dikunci.</p> : <CloseMonthForm businessId={biz.id} months={months} />}
            </Panel>
            <Panel title="Tutup tahun" desc="Pindahkan laba/rugi tahun ke Laba Ditahan">
              {yearToClose ? <CloseYearForm businessId={biz.id} year={yearToClose} netIncome={idr(yearNet)} /> : <p className="muted sm" style={{ margin: 0 }}>Tidak ada tahun selesai yang menunggu ditutup.</p>}
            </Panel>
          </div>
          <div className="stack">
            {role === "owner" && lock && (
              <Panel title="Buka kembali periode" desc="Untuk koreksi. Hanya pemilik, wajib disertai alasan.">
                <ReopenForm businessId={biz.id} targets={targets} closedYearEnds={closedYearEnds} />
              </Panel>
            )}
            <Panel title="Riwayat">
              {(log ?? []).length === 0 ? <p className="muted sm" style={{ margin: 0 }}>Belum ada riwayat penutupan.</p> : (
                <ul className="rows">{(log ?? []).map((l) => (
                  <li key={l.id} className="row-card"><div className="row-main"><div>
                    <strong>{ACTION[l.action] ?? l.action}{l.period_year ? ` ${l.period_year}` : ""}</strong>
                    <small className="sub">{fmtDate(l.created_at)} · {l.locked_until ? `kunci s.d. ${fmtDate(l.locked_until)}` : "tidak ada kunci"}{l.net_income != null ? ` · hasil ${idr(toCents(Number(l.net_income)))}` : ""}{l.note ? ` · ${l.note}` : ""}</small>
                  </div></div></li>
                ))}</ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
