import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { runBackup } from "@/lib/backup";

export const maxDuration = 60;

async function guard(business?: string) {
  if (!business) return { err: NextResponse.json({ error: "business wajib" }, { status: 400 }) };
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { err: NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 }) };
  const { data: m } = await sb.from("business_members").select("role").eq("business_id", business).eq("user_id", user.id).in("role", ["owner", "admin"]).maybeSingle();
  if (!m) return { err: NextResponse.json({ error: "Hanya owner/admin" }, { status: 403 }) };
  return { sb, user };
}

// Cadangkan sekarang. Data dibaca lewat sesi pengguna (RLS), token Drive dibaca server.
export async function POST(req: NextRequest) {
  const { business } = (await req.json().catch(() => ({}))) as { business?: string };
  const g = await guard(business);
  if (g.err) return g.err;
  const { data: biz } = await g.sb!.from("businesses").select("name").eq("id", business!).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Bisnis tidak ditemukan" }, { status: 404 });
  try {
    const r = await runBackup(g.sb!, supabaseAdmin(), business!, biz.name, g.user!.id);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: `Cadangan gagal: ${(e as Error).message}` }, { status: 502 });
  }
}

// Atur cadangan otomatis mingguan.
export async function PATCH(req: NextRequest) {
  const { business, auto } = (await req.json().catch(() => ({}))) as { business?: string; auto?: boolean };
  const g = await guard(business);
  if (g.err) return g.err;
  if (typeof auto !== "boolean") return NextResponse.json({ error: "auto wajib boolean" }, { status: 400 });
  await supabaseAdmin().from("integrations").update({ backup_auto: auto }).eq("business_id", business!).eq("provider", "google_drive");
  return NextResponse.json({ ok: true });
}
