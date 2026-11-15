import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { googleEnv, GOOGLE_SCOPE } from "@/lib/google";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("business");
  if (!businessId) return NextResponse.json({ error: "business wajib" }, { status: 400 });

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { data: m } = await sb.from("business_members").select("role")
    .eq("business_id", businessId).eq("user_id", user.id).in("role", ["owner", "admin"]).maybeSingle();
  if (!m) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  const g = googleEnv();
  const nonce = randomBytes(16).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: g.id, redirect_uri: g.redirect, response_type: "code", scope: GOOGLE_SCOPE,
    access_type: "offline", prompt: "consent", state: nonce, include_granted_scopes: "true",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set("g_oauth", `${nonce}.${businessId}.${user.id}`, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/google" });
  return res;
}
