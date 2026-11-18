"use client";
import { useEffect } from "react";

/** Mendaftarkan service worker (hanya halaman offline; tidak menyimpan data keuangan). */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* abaikan: aplikasi tetap berjalan */ });
    }
  }, []);
  return null;
}
