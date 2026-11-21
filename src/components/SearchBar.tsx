"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { NAV_GROUPS, EXTRA_PAGES } from "@/lib/nav";

type Hit = { title: string; sub?: string; href: string };
type Group = { label: string; items: Hit[] };
const PAGES: Hit[] = [...NAV_GROUPS.flatMap((g) => g.items), ...EXTRA_PAGES].map((p) => ({ title: p.label, sub: p.sub, href: p.href }));
const norm = (s: string) => s.toLowerCase();
const SUGGEST: Hit[] = PAGES.slice(0, 6);

/** Satu-satunya pencarian global (satu instance; di ponsel tampil sebagai ikon yang membuka layar penuh). Halaman (lokal) + faktur, pelanggan/pemasok, produk, akun, jurnal, dokumen (dari server, dibatasi akses pengguna). */
export default function SearchBar() {
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
  const groups: Group[] = useMemo(() => (term.length < 1 ? [{ label: "Pintasan halaman", items: SUGGEST }] : [...(pageHits.length ? [{ label: "Halaman", items: pageHits }] : []), ...remote]), [term, pageHits, remote]);
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

  const openSearch = () => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); };
  const close = () => { setOpen(false); inputRef.current?.blur(); };

  // Pintasan "/" atau Ctrl/⌘+K; klik di luar menutup.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.tagName === "SELECT" || el?.isContentEditable;
      if (((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault(); setOpen(true); requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey); window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, []);
  // Layar penuh di ponsel: kunci scroll halaman di belakangnya.
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 800px)").matches) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  useEffect(() => { document.getElementById(`sr-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  function go(h: Hit) { setOpen(false); setQ(""); inputRef.current?.blur(); router.push(h.href); }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { if (q) setQ(""); else close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, Math.max(flat.length - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && flat[active]) { e.preventDefault(); go(flat[active]); }
  }

  const panel = open && (
    <div className="search-panel" role="listbox" id="search-panel" aria-label="Hasil pencarian">
      {groups.length === 0 ? (
        <p className="search-empty">{term.length < 2 ? "Ketik minimal 2 huruf untuk mencari." : busy ? "Mencari…" : failed ? "Pencarian sedang bermasalah. Coba lagi." : `Tidak ada hasil untuk “${term}”.`}</p>
      ) : (() => {
        let i = -1;
        return groups.map((g) => (
          <div key={g.label} className="search-group">
            <p className="search-label">{g.label}</p>
            {g.items.map((h) => { i++; const idx = i; return (
              <button key={g.label + h.href + h.title} id={`sr-${idx}`} type="button" role="option" aria-selected={idx === active} className={`search-item ${idx === active ? "on" : ""}`} onMouseEnter={() => setActive(idx)} onClick={() => go(h)}>
                <strong>{h.title}</strong>{h.sub && <small>{h.sub}</small>}
              </button>
            ); })}
          </div>
        ));
      })()}
      {busy && groups.length > 0 && <p className="search-empty">Mencari lainnya…</p>}
    </div>
  );

  return (
    <div className={`search ${open ? "open" : ""}`} ref={box}>
      <button type="button" className="icon-btn search-trigger" aria-label="Cari" onClick={openSearch}><Icon name="search" size={20} /></button>
      <div className="search-box" role="search">
        <div className="search-field">
          <Icon name="search" size={18} />
          <input ref={inputRef} type="search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
            placeholder="Cari faktur, pelanggan, produk, halaman…" aria-label="Cari" role="combobox" aria-expanded={!!panel} aria-controls="search-panel"
            aria-activedescendant={panel && flat.length ? `sr-${active}` : undefined} autoComplete="off" enterKeyHint="search" maxLength={60} />
          {q ? <button type="button" className="search-clear" aria-label="Hapus pencarian" onClick={() => { setQ(""); inputRef.current?.focus(); }}><Icon name="x" size={16} /></button>
             : <kbd className="search-kbd" aria-hidden="true">/</kbd>}
        </div>
        <button type="button" className="ghost search-close" onClick={() => { setOpen(false); setQ(""); }}>Tutup</button>
        {panel}
      </div>
    </div>
  );
}
