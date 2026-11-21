"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Lonceng pemberitahuan. Panel menutup saat halaman digulir, klik di luar, tekan Esc, atau pindah halaman. */
export default function BellMenu({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    // Gulir halaman menutup panel; gulir di dalam panel sendiri tidak.
    const onScroll = (e: Event) => { if (panel.current && e.target instanceof Node && panel.current.contains(e.target)) return; close(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("wheel", onScroll as EventListener, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true }); window.removeEventListener("wheel", onScroll as EventListener);
    };
  }, [open]);

  return (
    <div className="bell" ref={box}>
      <button type="button" className="bell-btn" aria-label={count ? `Pemberitahuan, ${count} baru` : "Pemberitahuan"} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        🔔{count > 0 && <b>{count}</b>}
      </button>
      {open && (
        <div className="bell-body" ref={panel} role="region" aria-label="Pemberitahuan" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          <div className="bell-head"><strong>Pemberitahuan</strong><button type="button" className="bell-x" aria-label="Tutup" onClick={() => setOpen(false)}>✕</button></div>
          {children}
        </div>
      )}
    </div>
  );
}
