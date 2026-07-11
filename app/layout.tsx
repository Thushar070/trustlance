import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="border-t border-[var(--border)] bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-[var(--text-muted)] tracking-wide">
                © 2026 TrustLance. Secure escrow-powered freelance marketplace.
              </p>
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>Next.js · Prisma · Razorpay</span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
