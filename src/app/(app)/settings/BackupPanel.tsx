"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BackupPanel({ businessId, auto }: { businessId: string; auto: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [on, setOn] = useState(auto);

  async function backup() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/google/backup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ business: businessId }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: j.error ?? "Cadangan gagal" });
    setMsg({ ok: j.verified, text: j.verified ? `Cadangan selesai dan terverifikasi (${j.files} berkas) di Drive: FINORA/…/Backup.` : "Terunggah, tetapi verifikasi ukuran gagal. Coba ulangi." });
    router.refresh();
  }
  async function toggle(v: boolean) {
    setOn(v);
    const res = await fetch("/api/google/backup", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ business: businessId, auto: v }) });
    if (!res.ok) { setOn(!v); setMsg({ ok: false, text: "Gagal mengubah pengaturan" }); }
  }
  return (
    <div className="form">
      <button className="primary" onClick={backup} aria-busy={busy} disabled={busy}>{busy ? "Mencadangkan…" : "Cadangkan sekarang"}</button>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} /> Cadangkan otomatis tiap minggu
      </label>
      {msg && <div className={`alert ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
    </div>
  );
}
