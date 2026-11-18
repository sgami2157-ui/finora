"use client";
import { useEffect, useState } from "react";

const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };

/** Aktifkan/matikan notifikasi push di perangkat ini. Status ditampilkan apa adanya (tidak ada "aktif" palsu). */
export default function PushToggle({ businessId, publicKey }: { businessId: string; publicKey: string | null }) {
  const [state, setState] = useState<"loading" | "unsupported" | "unconfigured" | "denied" | "off" | "on">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!publicKey) return setState("unconfigured");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.ready;
        setState((await reg.pushManager.getSubscription()) ? "on" : "off");
      } catch { setState("off"); }
    })();
  }, [publicKey]);

  async function enable() {
    setBusy(true); setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey!) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ business: businessId, subscription: sub.toJSON() }) });
      if (!res.ok) { await sub.unsubscribe(); throw new Error("Notifikasi belum bisa diaktifkan. Coba lagi"); }
      setState("on");
    } catch (e) { setMsg((e as Error).message || "Gagal mengaktifkan notifikasi"); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
      setState("off");
    } catch { setMsg("Gagal mematikan notifikasi"); } finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? (j.sent > 0 ? "Notifikasi uji dikirim. Periksa perangkat Anda." : "Notifikasi belum sampai. Coba matikan lalu aktifkan lagi.") : j.error ?? "Gagal mengirim uji");
    setBusy(false);
  }

  if (state === "loading") return <p className="muted sm">Memeriksa…</p>;
  if (state === "unconfigured") return <p className="muted sm">Notifikasi belum tersedia saat ini.</p>;
  if (state === "unsupported") return <p className="muted sm">Perangkat atau peramban ini belum mendukung notifikasi. Coba pasang FINORA ke layar utama.</p>;
  if (state === "denied") return <p className="muted sm">Notifikasi diblokir. Izinkan lewat pengaturan situs atau aplikasi di perangkat Anda, lalu muat ulang halaman.</p>;
  return (
    <div className="form">
      <p className="muted sm">{state === "on" ? "Notifikasi aktif di perangkat ini." : "Dapatkan pengingat piutang/utang jatuh tempo dan stok menipis setiap pagi (±08.00 WIB)."}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {state === "on" ? (<><button onClick={test} disabled={busy}>Kirim notifikasi uji</button><button onClick={disable} disabled={busy}>Matikan</button></>) : <button className="primary" onClick={enable} disabled={busy}>Aktifkan notifikasi</button>}
      </div>
      {msg && <small className="hint" role="status">{msg}</small>}
    </div>
  );
}
