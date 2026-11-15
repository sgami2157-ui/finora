"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

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
    <main className="main" style={{ margin: "10vh auto" }}>
      <h1 style={{ color: "var(--primary)" }}>FINORA</h1>
      <form className="stack" onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="err">{error}</div>}
        {info && <div className="pos">{info}</div>}
        <button className="primary" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</button>
        <button type="button" onClick={recover}>Lupa kata sandi</button>
        <a href="/register">Belum punya akun? Daftar</a>
      </form>
    </main>
  );
}
