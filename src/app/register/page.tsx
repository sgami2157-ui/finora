"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

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

  if (done) return <main className="main"><p>Pendaftaran berhasil. Periksa email Anda untuk konfirmasi, lalu <a href="/login">masuk</a>.</p></main>;
  return (
    <main className="main" style={{ margin: "10vh auto" }}>
      <h1 style={{ color: "var(--primary)" }}>Daftar</h1>
      <form className="stack" onSubmit={submit}>
        <input placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Kata sandi (min. 8 karakter)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="err">{error}</div>}
        <button className="primary">Buat akun</button>
        <a href="/login">Sudah punya akun? Masuk</a>
      </form>
    </main>
  );
}
