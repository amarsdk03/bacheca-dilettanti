import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard Admin | Bacheca Dilettanti",
  applicationName: "Dashboard Admin - Bacheca Dilettanti",
  description: "Area amministrativa di Bacheca Dilettanti",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  robots: { index: false, follow: false, noarchive: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="it"><body>{children}</body></html>;
}
