"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Keamanan akun: 2FA TOTP (opsional) dan keluar dari semua perangkat. Semua status berasal dari Supabase Auth. */
export default function SecurityPanel() {
  const router = useRouter();
  const [factor, setFactor] = useState<{ id: string } | null | undefined>(undefined);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function load() {
    const { data } = await supabaseBrowser().auth.mfa.listFactors();
    setFactor(data?.totp?.[0] ?? null);
  }
  useEffect(() => { load(); }, []);

  async function start() {
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    // Bersihkan percobaan pendaftaran yang belum diverifikasi.
    const { data: all } = await sb.auth.mfa.listFactors();
    for (const f of (all?.all ?? []).filter((x) => x.status === "unverified")) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `FINORA ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !data) return setMsg({ ok: false, t: "Gagal memulai pendaftaran 2FA. Coba lagi." });
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.trim() });
    setBusy(false);
    if (error) return setMsg({ ok: false, t: "Kode salah. Periksa jam perangkat Anda lalu coba lagi." });
    setEnroll(null); setCode(""); setMsg({ ok: true, t: "2FA aktif. Anda akan diminta kode setiap kali masuk." });
    load(); router.refresh();
  }

  async function disable() {
    if (!factor || !confirmWindow("Matikan verifikasi dua langkah?")) return;
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (error) return setMsg({ ok: false, t: "Tidak dapat mematikan 2FA. Masuk ulang dengan kode lalu coba lagi." });
    setMsg({ ok: true, t: "2FA dimatikan." }); load();
  }

  async function signOutAll() {
    if (!confirmWindow("Keluar dari semua perangkat, termasuk perangkat ini?")) return;
    setBusy(true);
    await supabaseBrowser().auth.signOut({ scope: "global" });
    location.href = "/login";
  }

  return (
    <div className="form">
      {msg && <div className={msg.ok ? "pos" : "err"} role="status">{msg.t}</div>}
      {factor === undefined && <p className="muted sm">Memuat status…</p>}
      {factor && !enroll && (<>
        <p className="muted sm">Verifikasi dua langkah <strong>aktif</strong> (aplikasi autentikator).</p>
        <button className="ghost" disabled={busy} onClick={disable}>Matikan 2FA</button>
      </>)}
      {factor === null && !enroll && (<>
        <p className="muted sm">Tambahkan lapisan keamanan: selain kata sandi, masuk memerlukan kode 6 digit dari Google Authenticator, Authy, atau sejenisnya.</p>
        <button className="primary" disabled={busy} onClick={start}>Aktifkan 2FA</button>
      </>)}
      {enroll && (
        <form className="form" onSubmit={confirm}>
          <p className="muted sm">1) Pindai kode QR dengan aplikasi autentikator. 2) Masukkan kode 6 digit yang muncul.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="Kode QR 2FA" width={160} height={160} style={{ background: "#fff", padding: 8, borderRadius: 8 }} />
          <small className="hint">Tidak bisa memindai? Kunci manual: <code>{enroll.secret}</code></small>
          <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button className="primary" disabled={busy}>Verifikasi &amp; aktifkan</button>
        </form>
      )}
      <hr style={{ border: 0, borderTop: "1px solid var(--w10, rgba(255,255,255,.1))", margin: "12px 0" }} />
      <p className="muted sm">Curiga akun dipakai orang lain, atau perangkat hilang? Akhiri semua sesi login.</p>
      <button className="ghost" disabled={busy} onClick={signOutAll}>Keluar dari semua perangkat</button>
    </div>
  );
}
function confirmWindow(t: string) { return typeof window !== "undefined" && window.confirm(t); }
