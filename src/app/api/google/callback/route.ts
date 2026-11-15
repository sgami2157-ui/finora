import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { exchangeCode, verifyAccount, ensureFolder } from "@/lib/google";

export async function GET(req: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/settings?${q}`, req.url));
  const cookie = req.cookies.get("g_oauth")?.value;
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  if (req.nextUrl.searchParams.get("error")) return back("google=ditolak");
  if (!cookie || !state || !code) return back("google=invalid");

  const [nonce, businessId, userId] = cookie.split(".");
  if (nonce !== state) return back("google=state");

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.id !== userId) return back("google=sesi");
  const { data: m } = await sb.from("business_members").select("role")
    .eq("business_id", businessId).eq("user_id", user.id).in("role", ["owner", "admin"]).maybeSingle();
  if (!m) return back("google=izin");

  const admin = supabaseAdmin();
  const log = (action: string, ok: boolean, detail?: string) =>
    admin.from("integration_logs").insert({ business_id: businessId, provider: "google_drive", action, ok, detail });
  try {
    const tok = await exchangeCode(code);
    if (!tok.refresh_token) throw new Error("Google tidak mengembalikan refresh token");
    // Verifikasi nyata: panggil Drive API sebelum menandai Connected.
    const email = await verifyAccount(tok.access_token);
    const root = await ensureFolder(tok.access_token, "FINORA");
    await admin.from("integrations").upsert({
      business_id: businessId, provider: "google_drive", status: "connected", external_account: email,
      encrypted_refresh_token: encrypt(tok.refresh_token), root_folder_id: root, last_verified_at: new Date().toISOString(),
    }, { onConflict: "business_id,provider" });
    await log("connect", true, email);
    const res = back("google=ok");
    res.cookies.delete("g_oauth");
    return res;
  } catch (e) {
    await log("connect", false, e instanceof Error ? e.message : "error");
    return back("google=gagal");
  }
}
