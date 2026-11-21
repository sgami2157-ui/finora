"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
const nf = new Intl.NumberFormat("id-ID");

/**
 * Menganimasikan angka rupiah dari 0 ke nilai akhir (sekali, saat dimuat). Nilai awal dari server sudah final,
 * dan frame terakhir selalu memasang teks asli persis, jadi angka tidak pernah berbeda dari data.
 * Tidak beranimasi bila pengguna memilih "kurangi gerakan", atau nilainya kecil/tidak berisi angka.
 */
export default function CountUp({ value, ms = 800 }: { value: string; ms?: number }) {
  const [text, setText] = useState(value);
  const done = useRef(false);

  useIso(() => {
    const m = value.match(/\d[\d.]*/);
    if (done.current || !m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseInt(m[0].replace(/\./g, ""), 10);
    if (!Number.isFinite(target) || target < 1000) return;
    done.current = true;
    const pre = value.slice(0, m.index), post = value.slice((m.index ?? 0) + m[0].length);
    let raf = 0; const t0 = performance.now();
    setText(`${pre}0${post}`);
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      if (p >= 1) { setText(value); return; }
      const e = 1 - Math.pow(1 - p, 3);
      setText(`${pre}${nf.format(Math.round(target * e))}${post}`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); setText(value); };
  }, [value, ms]);

  return <span className="countup">{text}</span>;
}
