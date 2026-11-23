"use client";
import { useEffect, useRef, useState } from "react";
import type { ToastKind } from "@/lib/toast";

type T = { id: number; message: string; kind: ToastKind };

/** Menampilkan notifikasi singkat (sukses/gagal) dengan animasi centang. Aksesibel lewat role="status". */
export default function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; kind: ToastKind }>).detail;
      const id = ++seq.current;
      setItems((p) => [...p.slice(-2), { id, message: d.message, kind: d.kind }]);
      window.setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), d.kind === "err" ? 6000 : 3200);
    };
    window.addEventListener("finora:toast", on);
    return () => window.removeEventListener("finora:toast", on);
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {t.kind === "ok" ? <path d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} /> : <path d="M6 6l12 12M18 6 6 18" pathLength={1} />}
          </svg>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
