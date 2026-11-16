"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Kata sandi minimal 8 karakter.");
    const { error } = await supabaseBrowser().auth.signUp({
      email, password, options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/login` },
    });
    if (error) setError(error.message); else setDone(true);
  }

  if (done) return (
    <AuthShell mode="register">
      <h1>Periksa email Anda</h1>
      <p className="muted">Pendaftaran berhasil. Buka email konfirmasi, lalu <a href="/login">masuk</a>.</p>
    </AuthShell>
  );
  return (
    <AuthShell mode="register">
      <h1>Buat akun</h1>
      <p className="muted">Daftar lalu buat bisnis pertama Anda.</p>
      <form className="form" onSubmit={submit}>
        <label>Nama lengkap
          <input placeholder="Nama Anda" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>Email
          <input type="email" placeholder="nama@bisnis.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>Kata sandi
          <input type="password" placeholder="Minimal 8 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="err">{error}</div>}
        <button className="primary">Buat akun</button>
      </form>
      <p className="alt">Sudah punya akun? <a href="/login">Masuk</a></p>
    </AuthShell>
  );
}
