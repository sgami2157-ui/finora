import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "FINORA";
const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: `${APP_NAME} — Akuntansi & Intelijen Keuangan untuk UMKM`,
  description: "Pembukuan double-entry, laporan keuangan, dan analisis bisnis dalam Rupiah untuk UMKM Indonesia.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#FF8A3D" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}
