import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/data-context";
import PinGate from "@/components/PinGate";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "배추가족",
  description: "배추가족이 함께 쓰는 가계부 · 생활기록 앱",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192-v2.png",
    apple: "/apple-icon-v2.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "배추가족",
  },
};

export const viewport: Viewport = {
  themeColor: "#5b8c3e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <DataProvider>
          <PinGate>
            <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
              <main className="flex-1 pb-24">{children}</main>
              <BottomNav />
            </div>
          </PinGate>
        </DataProvider>
      </body>
    </html>
  );
}
