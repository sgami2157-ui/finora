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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError("Email atau kata sandi salah.");
    router.replace("/dashboard"); router.refresh();
  }

  async function recover() {
    if (!email) return setError("Isi email terlebih dahulu.");
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/login`,
    });
    if (error) setError(error.message); else setInfo("Tautan pemulihan telah dikirim ke email Anda.");
  }

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
        <button className="primary" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</button>
        <button type="button" className="ghost" onClick={recover}>Lupa kata sandi</button>
      </form>
      <p className="alt">Belum punya akun? <a href="/register">Daftar</a></p>
    </AuthShell>
  );
}
