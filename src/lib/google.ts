import { decrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/drive.file"; // hanya file yang dibuat aplikasi ini

export function googleEnv() {
  const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret, GOOGLE_REDIRECT_URI: redirect } = process.env;
  if (!id || !secret || !redirect) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI belum diset");
  return { id, secret, redirect };
}

export async function exchangeCode(code: string) {
  const g = googleEnv();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: g.id, client_secret: g.secret, redirect_uri: g.redirect, grant_type: "authorization_code" }),
  });
  if (!res.ok) throw new Error(`Penukaran kode Google gagal (${res.status})`);
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}

export async function accessTokenFor(businessId: string): Promise<string> {
  const g = googleEnv();
  const { data } = await supabaseAdmin().from("integrations")
    .select("encrypted_refresh_token").eq("business_id", businessId).eq("provider", "google_drive").maybeSingle();
  if (!data?.encrypted_refresh_token) throw new Error("Google Drive belum terhubung");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: g.id, client_secret: g.secret, grant_type: "refresh_token",
      refresh_token: decrypt(data.encrypted_refresh_token),
    }),
  });
  if (!res.ok) throw new Error(`Refresh token Google ditolak (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function driveJson(token: string, url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`Google Drive API ${res.status}`);
  return res.json();
}

export async function verifyAccount(token: string): Promise<string> {
  const j = await driveJson(token, "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)");
  return j.user.emailAddress as string;
}

export async function ensureFolder(token: string, name: string, parent?: string): Promise<string> {
  const q = `name='${name.replaceAll("'", "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false` + (parent ? ` and '${parent}' in parents` : "");
  const found = await driveJson(token, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
  if (found.files?.[0]?.id) return found.files[0].id;
  const created = await driveJson(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parent ? { parents: [parent] } : {}) }),
  });
  return created.id as string;
}

/** FINORA/<Bisnis>/<Tahun>/<Sub>  */
export async function ensureFolderPath(token: string, business: string, year: string, sub: string) {
  const root = await ensureFolder(token, "FINORA");
  const b = await ensureFolder(token, business, root);
  const y = await ensureFolder(token, year, b);
  return ensureFolder(token, sub, y);
}
