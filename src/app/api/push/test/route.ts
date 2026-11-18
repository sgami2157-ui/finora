import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { pushConfigured, sendPush } from "@/lib/push";

// Kirim notifikasi uji ke perangkat milik pengguna sendiri (dibaca lewat RLS).
export async function POST() {
  if (!pushConfigured()) return NextResponse.json({ error: "Notifikasi push belum dikonfigurasi oleh pemilik aplikasi" }, { status: 503 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const { data } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", user.id);
  const subs = data ?? [];
  if (subs.length === 0) return NextResponse.json({ error: "Belum ada perangkat yang berlangganan" }, { status: 400 });
  const r = await sendPush(subs, { title: "FINORA", body: "Notifikasi berhasil. Anda akan diingatkan saat ada tagihan jatuh tempo atau stok menipis.", url: "/dashboard", tag: "test" });
  if (r.gone.length) await sb.from("push_subscriptions").delete().in("id", r.gone);
  return NextResponse.json({ sent: r.sent, failed: r.failed });
}
