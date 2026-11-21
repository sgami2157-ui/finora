"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export const IDLE_KEY = "finora:idle-min";
export const IDLE_DEFAULT = 30; // menit; 0 = nonaktif
const LAST = "finora:last-active";

/** Keluar otomatis bila tidak ada aktivitas. Pengaturan per perangkat (Pengaturan → Keamanan akun). */
export default function IdleGuard() {
  useEffect(() => {
    const limit = () => { try { const v = localStorage.getItem(IDLE_KEY); return v === null ? IDLE_DEFAULT : Number(v) || 0; } catch { return IDLE_DEFAULT; } };
    const touch = () => { try { localStorage.setItem(LAST, String(Date.now())); } catch { /* abaikan */ } };
    let lastTouch = 0;
    const onActivity = () => { const n = Date.now(); if (n - lastTouch > 5000) { lastTouch = n; touch(); } };
    const check = async () => {
      const min = limit(); if (!min) return;
      let last = Date.now(); try { last = Number(localStorage.getItem(LAST)) || Date.now(); } catch { /* abaikan */ }
      if (Date.now() - last > min * 60_000) {
        await supabaseBrowser().auth.signOut();
        location.href = "/login?idle=1";
      }
    };
    touch();
    const ev = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    ev.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const iv = window.setInterval(check, 30_000);
    const vis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", vis);
    return () => { ev.forEach((e) => window.removeEventListener(e, onActivity)); window.clearInterval(iv); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return null;
}
