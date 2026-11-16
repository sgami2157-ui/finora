import { Icon, Logo, type IconName } from "@/components/Icon";

const FEATURES: { icon: IconName; title: string; desc: string; soon?: boolean }[] = [
  { icon: "book", title: "Jurnal double-entry", desc: "Debit selalu sama dengan kredit. Jurnal yang sudah diposting tidak bisa diubah — koreksi lewat jurnal pembalik." },
  { icon: "chart", title: "Laporan keuangan", desc: "Laba rugi, neraca, dan neraca saldo tersusun langsung dari jurnal. Arus kas dan buku besar menyusul." },
  { icon: "bank", title: "Kas & Bank", desc: "Pantau saldo kas dan rekening, transfer antar-akun, serta rekonsiliasi arus kas.", soon: true },
  { icon: "coin", title: "Piutang & Utang", desc: "Catat faktur, pembayaran sebagian, dan jatuh tempo agar arus kas tetap terkendali.", soon: true },
  { icon: "box", title: "Persediaan & HPP", desc: "Harga pokok rata-rata tertimbang, resep produk, dan analisis titik impas (BEP).", soon: true },
  { icon: "sparkles", title: "AI Financial Analyst", desc: "Tanyakan angka bisnis Anda dalam bahasa sehari-hari. Analisis hanya memakai data yang Anda miliki.", soon: true },
];

const MODULES: [string, IconName, boolean][] = [
  ["Dashboard", "dashboard", true], ["Transaksi", "transfer", false], ["Jurnal Akuntansi", "book", true], ["Kas & Bank", "bank", false],
  ["Penjualan", "cart", false], ["Pembelian", "bag", false], ["Produk & Persediaan", "box", false], ["Piutang", "coin", false],
  ["Utang", "banknote", false], ["Biaya Operasional", "wallet", false], ["Laporan Keuangan", "chart", true], ["AI Financial Analyst", "sparkles", false],
  ["Dokumen", "folder", false], ["Pengaturan", "settings", true],
];

const STEPS = [
  ["01", "Buat bisnis", "Daftar akun lalu buat bisnis pertama Anda. Data setiap bisnis terpisah dan aman."],
  ["02", "Catat jurnal", "Input transaksi sebagai jurnal. Sistem memvalidasi debit = kredit sebelum diposting."],
  ["03", "Baca laporan", "Lihat laba rugi, neraca, dan neraca saldo kapan saja, dihitung dari jurnal posted."],
];

const SECURITY: [IconName, string, string][] = [
  ["lock", "Jurnal permanen", "Jurnal posted tidak bisa diedit atau dihapus."],
  ["calcheck", "Kunci periode", "Cegah perubahan setelah tutup buku."],
  ["shield", "Row Level Security", "Data tiap bisnis terisolasi di database."],
  ["clipcheck", "Jejak audit", "Setiap perubahan penting tercatat."],
];

const PRINCIPLES: [IconName, string, string][] = [
  ["scale", "Double-entry", "Debit = kredit, selalu."],
  ["lock", "Jurnal terkunci", "Posted tidak bisa diubah."],
  ["shield", "Data terisolasi", "RLS per bisnis."],
  ["banknote", "Rupiah & WIB", "Format lokal bawaan."],
];

