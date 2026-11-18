import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { accessTokenFor, ensureFolderPath, uploadFile } from "@/lib/google";

export const maxDuration = 60;
const SUB: Record<string, string> = { invoice: "Faktur", receipt: "Struk", transfer_proof: "Bukti Transfer", supplier_doc: "Dokumen Pemasok", customer_doc: "Dokumen Pelanggan", report: "Laporan", backup: "Backup", other: "Lainnya" };

// Salin dokumen dari penyimpanan aplikasi ke Google Drive: FINORA/<Bisnis>/<Tahun>/<Kategori>/
export async function POST(req: NextRequest) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { data: a } = await sb.from("attachments").select("id,business_id,category,file_name,mime_type,storage_path,drive_file_id,created_at").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!a || !a.storage_path) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  if (a.drive_file_id) return NextResponse.json({ error: "Dokumen sudah ada di Drive" }, { status: 409 });
  const { data: m } = await sb.from("business_members").select("role").eq("business_id", a.business_id).eq("user_id", user.id).in("role", ["owner", "admin", "accountant"]).maybeSingle();
  if (!m) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const { data: biz } = await sb.from("businesses").select("name").eq("id", a.business_id).maybeSingle();
  try {
    const dl = await sb.storage.from("documents").download(a.storage_path);
    if (dl.error || !dl.data) throw new Error("Berkas tidak dapat dibaca dari penyimpanan");
    const bytes = Buffer.from(await dl.data.arrayBuffer());
    const token = await accessTokenFor(a.business_id);
    const folder = await ensureFolderPath(token, biz?.name ?? "Bisnis", String(new Date(a.created_at).getUTCFullYear()), SUB[a.category] ?? "Lainnya");
    const up = await uploadFile(token, folder, a.file_name, a.mime_type, bytes);
    if (up.size !== bytes.length) throw new Error("Ukuran file di Drive tidak cocok");
    const { error } = await sb.from("attachments").update({ drive_file_id: up.id }).eq("id", a.id);
    if (error) throw new Error("File terunggah tetapi gagal mencatat referensi");
    return NextResponse.json({ ok: true, link: up.webViewLink ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
