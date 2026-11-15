import { supabaseServer } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/data";
import DisconnectButton from "./DisconnectButton";

const MESSAGES: Record<string, string> = {
  ok: "Google Drive berhasil terhubung dan terverifikasi.",
  ditolak: "Izin Google ditolak.", invalid: "Permintaan tidak valid.", state: "Validasi keamanan (state) gagal.",
  sesi: "Sesi tidak cocok.", izin: "Hanya owner/admin yang dapat menghubungkan.", gagal: "Gagal menghubungkan Google Drive. Lihat log integrasi.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const biz = await getBusiness();
  if (!biz) return <p>Buat bisnis terlebih dahulu di <a href="/dashboard"><u>Dashboard</u></a>.</p>;
  const sp = await searchParams;
  const sb = await supabaseServer();
  const { data: integ } = await sb.from("integrations_public").select("status,external_account,last_verified_at")
    .eq("business_id", biz.id).eq("provider", "google_drive").maybeSingle();
  const verified = integ?.status === "connected" && !!integ.last_verified_at;

  return (
    <>
      <h1>Pengaturan</h1>
      <h2>{biz.name}</h2>
      {sp.google && <p className={sp.google === "ok" ? "pos" : "err"}>{MESSAGES[sp.google] ?? sp.google}</p>}
      <div className="card" style={{ maxWidth: 520 }}>
        <h3 style={{ marginTop: 0 }}>Google Drive</h3>
        <p>Status: <b>{verified ? `Terhubung (${integ!.external_account})` : "Belum terhubung"}</b></p>
        {verified && <p style={{ color: "var(--secondary)" }}>Terakhir diverifikasi: {integ!.last_verified_at}</p>}
        {verified ? <DisconnectButton businessId={biz.id} /> : <a href={`/api/google/auth?business=${biz.id}`}><button className="primary">Hubungkan Google Drive</button></a>}
        <p style={{ color: "var(--secondary)", fontSize: 13 }}>Unggah dokumen, simpan laporan, dan backup ke Drive belum diimplementasikan di versi ini.</p>
      </div>
      <div className="card" style={{ maxWidth: 520, marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Macaly Cloud</h3>
        <p>Status: <b>Belum terverifikasi</b> — lihat docs/MACALY.md.</p>
      </div>
    </>
  );
}
