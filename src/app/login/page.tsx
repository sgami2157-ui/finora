"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [code, setCode] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return setError("Email atau kata sandi salah."); }
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: f } = await sb.auth.mfa.listFactors();
      const t = f?.totp?.[0];
      setBusy(false);
      if (t) return setMfa({ factorId: t.id });
    }
    setBusy(false);
    router.replace("/dashboard"); router.refresh();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setBusy(true); setError(null);
    const { error } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId: mfa.factorId, code: code.trim() });
    setBusy(false);
    if (error) return setError("Kode salah atau sudah kedaluwarsa.");
    router.replace("/dashboard"); router.refresh();
  }

  async function cancelMfa() { await supabaseBrowser().auth.signOut(); setMfa(null); setCode(""); setPassword(""); }

  async function recover() {
    if (!email) return setError("Isi email terlebih dahulu.");
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/login`,
    });
    if (error) setError(error.message); else setInfo("Tautan pemulihan telah dikirim ke email Anda.");
  }

  if (mfa) return (
    <AuthShell mode="login">
      <h1>Verifikasi dua langkah</h1>
      <p className="muted">Masukkan 6 digit kode dari aplikasi autentikator Anda.</p>
      <form className="form" onSubmit={verify}>
        <label>Kode autentikator
          <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
        </label>
        {error && <div className="err">{error}</div>}
        <button className="primary" aria-busy={busy} disabled={busy}>{busy ? "Memeriksa…" : "Verifikasi"}</button>
        <button type="button" className="ghost" onClick={cancelMfa}>Batal</button>
      </form>
    </AuthShell>
  );
  return (
    <AuthShell mode="login">
      <h1>Masuk ke FINORA</h1>
      <p className="muted">Masuk untuk melanjutkan pembukuan Anda.</p>
      <form className="form" onSubmit={submit}>
        <label>Email
          <input type="email" placeholder="nama@bisnis.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>Kata sandi
          <input type="password" placeholder="Masukkan kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="err">{error}</div>}
        {info && <div className="pos">{info}</div>}
        <button className="primary" aria-busy={busy} disabled={busy}>{busy ? "Memproses…" : "Masuk"}</button>
        <button type="button" className="ghost" onClick={recover}>Lupa kata sandi</button>
      </form>
      <p className="alt">Belum punya akun? <a href="/register">Daftar</a></p>
    </AuthShell>
  );
}
