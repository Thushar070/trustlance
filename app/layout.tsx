import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";

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
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4338ca" />
        <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
        {/* Prevent flash of wrong theme on initial load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('trustlance-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-[var(--text-muted)] tracking-wide">
                © 2026 TrustLance. Secure escrow-powered freelance marketplace.
              </p>
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>Secure · Verified · Escrow-Backed</span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
