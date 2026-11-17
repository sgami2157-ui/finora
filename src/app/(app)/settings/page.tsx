import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/data";
import DisconnectButton from "./DisconnectButton";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const MESSAGES: Record<string, string> = {
  ok: "Google Drive berhasil terhubung dan terverifikasi.",
  ditolak: "Izin Google ditolak.", invalid: "Permintaan tidak valid.", state: "Validasi keamanan (state) gagal.",
  sesi: "Sesi tidak cocok.", izin: "Hanya owner/admin yang dapat menghubungkan.", gagal: "Gagal menghubungkan Google Drive. Lihat log integrasi.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const biz = await getBusiness();
  if (!biz) return <Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty>;
  const sp = await searchParams;
  const sb = await supabaseServer();
  const { data: integ } = await sb.from("integrations_public").select("status,external_account,last_verified_at")
    .eq("business_id", biz.id).eq("provider", "google_drive").maybeSingle();
  const verified = integ?.status === "connected" && !!integ.last_verified_at;

  return (
    <>
      <PageHead title="Pengaturan" desc={biz.name} />
      {sp.google && <div className={`alert ${sp.google === "ok" ? "ok" : "err"}`} role="status" style={{ marginBottom: 16 }}>{MESSAGES[sp.google] ?? sp.google}</div>}
      <div className="split even">
        <Panel title="Google Drive" action={<Badge tone={verified ? "pos" : "muted"}>{verified ? "Terhubung" : "Belum terhubung"}</Badge>}>
          <div className="form">
            {verified && <p className="muted sm">Akun: {integ!.external_account} · diverifikasi {fmtDate(integ!.last_verified_at)}</p>}
            {verified ? <DisconnectButton businessId={biz.id} /> : <a href={`/api/google/auth?business=${biz.id}`}><button className="primary lg">Hubungkan Google Drive</button></a>}
            <small className="hint">Unggah dokumen, simpan laporan, dan backup ke Drive belum diimplementasikan di versi ini.</small>
          </div>
        </Panel>
        <Panel title="Macaly Cloud" action={<Badge>Belum terverifikasi</Badge>}>
          <p className="muted sm">Integrasi belum dipakai karena endpoint belum diverifikasi. Lihat docs/MACALY.md.</p>
        </Panel>
      </div>
    </>
  );
}
