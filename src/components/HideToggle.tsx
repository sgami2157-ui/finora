"use client";
import { useEffect, useState } from "react";

/** Sembunyikan/tampilkan nominal (blur) di seluruh halaman; pilihan diingat di peramban ini. */
export default function HideToggle() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try { const v = localStorage.getItem("finora:hide") === "1"; setHidden(v); document.documentElement.dataset.hide = v ? "1" : "0"; } catch { /* abaikan */ }
  }, []);
  function flip() {
    const v = !hidden; setHidden(v);
    document.documentElement.dataset.hide = v ? "1" : "0";
    try { localStorage.setItem("finora:hide", v ? "1" : "0"); } catch { /* abaikan */ }
  }
  return (
    <button type="button" className="ghost sm" onClick={flip} aria-pressed={hidden} title="Sembunyikan nominal sensitif">
      {hidden ? "👁 Tampilkan nominal" : "🙈 Sembunyikan nominal"}
    </button>
  );
}
