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
        <meta name="theme-color" content="#000000" />
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo-mark.png" alt="" width={18} height={18} className="w-[18px] h-[18px] rounded opacity-50" />
                <p className="text-xs text-[var(--text-muted)] font-medium tracking-wide">
                  © 2026 TrustLance. All rights reserved.
                </p>
              </div>
              <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                <span>Secure</span>
                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-40" />
                <span>Verified</span>
                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-40" />
                <span>Escrow-Backed</span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
