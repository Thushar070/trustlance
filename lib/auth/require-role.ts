import { Role } from "@prisma/client";
import { getServerSession } from "./get-server-session";

/**
 * Server-side helper to verify if the currently logged-in user possesses the required role.
 * Reusable across Next.js API Routes and Server Actions.
 * 
 * Returns an object with authorization status, HTTP status, error message, and session.
 */
export async function requireRole(role: Role) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return {
      authorized: false,
      status: 401,
      error: "Unauthorized: Please log in first.",
      session: null,
    };
  }

  if (session.user.role !== role) {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden: Mismatched role. Required: ${role}, Current: ${session.user.role || "None"}.`,
      session,
    };
  }

  return {
    authorized: true,
    status: 200,
    error: null,
    session,
  };
}
