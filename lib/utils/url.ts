/**
 * Dynamic URL helper to determine the base URL of the application.
 * Prevents hardcoding localhost in production.
 */
export function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://trustlance-app.vercel.app";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
