import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type Body = { business?: string; subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; endpoint?: string };

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Body;
  const s = b.subscription;
  if (!b.business || !s?.endpoint || !s.keys?.p256dh || !s.keys?.auth || !/^https:\/\//.test(s.endpoint)) return NextResponse.json({ error: "Data langganan tidak valid" }, { status: 400 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { error } = await sb.from("push_subscriptions").upsert({
    user_id: user.id, business_id: b.business, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth,
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 200),
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "Gagal menyimpan langganan" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Body;
  if (!b.endpoint) return NextResponse.json({ error: "endpoint wajib" }, { status: 400 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  await sb.from("push_subscriptions").delete().eq("endpoint", b.endpoint).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
