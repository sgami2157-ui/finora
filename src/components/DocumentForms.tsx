"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";

export const DOC_CATEGORIES: [string, string][] = [
  ["receipt", "Struk / bukti pembayaran"], ["invoice", "Faktur / nota"], ["transfer_proof", "Bukti transfer"],
  ["supplier_doc", "Dokumen pemasok"], ["customer_doc", "Dokumen pelanggan"], ["report", "Laporan"], ["other", "Lainnya"],
];
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const MAX = 10 * 1024 * 1024;

export function UploadForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("receipt");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null);

  function choose(f: File | null) {
    setError(null); setOk(null);
    if (f && !ALLOWED.includes(f.type)) { setFile(null); return setError("Jenis file belum didukung. Gunakan PDF, foto (JPG/PNG/WebP), CSV, atau Excel (.xlsx)."); }
    if (f && f.size > MAX) { setFile(null); return setError("Ukuran file maksimal 10 MB."); }
    if (f && f.size === 0) { setFile(null); return setError("File kosong."); }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(null);
    if (!file) return setError("Pilih file terlebih dahulu.");
    setBusy(true);
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) { setBusy(false); return setError("Sesi Anda berakhir. Silakan masuk kembali."); }
    const safe = file.name.replace(/[^\w.\- ]+/g, "_").slice(-100);
    const path = `${businessId}/${crypto.randomUUID()}-${safe}`;
    const up = await sb.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) { setBusy(false); return setError(friendlyError(up.error.message)); }
    const { error: err } = await sb.from("attachments").insert({
      business_id: businessId, category, file_name: file.name, mime_type: file.type, size_bytes: file.size, storage_path: path, uploaded_by: uid,
    });
    if (err) { await sb.storage.from("documents").remove([path]); setBusy(false); return setError(friendlyError(err.message)); }
    setBusy(false); setOk("Dokumen tersimpan."); setFile(null); if (input.current) input.current.value = ""; router.refresh();
  }

  return (
    <form onSubmit={submit} className="form">
      <label className="field"><span>Jenis dokumen</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{DOC_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </label>
      <label className="field"><span>File</span>
        <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
      </label>
      <small className="hint">PDF, foto, CSV, atau Excel · maksimal 10 MB. Tersimpan privat, hanya bisa dibuka anggota bisnis Anda.</small>
      {error && <div className="alert err" role="alert">{error}</div>}
      {ok && <div className="alert ok" role="status">{ok}</div>}
      <button className="primary lg" disabled={busy || !file}>{busy ? "Mengunggah…" : "Unggah dokumen"}</button>
    </form>
  );
}

export function DocRowActions({ id, path, name }: { id: string; path: string | null; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function open() {
    if (!path) return;
    setBusy(true); setError(null);
    const { data, error: err } = await supabaseBrowser().storage.from("documents").createSignedUrl(path, 60);
    setBusy(false);
    if (err || !data?.signedUrl) return setError(friendlyError(err?.message ?? "Tidak dapat membuka file."));
    window.open(data.signedUrl, "_blank", "noopener");
  }
  async function remove() {
    if (!confirm(`Hapus dokumen “${name}”?`)) return;
    setBusy(true); setError(null);
    const sb = supabaseBrowser();
    const { error: err } = await sb.from("attachments").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (err) { setBusy(false); return setError(friendlyError(err.message)); }
    if (path) await sb.storage.from("documents").remove([path]);
    setBusy(false); router.refresh();
  }
  return (
    <div className="inline-edit">
      <button type="button" className="ghost sm" onClick={open} disabled={busy || !path}>Buka</button>
      <button type="button" className="ghost sm" onClick={remove} disabled={busy}>Hapus</button>
      {error && <small className="neg">{error}</small>}
    </div>
  );
}
