import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/data";
import DisconnectButton from "./DisconnectButton";
import { Badge, Empty, PageHead, Panel } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import BackupPanel from "./BackupPanel";
import PushToggle from "@/components/PushToggle";

const MESSAGES: Record<string, string> = {
  ok: "Google Drive berhasil terhubung dan terverifikasi.",
  ditolak: "Izin Google tidak diberikan.", invalid: "Permintaan tidak valid. Coba hubungkan lagi.", state: "Verifikasi keamanan gagal. Coba hubungkan lagi.",
  sesi: "Sesi Anda tidak cocok. Masuk ulang lalu coba lagi.", izin: "Hanya pemilik atau admin usaha yang dapat menghubungkan Google Drive.", gagal: "Google Drive belum berhasil terhubung. Coba lagi beberapa saat.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const biz = await getBusiness();
  if (!biz) return <Empty icon="inbox" title="Buat bisnis terlebih dahulu"><a className="btn primary" href="/dashboard">Ke Dashboard</a></Empty>;
  const sp = await searchParams;
  const sb = await supabaseServer();
  const { data: integ } = await sb.from("integrations_public").select("status,external_account,last_verified_at")
    .eq("business_id", biz.id).eq("provider", "google_drive").maybeSingle();
  const verified = integ?.status === "connected" && !!integ.last_verified_at;
  const { data: bi } = await sb.from("integrations").select("backup_auto").eq("business_id", biz.id).eq("provider", "google_drive").maybeSingle();
  const { data: logs } = await sb.from("backup_logs").select("status,created_at,row_counts,detail").eq("business_id", biz.id).eq("kind", "backup").order("created_at", { ascending: false }).limit(5);
  const vapid = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT ? process.env.VAPID_PUBLIC_KEY : null;

  return (
    <>
      <PageHead title="Pengaturan" desc={biz.name} />
      {sp.google && <div className={`alert ${sp.google === "ok" ? "ok" : "err"}`} role="status" style={{ marginBottom: 16 }}>{MESSAGES[sp.google] ?? sp.google}</div>}
      <div className="split even">
        <Panel title="Google Drive" action={<Badge tone={verified ? "pos" : "muted"}>{verified ? "Terhubung" : "Belum terhubung"}</Badge>}>
          <div className="form">
            {verified && <p className="muted sm">Akun: {integ!.external_account} · diverifikasi {fmtDate(integ!.last_verified_at)}</p>}
            {verified ? <DisconnectButton businessId={biz.id} /> : <a href={`/api/google/auth?business=${biz.id}`}><button className="primary lg">Hubungkan Google Drive</button></a>}
            <small className="hint">{verified ? "Dokumen dapat disimpan ke Drive dari halaman Dokumen. Cadangan data (CSV) ada di panel di bawah." : "Setelah terhubung: simpan dokumen ke Drive dan cadangkan seluruh data (CSV) dengan satu klik."}</small>
          </div>
        </Panel>
        {verified && (
          <Panel title="Cadangan ke Google Drive" desc="Seluruh data bisnis diekspor sebagai CSV + manifest berisi checksum">
            <BackupPanel businessId={biz.id} auto={!!bi?.backup_auto} />
            {(logs ?? []).length > 0 && (
              <ul className="rows" style={{ marginTop: 12 }}>
                {(logs ?? []).map((l, k) => (
                  <li key={k} className="row-card"><div className="row-main"><div><strong>{fmtDate(l.created_at)}</strong><small className="sub">{l.status === "verified" ? `${Object.values((l.row_counts ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0)} baris` : l.detail ?? "gagal"}</small></div><Badge tone={l.status === "verified" ? "pos" : "neg"}>{l.status === "verified" ? "Terverifikasi" : "Gagal"}</Badge></div></li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        <Panel title="Notifikasi" desc="Pengingat tagihan jatuh tempo dan stok menipis">
          <PushToggle businessId={biz.id} publicKey={vapid} />
        </Panel>
      </div>
    </>
  );
}
