"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type Theme = "dark" | "light";
const KEY = "finora:theme";
const META: Record<Theme, string> = { dark: "#111318", light: "#f6f7f9" };

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", META[t]));
}

/**
 * Satu-satunya tombol ganti tema (gelap/terang). Sumber kebenaran: atribut data-theme di <html>
 * (diset skrip awal di <head> agar tidak berkedip). Ikon diganti lewat CSS, jadi tidak ada kedipan ikon.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const t: Theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(t); apply(t);
    // Sinkron antar tab: ganti tema di satu tab, tab lain ikut berubah.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && (e.newValue === "light" || e.newValue === "dark")) { apply(e.newValue); setTheme(e.newValue); }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next); apply(next);
    try { localStorage.setItem(KEY, next); } catch { /* abaikan: tema tetap berlaku di sesi ini */ }
  }
  const toLight = theme === "dark";
  return (
    <button type="button" className={`icon-btn theme-toggle ${className}`} onClick={toggle}
      aria-label={toLight ? "Ganti ke mode terang" : "Ganti ke mode gelap"} title={toLight ? "Mode terang" : "Mode gelap"}>
      <Icon name="sun" size={20} className="ti-sun" />
      <Icon name="moon" size={20} className="ti-moon" />
    </button>
  );
}
