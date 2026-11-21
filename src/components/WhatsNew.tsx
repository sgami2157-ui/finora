"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_VERSION } from "@/lib/changelog";

const KEY = "finora:seen-version";
/** Spanduk sekali tampil setelah versi berubah; mengarah ke halaman “Yang Baru”. */
export default function WhatsNew() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { if (localStorage.getItem(KEY) !== APP_VERSION) setShow(true); } catch { /* abaikan */ } }, []);
  if (!show) return null;
  const dismiss = () => { setShow(false); try { localStorage.setItem(KEY, APP_VERSION); } catch { /* abaikan */ } };
  return (
    <div className="whats-new" role="status">
      <span><strong>FINORA {APP_VERSION}</strong> sudah terpasang — keamanan, animasi, dan tampilan lebih baik.</span>
      <span className="wn-actions"><Link href="/changelog" className="link" onClick={dismiss}>Lihat yang baru</Link><button type="button" className="ghost sm" onClick={dismiss}>Tutup</button></span>
    </div>
  );
}
