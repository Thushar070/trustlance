"use client";

import { SessionProvider } from "next-auth/react";
import React, { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("PWA Service Worker registered scope:", reg.scope);
          })
          .catch((err) => {
            console.error("PWA Service Worker registration failed:", err);
          });
      } else {
        // Automatically unregister any stale service workers in development to break HMR reload loops
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log("Stale development Service Worker unregistered.");
                window.location.reload();
              }
            });
          }
        });
      }
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
