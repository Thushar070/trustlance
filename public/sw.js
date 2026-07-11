self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  // Bypass Next.js internal development files, HMR, APIs, and chrome extension schemes
  if (
    url.includes("/_next/") ||
    url.includes("/api/") ||
    url.includes("webpack-hmr") ||
    url.startsWith("chrome-extension://")
  ) {
    return;
  }
  event.respondWith(fetch(event.request));
});
