import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eatcost",
  description: "记录吃喝支出、热量摄入和每日目标。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Eatcost",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
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
