import webpush from "web-push";

export type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

/** Kirim ke banyak langganan. `gone` = id langganan yang sudah tidak berlaku (404/410) dan boleh dihapus. */
export async function sendPush(subs: Sub[], payload: PushPayload): Promise<{ sent: number; failed: number; gone: string[] }> {
  if (!pushConfigured()) throw new Error("VAPID belum dikonfigurasi");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  let sent = 0, failed = 0; const gone: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86400 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(s.id); else failed++;
    }
  }));
  return { sent, failed, gone };
}
