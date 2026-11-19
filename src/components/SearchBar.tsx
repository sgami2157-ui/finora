"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { NAV_GROUPS, EXTRA_PAGES } from "@/lib/nav";

type Hit = { title: string; sub?: string; href: string };
type Group = { label: string; items: Hit[] };
const PAGES: Hit[] = [...NAV_GROUPS.flatMap((g) => g.items), ...EXTRA_PAGES].map((p) => ({ title: p.label, sub: p.sub, href: p.href }));
const norm = (s: string) => s.toLowerCase();

/** Pencarian global: halaman (lokal) + faktur, pelanggan/pemasok, produk, akun, jurnal, dokumen (dari server, dibatasi akses pengguna). */
export default function SearchBar({ variant }: { variant: "desktop" | "mobile" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);       // dropdown (desktop) / overlay (mobile)
  const [remote, setRemote] = useState<Group[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const term = q.trim();

  const pageHits = useMemo(() => (term.length < 1 ? [] : PAGES.filter((p) => norm(p.title + " " + (p.sub ?? "")).includes(norm(term))).slice(0, 5)), [term]);
  const groups: Group[] = useMemo(() => [...(pageHits.length ? [{ label: "Halaman", items: pageHits }] : []), ...remote], [pageHits, remote]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (term.length < 2) { setRemote([]); setBusy(false); setFailed(false); return; }
    setBusy(true);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (!res.ok) throw new Error();
        setRemote(((await res.json()) as { groups: Group[] }).groups); setFailed(false);
      } catch (e) { if ((e as Error).name !== "AbortError") { setRemote([]); setFailed(true); } }
      finally { if (!ctl.signal.aborted) setBusy(false); }
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [term]);
  useEffect(() => setActive(0), [flat.length, term]);

  // Pintasan "/" atau Ctrl/⌘+K (varian yang sedang tampil), klik di luar menutup.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement | null)?.isContentEditable;
      if (((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        const visible = variant === "desktop" ? window.matchMedia("(min-width: 801px)").matches : window.matchMedia("(max-width: 800px)").matches;
        if (!visible) return;
        e.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    const onDown = (e: MouseEvent) => { if (variant === "desktop" && box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey); window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, [variant]);
  useEffect(() => { if (variant === "mobile") { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; } }, [open, variant]);

  function go(h: Hit) { setOpen(false); setQ(""); router.push(h.href); }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, Math.max(flat.length - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && flat[active]) { e.preventDefault(); go(flat[active]); }
  }

  const panel = open && term.length >= 1 && (
    <div className="search-panel" role="listbox" id={`search-${variant}`}>
      {groups.length === 0 ? (
        <p className="search-empty">{term.length < 2 ? "Ketik minimal 2 huruf untuk mencari." : busy ? "Mencari…" : failed ? "Pencarian sedang bermasalah. Coba lagi." : `Tidak ada hasil untuk “${term}”.`}</p>
      ) : (() => {
        let i = -1;
        return groups.map((g) => (
          <div key={g.label} className="search-group">
            <p className="search-label">{g.label}</p>
            {g.items.map((h) => { i++; const idx = i; return (
              <button key={g.label + h.href + h.title} type="button" role="option" aria-selected={idx === active} className={`search-item ${idx === active ? "on" : ""}`} onMouseEnter={() => setActive(idx)} onClick={() => go(h)}>
                <strong>{h.title}</strong>{h.sub && <small>{h.sub}</small>}
              </button>
            ); })}
          </div>
        ));
      })()}
      {busy && groups.length > 0 && <p className="search-empty">Mencari lainnya…</p>}
    </div>
  );

  const field = (
    <div className="search-field">
      <Icon name={"search" as IconName} size={18} />
      <input ref={inputRef} type="search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
        placeholder={variant === "desktop" ? "Cari faktur, pelanggan, produk, halaman…  ( / )" : "Cari…"} aria-label="Cari" role="combobox" aria-expanded={!!panel} aria-controls={`search-${variant}`} autoComplete="off" maxLength={60} />
    </div>
  );

  if (variant === "desktop") return <div className="search" ref={box}>{field}{panel}</div>;
  return (
    <>
      <button type="button" className="theme-toggle" aria-label="Cari" onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}><Icon name={"search" as IconName} size={20} /></button>
      {open && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Pencarian">
          <div className="search-overlay-bar">{field}<button type="button" className="ghost" onClick={() => { setOpen(false); setQ(""); }}>Tutup</button></div>
          <div className="search-overlay-body">{panel}</div>
        </div>
      )}
    </>
  );
}
