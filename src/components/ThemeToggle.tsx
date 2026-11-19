"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type Theme = "dark" | "light";
const META: Record<Theme, string> = { dark: "#111318", light: "#f6f7f9" };

/** Tombol ganti tema gelap/terang. Pilihan disimpan di perangkat; skrip awal di <head> mencegah layar berkedip. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("finora:theme", next); } catch { /* abaikan: tema tetap berlaku di sesi ini */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META[next]);
  }
  const toLight = theme === "dark";
  return (
    <button type="button" className={`theme-toggle ${className}`} onClick={toggle} aria-label={toLight ? "Ganti ke mode terang" : "Ganti ke mode gelap"} title={toLight ? "Mode terang" : "Mode gelap"}>
      <Icon name={toLight ? "sun" : "moon"} size={20} />
    </button>
  );
}
