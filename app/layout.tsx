import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const asset = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  title: "Eatcost",
  description: "记录吃喝支出、热量摄入和每日目标。",
  applicationName: "Eatcost",
  manifest: asset("/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    title: "Eatcost",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: asset("/icon.svg"), type: "image/svg+xml" },
      { url: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: asset("/icon-512.png"), sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: asset("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#007aff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
