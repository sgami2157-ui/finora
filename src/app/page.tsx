import { Icon, Logo, type IconName } from "@/components/Icon";
import ThemeToggle from "@/components/ThemeToggle";
import LandingDemo from "@/components/LandingDemo";

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "book", title: "Pencatatan yang rapi", desc: "Setiap transaksi tercatat seimbang dan tidak bisa diubah diam-diam. Salah catat? Cukup dibalik, riwayatnya tetap utuh." },
  { icon: "chart", title: "Laporan otomatis", desc: "Laba rugi, neraca, arus kas, dan buku besar tersusun sendiri dari catatan Anda. Siap dicetak atau disimpan sebagai PDF." },
  { icon: "bank", title: "Kas & Bank", desc: "Pantau saldo kas dan rekening, serta pindahkan dana antar-akun dengan mudah." },
  { icon: "coin", title: "Piutang & Utang", desc: "Catat faktur, pembayaran bertahap, dan tanggal jatuh tempo. Pengingat membantu Anda tidak terlewat." },
  { icon: "box", title: "Stok & Harga Pokok", desc: "Stok masuk dan keluar tercatat, modal barang dihitung otomatis, dan Anda diberi tahu saat stok menipis." },
  { icon: "trend", title: "Analisis Bisnis", desc: "Lihat margin, tren 6 bulan, umur piutang dan utang, serta biaya terbesar — langsung dari data usaha Anda." },
];

const MODULES: [string, IconName][] = [
  ["Dashboard", "dashboard"], ["Transaksi", "transfer"], ["Jurnal", "book"], ["Kas & Bank", "bank"],
  ["Penjualan", "cart"], ["Pembelian", "bag"], ["Produk & Stok", "box"], ["Piutang", "coin"],
  ["Utang", "banknote"], ["Biaya", "wallet"], ["Laporan", "chart"], ["Analisis", "trend"],
  ["Dokumen", "folder"], ["Pengaturan", "settings"],
];

const STEPS = [
  ["01", "Daftar dan buat usaha", "Buat akun lalu isi nama usaha Anda. Data tiap usaha terpisah dan aman."],
  ["02", "Catat penjualan, pembelian, dan biaya", "Cukup isi formulir sederhana. Pembukuan disusun otomatis di belakang layar."],
  ["03", "Baca laporan", "Lihat untung rugi dan kondisi keuangan usaha kapan saja, di HP maupun komputer."],
];

const SECURITY: [IconName, string, string][] = [
  ["lock", "Catatan permanen", "Transaksi yang sudah dicatat tidak bisa dihapus diam-diam."],
  ["calcheck", "Riwayat perubahan", "Setiap perubahan penting tercatat dan bisa ditelusuri."],
  ["shield", "Data terpisah", "Hanya Anda dan orang yang Anda undang yang bisa melihat data usaha."],
  ["clipcheck", "Cadangan ke Google Drive", "Simpan salinan data usaha Anda ke Drive sendiri kapan saja."],
];

