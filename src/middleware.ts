import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/register", "/api/google/callback", "/.well-known", "/api/cron"]; // /api/cron dilindungi CRON_SECRET di route

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = path === "/" || PUBLIC.some((p) => path.startsWith(p));
  if (!data.user && !isPublic) return NextResponse.redirect(new URL("/login", req.url));
  // 2FA opsional: bila akun punya faktor TOTP terverifikasi, sesi aal1 tidak boleh membuka halaman aplikasi.
  if (data.user && !isPublic) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return NextResponse.redirect(new URL("/login", req.url));
  }
  if (data.user && (path === "/" || path === "/login" || path === "/register")) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (path === "/login" && aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return res; // tampilkan tantangan 2FA
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
