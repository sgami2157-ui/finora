"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import BrandLoader from "./BrandLoader";

/**
 * Menampilkan loader FINORA saat pengguna berpindah halaman (klik tautan internal) atau mengirim form filter (GET),
 * karena pemuatan halaman server bisa memakan waktu. Muncul setelah jeda singkat agar tidak berkedip di jaringan cepat.
 */
export default function NavLoader() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  const timer = useRef<number | undefined>(undefined);
  const guard = useRef<number | undefined>(undefined);

  const stop = () => { window.clearTimeout(timer.current); window.clearTimeout(guard.current); setShow(false); };
  const start = () => {
    window.clearTimeout(timer.current); window.clearTimeout(guard.current);
    timer.current = window.setTimeout(() => setShow(true), 700); // halaman punya loading.tsx sendiri; overlay hanya untuk muat lambat
    guard.current = window.setTimeout(stop, 20000); // pengaman bila navigasi dibatalkan
  };

  useEffect(() => { stop(); }, [pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // hanya hash/halaman sama
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement;
      if ((f.method || "get").toLowerCase() !== "get") return;
      window.setTimeout(() => { if (!e.defaultPrevented) start(); }, 0);
    };
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) stop(); };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("click", onClick); document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onShow); window.clearTimeout(timer.current); window.clearTimeout(guard.current);
    };
  }, []);

  if (!show) return null;
  return <div className="nav-loader"><BrandLoader label="Memuat halaman…" /></div>;
}