const PRINCIPLES: [IconName, string, string][] = [
  ["scale", "Selalu seimbang", "Setiap catatan dicek otomatis."],
  ["lock", "Aman", "Data terlindungi per usaha."],
  ["banknote", "Rupiah & WIB", "Format Indonesia bawaan."],
  ["calendar", "Siap dicetak", "Laporan A4 rapi dan PDF."],
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
            <a href="#coba">Coba simulasi</a><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara kerja</a><a href="#keamanan">Keamanan</a>
          </nav>
          <div className="lp-actions">
            <ThemeToggle />
            <a className="btn ghost" href="/login">Masuk</a>
            <a className="btn primary" href="/register">Daftar</a>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap center">
          <span className="pill"><Icon name="sparkles" size={14} />Untuk UMKM Indonesia</span>
          <h1>Pembukuan usaha yang rapi, tanpa ribet.</h1>
          <p className="lead">Catat penjualan, pembelian, dan biaya dengan mudah. FINORA menyusun laporan keuangan Anda secara otomatis dalam Rupiah — tanpa perlu belajar akuntansi.</p>
          <div className="lp-cta">
            <a className="btn primary lg" href="/register">Mulai sekarang <Icon name="arrow" /></a>
            <a className="btn ghost lg" href="#coba">Coba simulasi</a>
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
          <p className="note">Tampilan contoh. Angka hanya ilustrasi, bukan data nyata.</p>
        </div>
      </section>

      <section className="lp-wrap"><div className="grid g4">
        {PRINCIPLES.map(([ic, t, d]) => (
          <div className="principle" key={t}><Icon name={ic} size={22} className="pri" /><div><b>{t}</b><small>{d}</small></div></div>
        ))}
      </div></section>

      <section id="coba" className="lp-sec alt"><div className="lp-wrap">
        <Head eyebrow="Coba sekarang" title="Rasakan caranya dalam 1 menit" sub="Catat beberapa transaksi dan lihat laporan untung rugi serta neraca tersusun sendiri. Tanpa daftar." />
        <LandingDemo />
      </div></section>

      <section id="fitur" className="lp-sec"><div className="lp-wrap">
        <Head eyebrow="Fitur" title="Semua yang usaha Anda butuhkan" sub="Dari pencatatan harian sampai laporan — satu tempat untuk angka bisnis Anda." />
        <div className="grid g3">
          {FEATURES.map((f) => (
            <article className="box" key={f.title}>
              <div className="box-top"><span className="ibox"><Icon name={f.icon} size={22} /></span></div>
              <h3>{f.title}</h3><p>{f.desc}</p>
            </article>
          ))}
        </div>
      </div></section>

      <section id="modul" className="lp-sec alt"><div className="lp-wrap">
        <Head eyebrow="Modul" title="Satu aplikasi, semua kebutuhan" sub="Menu yang sama tersedia di HP dan komputer." />
        <div className="grid g4">
          {MODULES.map(([l, ic]) => (
            <div className="mod on" key={l}><Icon name={ic} size={20} />{l}</div>
          ))}
        </div>
      </div></section>

      <section id="cara-kerja" className="lp-sec"><div className="lp-wrap">
        <Head eyebrow="Cara kerja" title="Tiga langkah menuju laporan yang bisa Anda percaya" />
        <div className="grid g3">
          {STEPS.map(([n, t, d]) => (<article className="box" key={n}><span className="step">{n}</span><h3>{t}</h3><p>{d}</p></article>))}
        </div>
      </div></section>

      <section id="keamanan" className="lp-sec alt"><div className="lp-wrap">
        <Head eyebrow="Keamanan" title="Dirancang agar angka tetap benar dan aman" />
        <div className="grid g4">
          {SECURITY.map(([ic, t, d]) => (
            <article className="box" key={t}><span className="ibox ok"><Icon name={ic} size={22} /></span><h3>{t}</h3><p>{d}</p></article>
          ))}
        </div>
      </div></section>

      <section className="lp-sec"><div className="lp-wrap">
        <div className="cta-box">
          <h2>Mulai rapikan pembukuan Anda hari ini.</h2>
          <p>Buat akun, isi nama usaha, dan catat transaksi pertama Anda dalam hitungan menit.</p>
          <div className="lp-cta"><a className="btn primary lg" href="/register">Buat akun <Icon name="arrow" /></a><a className="btn ghost lg" href="/login">Sudah punya akun? Masuk</a></div>
        </div>
      </div></section>

      <footer className="lp-foot"><div className="lp-wrap">
        <div className="foot-row">
          <div><Logo size={32} /><p>Pembukuan dan laporan keuangan untuk UMKM Indonesia.</p></div>
          <div><b>Produk</b><a href="#coba">Coba simulasi</a><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara kerja</a><a href="#keamanan">Keamanan</a></div>
          <div><b>Akun</b><a href="/login">Masuk</a><a href="/register">Daftar</a></div>
        </div>
        <div className="foot-copy"><span>© 2026 FINORA. Seluruh hak dilindungi.</span><span>Dibuat untuk UMKM Indonesia.</span></div>
      </div></footer>
    </div>
  );
}
