import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import Sparkline from "./Sparkline";

/** Judul halaman + deskripsi + aksi opsional. */
export function PageHead({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

/** Kartu indikator (KPI). tone: warna nilai; hint: baris kecil di bawah nilai. */
export function Kpi({
  label, value, icon, tone, hint, trend,
}: { label: string; value: string; icon: IconName; tone?: "pos" | "neg" | "pri"; hint?: ReactNode; trend?: number[] }) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-ico"><Icon name={icon} size={18} /></span>
        <span className="kpi-label">{label}</span>
      </div>
      <strong className={`amt ${tone ?? ""}`}>{value}</strong>
      {hint && <div className="kpi-hint">{hint}</div>}
      {trend && <Sparkline values={trend} tone={tone === "neg" ? "neg" : tone === "pos" ? "pos" : "pri"} label={`Tren 6 bulan: ${label}`} />}
    </div>
  );
}

/** Wadah konten dengan judul opsional. */
export function Panel({ title, desc, action, children, className = "" }: {
  title?: string; desc?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          <div>{title && <h2>{title}</h2>}{desc && <p>{desc}</p>}</div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Keadaan kosong yang jujur: menjelaskan langkah berikutnya, bukan data palsu. */
export function Empty({ icon, title, desc, children }: { icon: IconName; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ico"><Icon name={icon} size={26} /></span>
      <strong>{title}</strong>
      {desc && <p>{desc}</p>}
      {children}
    </div>
  );
}

export function Badge({ tone = "muted", children }: { tone?: "pos" | "neg" | "pri" | "warn" | "muted"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

/** Tautan tombol bergaya primer/ghost. */
export function LinkButton({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return <a href={href} className={`btn ${primary ? "primary" : "ghost"}`}>{children}</a>;
}

/** Penjelasan singkat istilah: tanda tanya yang bisa diketuk (tanpa JavaScript). */
export function Tip({ children, label = "Apa artinya?" }: { children: ReactNode; label?: string }) {
  return (
    <details className="tip">
      <summary aria-label={label} title={label}>?</summary>
      <div className="tip-body" role="note">{children}</div>
    </details>
  );
}

/** Judul dengan penjelasan istilah di sebelahnya. */
export function Term({ children, tip }: { children: ReactNode; tip: ReactNode }) {
  return <span className="term">{children}<Tip>{tip}</Tip></span>;
}

/** Kotak petunjuk berbahasa sederhana di atas halaman. */
export function Callout({ title, children, tone = "info" }: { title?: string; children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div className={`callout ${tone}`} role="note">
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}
