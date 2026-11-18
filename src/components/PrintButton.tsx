"use client";
/** Membuka dialog cetak peramban; dari sana pengguna dapat memilih "Simpan sebagai PDF". */
export default function PrintButton({ label = "Cetak / simpan PDF" }: { label?: string }) {
  return <button type="button" className="ghost" onClick={() => window.print()}>{label}</button>;
}
