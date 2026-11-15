import "./globals.css";
import type { Metadata, Viewport } from "next";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "FINORA";

export const metadata: Metadata = {
  title: `${APP_NAME} — Business Accounting & Financial Intelligence`,
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#FF8A3D" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
