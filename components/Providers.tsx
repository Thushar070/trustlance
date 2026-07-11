"use client";

import { SessionProvider } from "next-auth/react";
import React, { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("PWA Service Worker registered scope:", reg.scope);
          })
          .catch((err) => {
            console.error("PWA Service Worker registration failed:", err);
          });
      }
      // Development: intentionally do nothing. No unregister logic, no reload logic,
      // no auto-detection of stale workers. Development must never register a service
      // worker in the first place, so there is nothing to clean up at runtime.
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