const BARS = [["Jun", 90, 60], ["Jul", 110, 70], ["Agu", 100, 75], ["Sep", 130, 80], ["Okt", 120, 85], ["Nov", 150, 90]] as const;

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="lp-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-nav-in">
          <a href="/" aria-label="FINORA"><Logo size={34} /></a>
          <nav className="lp-links" aria-label="Navigasi utama">
            <a href="#fitur">Fitur</a><a href="#modul">Modul</a><a href="#cara-kerja">Cara kerja</a><a href="#keamanan">Keamanan</a>
          </nav>
          <div className="lp-actions">
            <a className="btn ghost" href="/login">Masuk</a>
            <a className="btn primary" href="/register">Daftar</a>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap center">
          <span className="pill"><Icon name="sparkles" size={14} />Untuk UMKM Indonesia · Rupiah · WIB</span>
          <h1>Pembukuan UMKM yang rapi, akurat, dan siap diaudit.</h1>
          <p className="lead">FINORA mencatat setiap transaksi sebagai jurnal double-entry, mengunci periode, dan menyusun laporan keuangan dalam Rupiah — dengan jejak audit di setiap langkah.</p>
          <div className="lp-cta">
            <a className="btn primary lg" href="/register">Mulai sekarang <Icon name="arrow" /></a>
            <a className="btn ghost lg" href="/login">Masuk</a>
          </div>

          <div className="mock" aria-hidden="true">
            <div className="mock-bar"><i style={{ background: "#ef4444" }} /><i style={{ background: "#f59e0b" }} /><i style={{ background: "#22c55e" }} /></div>
            <div className="mock-body">
              <div className="mock-head"><div><b>Dashboard</b><small>Ringkasan keuangan · November 2026</small></div><span className="chip"><Icon name="calendar" size={14} />Nov 2026</span></div>
              <div className="cards">
                {[["Kas & Bank", "Rp 128.450.000", "+8,2% dari Okt", true], ["Piutang", "Rp 42.300.000", "12 faktur terbuka", false], ["Utang", "Rp 18.750.000", "5 tagihan", false], ["Laba Bersih", "Rp 36.920.000", "+12,4% dari Okt", true]].map(([l, v, d, up]) => (
                  <div className="card" key={String(l)}><small>{l}</small><strong>{v}</strong><span className={up ? "pos" : "muted"}>{d}</span></div>
                ))}
              </div>
              <div className="bars">
                {BARS.map(([m, a, b]) => (
                  <div key={m}><div className="pair"><i style={{ height: a, background: "var(--primary)" }} /><i style={{ height: b, background: "var(--secondary)" }} /></div><small>{m}</small></div>
                ))}
              </div>
            </div>
          </div>
          <p className="note">Pratinjau desain — angka hanyalah contoh ilustrasi, bukan data nyata.</p>
        </div>
      </section>

      <section className="lp-wrap"><div className="grid g4">
        {PRINCIPLES.map(([ic, t, d]) => (
          <div className="principle" key={t}><Icon name={ic} size={22} className="pri" /><div><b>{t}</b><small>{d}</small></div></div>
        ))}
      </div></section>

      <section id="fitur" className="lp-sec"><div className="lp-wrap">
        <Head eyebrow="Fitur" title="Semua yang dibutuhkan pembukuan bisnis Anda" sub="Dari pencatatan jurnal sampai laporan — satu sumber kebenaran untuk angka bisnis." />
        <div className="grid g3">
          {FEATURES.map((f) => (
            <article className="box" key={f.title}>
              <div className="box-top"><span className="ibox"><Icon name={f.icon} size={22} /></span>{f.soon && <span className="soon">Segera</span>}</div>
              <h3>{f.title}</h3><p>{f.desc}</p>
            </article>
          ))}
        </div>
      </div></section>

      <section id="modul" className="lp-sec alt"><div className="lp-wrap">
        <Head eyebrow="Modul" title="14 menu, satu alur kerja" sub="Navigasi yang sama dengan aplikasi. Modul bertanda “Segera” sedang dikerjakan." />
        <div className="grid g4">
          {MODULES.map(([l, ic, on]) => (
            <div className={`mod ${on ? "on" : ""}`} key={l}><Icon name={ic} size={20} />{l}{!on && <span className="soon">Segera</span>}</div>
          ))}
        </div>
      </div></section>

      <section id="cara-kerja" className="lp-sec"><div className="lp-wrap">
        <Head eyebrow="Cara kerja" title="Tiga langkah menuju laporan yang bisa dipercaya" />
        <div className="grid g3">
          {STEPS.map(([n, t, d]) => (<article className="box" key={n}><span className="step">{n}</span><h3>{t}</h3><p>{d}</p></article>))}
        </div>
      </div></section>

      <section id="keamanan" className="lp-sec alt"><div className="lp-wrap">
        <Head eyebrow="Keamanan & integritas" title="Dibangun agar angka tetap benar" sub="Pengaman ada di level database, bukan hanya di tampilan." />
        <div className="grid g4">
          {SECURITY.map(([ic, t, d]) => (
            <article className="box" key={t}><span className="ibox ok"><Icon name={ic} size={22} /></span><h3>{t}</h3><p>{d}</p></article>
          ))}
        </div>
      </div></section>

      <section className="lp-sec"><div className="lp-wrap">
        <div className="cta-box">
          <h2>Mulai rapikan pembukuan Anda hari ini.</h2>
          <p>Buat akun, buat bisnis, dan catat jurnal pertama Anda dalam hitungan menit.</p>
          <div className="lp-cta"><a className="btn primary lg" href="/register">Buat akun <Icon name="arrow" /></a><a className="btn ghost lg" href="/login">Sudah punya akun? Masuk</a></div>
        </div>
      </div></section>

      <footer className="lp-foot"><div className="lp-wrap">
        <div className="foot-row">
          <div><Logo size={32} /><p>Akuntansi & intelijen keuangan untuk UMKM Indonesia.</p></div>
          <div><b>Produk</b><a href="#fitur">Fitur</a><a href="#modul">Modul</a><a href="#keamanan">Keamanan</a></div>
          <div><b>Akun</b><a href="/login">Masuk</a><a href="/register">Daftar</a></div>
        </div>
        <div className="foot-copy"><span>© 2026 FINORA. Seluruh hak dilindungi.</span><span>Dibangun dengan Next.js, Supabase, dan Vercel.</span></div>
      </div></footer>
    </div>
  );
}
