import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomTabs from "@/components/nav/BottomTabs";

export const metadata: Metadata = {
  title: "Plogged — pick up trash, earn points",
  description:
    "Gamified litter cleanup. Find trash hotspots, clean them up, and level up your Trash Pokédex.",
  applicationName: "Plogged",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Plogged",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <main className="flex-1 pb-20">{children}</main>
        <BottomTabs />
      </body>
    </html>
  );
}
