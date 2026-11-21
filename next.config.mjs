/** @type {import('next').NextConfig} */
// CSP sengaja tanpa script-src/style-src: Next.js memakai skrip inline, dan nonce butuh middleware dinamis.
// Direktif di bawah aman dipasang dan menutup clickjacking, base-tag injection, form hijack, dan plugin.
const CSP = ["frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join("; ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-site" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        { key: "X-DNS-Prefetch-Control", value: "off" },
        { key: "Content-Security-Policy", value: CSP },
      ],
    },
    { source: "/api/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
  ],
};
export default nextConfig;
