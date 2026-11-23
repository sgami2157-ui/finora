"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";
import { passwordProblem } from "@/lib/password";

/** Halaman tujuan tautan pemulihan kata sandi dari email. Sesi pemulihan dibuat oleh Supabase dari tautan tersebut. */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    const { data: sub } = sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY" || ev === "SIGNED_IN") setReady(true); });
    // Beri waktu bagi klien untuk menukar kode di URL menjadi sesi; bila tetap tidak ada, tautan tidak valid.
    const t = window.setTimeout(async () => { const { data } = await sb.auth.getSession(); setReady(!!data.session); }, 1500);
    return () => { sub.subscription.unsubscribe(); window.clearTimeout(t); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const p = passwordProblem(pw); if (p) return setError(p);
    if (pw !== pw2) return setError("Konfirmasi kata sandi tidak sama.");
    setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) { setBusy(false); return setError(error.message.includes("same") ? "Gunakan kata sandi yang berbeda dari sebelumnya." : "Tidak dapat mengubah kata sandi. Minta tautan baru lalu coba lagi."); }
    await sb.auth.signOut({ scope: "global" }); // akhiri semua sesi lama setelah kata sandi berubah
    setBusy(false); setDone(true);
  }

  return (
    <AuthShell mode="login">
      {done ? (<>
        <h1>Kata sandi diubah</h1>
        <p className="muted">Semua perangkat telah dikeluarkan. Silakan masuk dengan kata sandi baru.</p>
        <a className="btn primary" href="/login">Masuk</a>
      </>) : ready === false ? (<>
        <h1>Tautan tidak valid</h1>
        <p className="muted">Tautan pemulihan sudah kedaluwarsa atau sudah dipakai. Minta tautan baru dari halaman masuk.</p>
        <a className="btn primary" href="/login">Kembali ke halaman masuk</a>
      </>) : (<>
        <h1>Buat kata sandi baru</h1>
        <p className="muted">Minimal 10 karakter dengan huruf besar, huruf kecil, dan angka.</p>
        <form className="form" onSubmit={submit}>
          <label>Kata sandi baru<input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required disabled={!ready} /></label>
          <label>Ulangi kata sandi<input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required disabled={!ready} /></label>
          {error && <div className="err" role="alert">{error}</div>}
          <button className="primary" aria-busy={busy} disabled={busy || !ready}>{ready === null ? "Memeriksa tautan…" : busy ? "Menyimpan…" : "Simpan kata sandi"}</button>
        </form>
      </>)}
    </AuthShell>
  );
}
