"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon, Logo } from "./Icon";
import { NAV_GROUPS as GROUPS } from "@/lib/nav";
import ThemeToggle from "./ThemeToggle";
import SearchBar from "./SearchBar";

export default function Sidebar({ businessName, userEmail }: { businessName: string | null; userEmail: string | null }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { const c = localStorage.getItem("finora:sb") === "1"; setCollapsed(c); document.documentElement.dataset.sb = c ? "collapsed" : "open"; } catch { /* abaikan */ }
  }, []);
  function toggleCollapse() {
    const c = !collapsed; setCollapsed(c);
    document.documentElement.dataset.sb = c ? "collapsed" : "open";
    try { localStorage.setItem("finora:sb", c ? "1" : "0"); } catch { /* abaikan */ }
  }
  const router = useRouter();
  const pathname = usePathname();
  // Tutup drawer saat pindah halaman, tekan Esc, atau layar melebar; kunci scroll body saat terbuka.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const mq = window.matchMedia("(min-width: 801px)");
    const onMq = () => { if (mq.matches) setOpen(false); };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); mq.removeEventListener("change", onMq); document.body.style.overflow = ""; };
  }, [open]);

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login"); router.refresh();
  }
  return (
    <>
      <header className="topbar">
        <a href="/dashboard" aria-label="FINORA"><Logo size={30} /></a>
        <div className="topbar-actions"><SearchBar variant="mobile" /><ThemeToggle /></div>
      </header>
      <div className={`scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside id="app-sidebar" className={`sidebar ${open ? "open" : ""}`}>
        <div className="sb-top">
          <div className="brand">
            <div className="brand-row"><Logo size={32} />
              <button type="button" className="sb-close ghost sm" onClick={() => setOpen(false)} aria-label="Tutup menu">✕</button>
              <button type="button" className="sb-collapse ghost sm" onClick={toggleCollapse} aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"} aria-pressed={collapsed} title={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}>{collapsed ? "»" : "«"}</button>
            </div>
            {businessName && <small>{businessName}</small>}
          </div>
          <nav className="nav" aria-label="Menu utama">
            {GROUPS.map((g) => (
              <div key={g.title} className="nav-group">
                <p className="nav-title">{g.title}</p>
                {g.items.map((n) => {
                  const active = pathname === n.href || pathname.startsWith(n.href + "/");
                  return (
                    <a key={n.href} href={n.href} title={collapsed ? n.label : undefined} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                      <Icon name={n.icon} /><span className="nav-t">{n.label}{n.sub && <small>{n.sub}</small>}</span>
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
        <div className="sb-bottom">
          {userEmail && <div className="me" title={userEmail}><span className="avatar">{userEmail[0]?.toUpperCase()}</span><span className="me-t">{userEmail}</span></div>}
          <a href="/help" className={`help-link ${pathname === "/help" ? "active" : ""}`}><Icon name="help" /><span className="nav-t">Pusat Bantuan</span></a>
          <button className="logout" onClick={logout}><Icon name="logout" /><span className="nav-t">Keluar</span></button>
        </div>
      </aside>
      {!open && <nav className="bottom-nav" aria-label="Menu cepat">
        <a href="/dashboard" className={pathname === "/dashboard" ? "on" : ""}><Icon name="dashboard" size={22} /><span>Beranda</span></a>
        <a href="/sales" className={pathname.startsWith("/sales") ? "on" : ""}><Icon name="cart" size={22} /><span>Penjualan</span></a>
        <button type="button" className="bn-add" onClick={() => window.dispatchEvent(new Event("finora:quickadd"))} aria-label="Catat transaksi"><Icon name="plus" size={26} /></button>
        <a href="/cash" className={pathname.startsWith("/cash") ? "on" : ""}><Icon name="bank" size={22} /><span>Kas</span></a>
        <button type="button" onClick={() => setOpen(true)} aria-label="Buka semua menu"><Icon name="menu" size={22} /><span>Menu</span></button>
      </nav>}
    </>
  );
}
