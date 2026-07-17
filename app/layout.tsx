import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper";

export const metadata: Metadata = {
  title: "TrustLance - Secure Freelance Escrow Marketplace",
  description: "A freelance marketplace with secure, application-level escrow state control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
