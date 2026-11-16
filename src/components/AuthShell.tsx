import type { ReactNode } from "react";
import { Icon, Logo } from "./Icon";

export default function AuthShell({ mode, children }: { mode: "login" | "register"; children: ReactNode }) {
  const reg = mode === "register";
  return (
    <div className="auth">
      <aside className="auth-brand">
        <a href="/"><Logo size={40} /></a>
        <div className="auth-msg">
          <h2>{reg ? "Mulai catat keuangan bisnis Anda dengan benar." : "Selamat datang kembali."}</h2>
          <ul>
            {["Jurnal double-entry yang tervalidasi", "Laporan laba rugi dan neraca otomatis", "Data bisnis terisolasi dengan RLS"].map((t) => (
              <li key={t}><Icon name="check" size={20} className="pos" />{t}</li>
            ))}
          </ul>
        </div>
        <small>© 2026 FINORA</small>
      </aside>
      <section className="auth-form">
        <div className="auth-box">{children}</div>
      </section>
    </div>
  );
}
