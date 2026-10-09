import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "奨也の道 | SHOYA'S ROAD",
  description: "走れ。守れ。打て。夢をつかめ。奨也専用の野球育成アプリ",
  applicationName: "奨也の道",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "奨也の道" },
  icons: { icon: `${base}/icon-192.png`, apple: `${base}/apple-touch-icon.png` },
  manifest: `${base}/manifest.webmanifest`,
};

export const viewport: Viewport = {
  themeColor: "#0C1C35",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
