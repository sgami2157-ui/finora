"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly";

export type PartyTable = "customers" | "suppliers";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: string) { const t = v.trim(); return t === "" ? null : t; }
function validate(name: string, email: string): string | null {
  if (!name.trim()) return "Nama wajib diisi.";
  if (email.trim() && !EMAIL.test(email.trim())) return "Format email belum benar.";
  return null;
}

export function AddPartyForm({ businessId, table }: { businessId: string; table: PartyTable }) {
  const router = useRouter();
  const label = table === "customers" ? "pelanggan" : "pemasok";
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [ok, setOk] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setOk(false);
    const v = validate(f.name, f.email); if (v) return setError(v);
    setBusy(true);
    const sb = supabaseBrowser();
    const { data: dup } = await sb.from(table).select("id").eq("business_id", businessId).is("deleted_at", null).ilike("name", f.name.trim().replace(/[\\%_]/g, (c) => "\\" + c)).limit(1);
    if (dup && dup.length) { setBusy(false); return setError(`Nama ${label} itu sudah ada.`); }
    const { error: err } = await sb.from(table).insert({ business_id: businessId, name: f.name.trim(), phone: clean(f.phone), email: clean(f.email), address: clean(f.address) });
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setF({ name: "", phone: "", email: "", address: "" }); setOk(true); router.refresh();
  }
  return (
    <form onSubmit={submit} className="form">
      <label className="field"><span>Nama {label}</span><input value={f.name} onChange={set("name")} maxLength={80} required /></label>
      <div className="duo-fields">
        <label className="field"><span>Telepon</span><input value={f.phone} onChange={set("phone")} inputMode="tel" maxLength={30} /></label>
        <label className="field"><span>Email</span><input value={f.email} onChange={set("email")} type="email" maxLength={80} /></label>
      </div>
      <label className="field"><span>Alamat</span><input value={f.address} onChange={set("address")} maxLength={200} /></label>
      {error && <div className="alert err" role="alert">{error}</div>}
      {ok && <div className="alert ok" role="status">Tersimpan.</div>}
      <button className="primary lg" aria-busy={busy} disabled={busy || !f.name.trim()}>{busy ? "Menyimpan…" : `Tambah ${label}`}</button>
    </form>
  );
}

export function PartyRowActions({ id, table, name, phone, email, address }: { id: string; table: PartyTable; name: string; phone: string | null; email: string | null; address: string | null }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name, phone: phone ?? "", email: email ?? "", address: address ?? "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    const v = validate(f.name, f.email); if (v) return setError(v);
    setBusy(true); setError(null);
    const { error: err } = await supabaseBrowser().from(table).update({ name: f.name.trim(), phone: clean(f.phone), email: clean(f.email), address: clean(f.address), updated_at: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    setEdit(false); router.refresh();
  }
  async function archive() {
    if (!confirm(`Sembunyikan “${name}” dari daftar? Riwayat transaksinya tetap tersimpan.`)) return;
    setBusy(true);
    const { error: err } = await supabaseBrowser().from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    if (err) return setError(friendlyError(err.message));
    router.refresh();
  }
  if (!edit) {
    return (
      <div className="inline-edit">
        <button type="button" className="ghost sm" onClick={() => setEdit(true)}>Ubah</button>
        <button type="button" className="ghost sm" onClick={archive} disabled={busy}>Sembunyikan</button>
        {error && <small className="neg">{error}</small>}
      </div>
    );
  }
  return (
    <div className="party-edit">
      <label className="mini">Nama<input value={f.name} onChange={set("name")} maxLength={80} /></label>
      <label className="mini">Telepon<input value={f.phone} onChange={set("phone")} inputMode="tel" maxLength={30} /></label>
      <label className="mini">Email<input value={f.email} onChange={set("email")} type="email" maxLength={80} /></label>
      <label className="mini">Alamat<input value={f.address} onChange={set("address")} maxLength={200} /></label>
      <div className="inline-edit">
        <button type="button" className="primary sm" aria-busy={busy} disabled={busy} onClick={save}>Simpan</button>
        <button type="button" className="ghost sm" onClick={() => { setEdit(false); setError(null); }}>Batal</button>
      </div>
      {error && <small className="neg">{error}</small>}
    </div>
  );
}
