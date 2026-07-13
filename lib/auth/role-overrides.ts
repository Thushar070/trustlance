import { Role } from "@prisma/client";

/**
 * DEV/TESTING CONVENIENCE ONLY
 * 
 * Maps specific Google OAuth emails to initial roles automatically.
 * In production, this mapping should be removed or replaced by a DB-backed administrative system.
 */
export const ROLE_OVERRIDES: Record<string, Role> = {
  "thusharyyy@gmail.com": Role.ADMIN,
  "thushar2410612@ssn.edu.in": Role.CLIENT,
  "thushar.tl.dev@gmail.com": Role.FREELANCER,
};

/**
 * Helper to check if an email has a predefined role override.
 * Only active in non-production environments (development and test).
 */
export function getRoleOverride(email: string | null | undefined): Role | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  if (!email) return null;
  return ROLE_OVERRIDES[email] || null;
}
