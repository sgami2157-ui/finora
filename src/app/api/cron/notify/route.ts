import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { digestFor } from "@/lib/digest";
import { pushConfigured, sendPush, type Sub } from "@/lib/push";
import { runBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(got), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Dipanggil Vercel Cron setiap hari 01:00 UTC (08:00 WIB): (1) pengingat push, (2) cadangan mingguan ke Drive bila diaktifkan.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY belum diset" }, { status: 503 });
  const admin = supabaseAdmin();
  const report: Record<string, unknown> = {};

  if (pushConfigured()) {
    const { data } = await admin.from("push_subscriptions").select("id,business_id,endpoint,p256dh,auth");
    const byBiz = new Map<string, (Sub & { business_id: string })[]>();
    for (const s of data ?? []) byBiz.set(s.business_id, [...(byBiz.get(s.business_id) ?? []), s]);
    let sent = 0, failed = 0, skipped = 0;
    for (const [biz, subs] of byBiz) {
      const msg = await digestFor(admin, biz);
      if (!msg) { skipped++; continue; }
      const r = await sendPush(subs, msg);
      sent += r.sent; failed += r.failed;
      if (r.gone.length) await admin.from("push_subscriptions").delete().in("id", r.gone);
      if (r.sent) await admin.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).in("id", subs.map((s) => s.id));
    }
    report.push = { businesses: byBiz.size, sent, failed, skipped_nothing_to_report: skipped };
  } else report.push = "VAPID belum dikonfigurasi";

  const { data: ints } = await admin.from("integrations").select("business_id").eq("provider", "google_drive").eq("status", "connected").eq("backup_auto", true);
  const backups: Record<string, string> = {};
  for (const i of ints ?? []) {
    const { data: last } = await admin.from("backup_logs").select("created_at").eq("business_id", i.business_id).eq("kind", "backup").eq("status", "verified").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < 6.5 * 86400_000) { backups[i.business_id] = "dilewati (belum 7 hari)"; continue; }
    try {
      const { data: b } = await admin.from("businesses").select("name").eq("id", i.business_id).single();
      const r = await runBackup(admin, admin, i.business_id, b?.name ?? "Bisnis", null);
      backups[i.business_id] = r.verified ? "terverifikasi" : "gagal verifikasi";
    } catch (e) { backups[i.business_id] = `gagal: ${(e as Error).message.slice(0, 120)}`; }
  }
  report.backup = backups;
  return NextResponse.json(report);
}
