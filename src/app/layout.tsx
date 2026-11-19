import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import NavLoader from "@/components/NavLoader";
import PwaRegister from "@/components/PwaRegister";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "FINORA";
const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: `${APP_NAME} — Pembukuan untuk UMKM`,
  description: "Pembukuan, laporan keuangan, dan analisis bisnis dalam Rupiah untuk UMKM Indonesia.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "FINORA", statusBarStyle: "black-translucent" },
};
// Terapkan tema tersimpan sebelum cat pertama (tanpa kedip). Bawaan: gelap.
const THEME_INIT = `try{var t=localStorage.getItem("finora:theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.dataset.theme=t;if(t==="light"){var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute("content","#f6f7f9")}}catch(e){document.documentElement.dataset.theme="dark"}`;

export const viewport: Viewport = { themeColor: "#FF8A3D", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={font.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT }} /></head>
      <body>{children}<NavLoader /><PwaRegister /></body>
    </html>
  );
}
