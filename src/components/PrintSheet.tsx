import type { ReactNode } from "react";
import { fmtDate, todayJakarta } from "@/lib/format";

/**
 * Dokumen cetak resmi (tersembunyi di layar, satu-satunya yang tampil saat mencetak / simpan PDF):
 * kop usaha, judul dokumen, isi, dan catatan kaki. Ukuran A4.
 */
export default function PrintSheet({ business, title, subtitle, children }: { business: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <article className="print-doc" aria-hidden="true">
      <header className="pd-head">
        <div><div className="pd-biz">{business}</div><div className="pd-sub">Dokumen keuangan</div></div>
        <div className="pd-title"><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</div>
      </header>
      <div className="pd-body">{children}</div>
      <footer className="pd-foot">Dicetak {fmtDate(todayJakarta())} dari FINORA. Dokumen ini dihasilkan otomatis dari pembukuan yang sudah diposting.</footer>
    </article>
  );
}
