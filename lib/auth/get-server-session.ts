import { getServerSession as nextGetServerSession } from "next-auth";
import { authOptions } from "./auth-options";

/**
 * Helper to fetch the current NextAuth session on the server side (API routes / Server Components).
 */
export function getServerSession() {
  return nextGetServerSession(authOptions);
}
