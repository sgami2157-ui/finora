import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const { business } = (await req.json().catch(() => ({}))) as { business?: string };
  if (!business) return NextResponse.json({ error: "business wajib" }, { status: 400 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { data: m } = await sb.from("business_members").select("role")
    .eq("business_id", business).eq("user_id", user.id).in("role", ["owner", "admin"]).maybeSingle();
  if (!m) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  const admin = supabaseAdmin();
  const { data } = await admin.from("integrations").select("encrypted_refresh_token")
    .eq("business_id", business).eq("provider", "google_drive").maybeSingle();
  if (data?.encrypted_refresh_token) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decrypt(data.encrypted_refresh_token) }),
      });
    } catch { /* tetap putuskan sisi lokal */ }
  }
  await admin.from("integrations").update({ status: "disconnected", encrypted_refresh_token: null, external_account: null, root_folder_id: null, last_verified_at: null })
    .eq("business_id", business).eq("provider", "google_drive");
  await admin.from("integration_logs").insert({ business_id: business, provider: "google_drive", action: "disconnect", ok: true });
  return NextResponse.json({ ok: true });
}
