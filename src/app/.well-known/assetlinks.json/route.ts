import { NextResponse } from "next/server";

// Digital Asset Links untuk Trusted Web Activity (APK): menghilangkan bilah alamat setelah terverifikasi.
// Isi ANDROID_PACKAGE_NAME dan ANDROID_SHA256_FINGERPRINTS (pisahkan koma) di Vercel. Tanpa itu: 404.
export const dynamic = "force-dynamic";
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME;
  const fps = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const valid = fps.length > 0 && fps.every((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
  if (!pkg || !valid) return NextResponse.json({ error: "assetlinks belum dikonfigurasi" }, { status: 404 });
  return NextResponse.json(
    [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fps } }],
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
