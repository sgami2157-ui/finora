"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/** Tombol kembali ke atas; muncul setelah menggulir jauh. */
export default function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (!show) return null;
  return <button type="button" className="scroll-top" aria-label="Kembali ke atas" title="Kembali ke atas" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Icon name="chevron-up" size={18} /></button>;
}
